"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { Marker, Source, Layer, Popup } from "react-map-gl/maplibre";
import { SYSTEM_META } from "@/lib/data/transitStations";
import type { TransitGraphNode, TransitGraphEdge } from "@/lib/data/transitGraph";
import { AIR_COLOR, AIR_LABEL_TH, airFreshness } from "@/lib/air/air4thai";
import { CamLive, type CamHandle } from "./CamLive";
import { WATER_CAMS, egatImageUrl, type WaterCam } from "@/lib/cameras/egat";

// AI camera-read result (POST /api/cam-read). The model reports only the visible frame; the flood
// verdict is gated server-side on real rain + daytime, never on the model's (untrusted) confidence.
type CamReadResp = {
  read: { sky: string; road: string; flooding: string; traffic: string; timeOfDay: string; confidence: number };
  flood: { level: "none" | "possible" | "likely"; th: string; en: string; nightCapped: boolean; rainCorroborated: boolean | null };
};
const SKY_L: Record<string, [string, string]> = { clear: ["ฟ้าใส", "clear sky"], cloudy: ["มีเมฆ", "cloudy"], overcast: ["ฟ้าปิด", "overcast"], raining: ["ฝนตก", "raining"] };
const ROAD_L: Record<string, [string, string]> = { dry: ["ถนนแห้ง", "dry road"], wet: ["ถนนเปียก", "wet road"], standing_water: ["มีน้ำขัง", "standing water"], flooded: ["ถนนท่วม", "flooded road"] };
const TRAFFIC_L: Record<string, [string, string]> = { light: ["รถน้อย", "light traffic"], moderate: ["รถปานกลาง", "moderate traffic"], heavy: ["รถเยอะ", "heavy traffic"], jam: ["รถติด", "jam"] };
const TOD_L: Record<string, [string, string]> = { day: ["กลางวัน", "day"], dusk_dawn: ["เช้า/เย็น", "dusk"], night: ["กลางคืน", "night"] };

/**
 * MapDataLayers — paints Arnfa's data pipeline onto the /plan map as toggleable layers:
 *   🚉 rail stations · 🌳 parks · ❄️ cooling centres · 🛣️ rest stops  (point markers)
 *   🌧️ rain radar  (RainViewer raster overlay)
 * Each layer fetches lazily the first time it's switched on, and re-fetches when the area
 * (center) changes. Off by default → the base map stays calm; the user opts into density.
 * Rendered as a child of react-map-gl's <Map>, so Marker/Source/Layer get the map via context.
 */

export type MapLayerKey = "rain" | "traffic" | "events" | "cameras" | "watercam" | "air" | "transit" | "parks" | "cooling" | "rest";

/** Traffic tiles are served by the same-origin /api/traffic-tile proxy, which holds the Longdo
 *  key server-side (never shipped to the browser). The client only needs to know it's enabled —
 *  a public boolean flag — so the tile toggle stays dormant on forks without the key. (Incidents
 *  + cameras are keyless public feeds, so they don't depend on this.) */
export const LONGDO_ON = process.env.NEXT_PUBLIC_LONGDO === "1";

const ALL_LAYERS: { key: MapLayerKey; th: string; en: string; emoji: string; color: string; group: string }[] = [
  // จราจร — the live "intelligence" layers
  { key: "traffic", th: "รถติด", en: "Congestion", emoji: "🚦", color: "#D9534A", group: "traffic" },
  { key: "events", th: "เหตุด่วน", en: "Incidents", emoji: "⚠️", color: "#E0683C", group: "traffic" },
  { key: "cameras", th: "กล้องจราจร", en: "CCTV", emoji: "📹", color: "#3F6CA8", group: "traffic" },
  // ฟ้าและฝุ่น
  { key: "rain", th: "เรดาร์ฝน", en: "Rain radar", emoji: "🌧️", color: "#5B7FB8", group: "sky" },
  { key: "air", th: "ฝุ่น PM2.5", en: "PM2.5", emoji: "💨", color: "#E08A3C", group: "sky" },
  { key: "watercam", th: "กล้องเขื่อน", en: "Dam cams", emoji: "💧", color: "#2E7D9A", group: "sky" },
  // เดินทาง
  { key: "transit", th: "โครงข่ายขนส่ง", en: "Transit Net", emoji: "🚇", color: "#3aa537", group: "move" },
  { key: "rest", th: "จุดพักรถ", en: "Rest stops", emoji: "🛣️", color: "#7C6F5A", group: "move" },
  // ที่พึ่งพิง
  { key: "parks", th: "สวน", en: "Parks", emoji: "🌳", color: "#5E8C61", group: "refuge" },
  { key: "cooling", th: "ที่หลบร้อน", en: "Cooling", emoji: "❄️", color: "#3B82C4", group: "refuge" },
];

/** Layer-control sections — so a long list reads as organised groups, not a wall of toggles. */
export const LAYER_GROUPS: { id: string; th: string; en: string }[] = [
  { id: "traffic", th: "จราจร", en: "Traffic" },
  { id: "sky", th: "ฟ้าและฝุ่น", en: "Sky & air" },
  { id: "move", th: "เดินทาง", en: "Getting around" },
  { id: "refuge", th: "ที่พึ่งพิง", en: "Refuge" },
];

/** Traffic TILES (Longdo) only appear when the proxy is configured — dormant-until-key. */
export const MAP_LAYERS = ALL_LAYERS.filter((l) => l.key !== "traffic" || LONGDO_ON);

type Pt = { lat: number; lng: number; label: string; subTh: string; subEn: string; color: string; emoji: string };
type EventPt = { eid: string; lat: number; lng: number; title: string; titleEn: string; desc: string; descEn: string; icon: string };
type CamPt = { id: string; lat: number; lng: number; title: string; hls: string; updated: string };

// incident icon → emoji (Longdo `icon` field: accident / flood / roadclosed / diversion / construction …)
function eventEmoji(icon: string): string {
  if (/flood/i.test(icon)) return "🌊";
  if (/accident|crash/i.test(icon)) return "💥";
  if (/close/i.test(icon)) return "⛔";
  if (/divers|detour/i.test(icon)) return "↩️";
  if (/construct|work/i.test(icon)) return "🚧";
  return "⚠️";
}

function dist2(aLat: number, aLng: number, bLat: number, bLng: number) {
  const dx = (bLng - aLng) * Math.cos((aLat * Math.PI) / 180), dy = bLat - aLat;
  return dx * dx + dy * dy;
}

/** Fetch a point layer when shown; cache until the area (url) changes; keep cache when hidden. */
function usePointLayer(show: boolean, url: string, mapFn: (d: unknown) => Pt[]): Pt[] {
  const [pts, setPts] = useState<Pt[]>([]);
  const [forUrl, setForUrl] = useState<string>("");
  useEffect(() => {
    if (!show || forUrl === url) return;
    let cancelled = false;
    fetch(url)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => { if (!cancelled) { setPts(mapFn(d)); setForUrl(url); } })
      // On failure DON'T mark this url done — so toggling the layer again retries instead of
      // staying permanently empty (mirrors the radar/traffic pattern).
      .catch(() => { if (!cancelled) setPts([]); });
    return () => { cancelled = true; };
    // mapFn is a stable module-level fn; url carries the area coords
  }, [show, url, forUrl, mapFn]);
  return show && forUrl === url ? pts : [];
}


const restFn = (d: any): Pt[] => (d.areas ?? []).map((a: any) => ({ lat: a.lat, lng: a.lng, label: a.name, subTh: `ทล. ${a.route}`, subEn: `Hwy ${a.route}`, color: "#7C6F5A", emoji: "🛣️" }));
const coolFn = (d: any): Pt[] => (d.centers ?? []).map((c: any) => ({ lat: c.lat, lng: c.lng, label: c.name, subTh: c.district ?? "", subEn: c.district ?? "", color: "#3B82C4", emoji: "❄️" }));
const airFn = (d: any): Pt[] => (d.stations ?? []).map((s: any) => {
  // Air4Thai is hourly — show the reading time when it's not fresh, so the dot never implies "live" on a stale value.
  const f = airFreshness(s.readingAt ?? null);
  const staleTh = f && !f.fresh ? ` — ล่าสุด ${f.hhmm}` : "";
  const staleEn = f && !f.fresh ? ` — last ${f.hhmm}` : "";
  return { lat: s.lat, lng: s.lng, label: s.stationNameTh, subTh: s.pm25 != null ? `PM2.5 ${s.pm25} ${AIR_LABEL_TH[s.level as keyof typeof AIR_LABEL_TH] ?? ""}${staleTh}` : "ไม่มีข้อมูล", subEn: s.pm25 != null ? `PM2.5 ${s.pm25} µg/m³${staleEn}` : "no data", color: AIR_COLOR[s.level as keyof typeof AIR_COLOR] ?? "#9AA0A6", emoji: "💨" };
});

export function MapDataLayers({ center, active, routePresent, en, underId }: { center: { lat: number; lng: number }; active: Set<MapLayerKey>; routePresent: boolean; en: boolean; underId?: string }) {
  const c = `lat=${center.lat}&lng=${center.lng}`;
  const rest = usePointLayer(active.has("rest"), `/api/rest-areas?${c}&n=6`, restFn);
  const cooling = usePointLayer(active.has("cooling"), `/api/cooling?${c}&n=8`, coolFn);
  const air = usePointLayer(active.has("air"), `/api/air/nearby?${c}&n=10`, airFn);

  // Transit Graph (Full network: rail + bus)
  const [transitData, setTransitData] = useState<{ nodes: TransitGraphNode[]; edges: TransitGraphEdge[] } | null>(null);
  const showTransit = active.has("transit");
  useEffect(() => {
    if (!showTransit) {
      setTransitData(null);
      return;
    }
    let cancelled = false;
    // Note: transit-graph returns the entire city network, so we don't need to pass lat/lng/n
    fetch("/api/transit-graph")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        if (!cancelled && d.nodes && d.edges) setTransitData({ nodes: d.nodes, edges: d.edges });
      })
      .catch(() => { if (!cancelled) setTransitData(null); });
    return () => { cancelled = true; };
  }, [showTransit]);

  const transitEdgesGeoJSON = useMemo(() => {
    if (!transitData) return null;
    const nodeIndex = new Map(transitData.nodes.map((n) => [n.id, n]));
    const features = transitData.edges
      .map((e) => {
        const s = nodeIndex.get(e.source);
        const t = nodeIndex.get(e.target);
        if (!s || !t) return null;
        return {
          type: "Feature" as const,
          geometry: { type: "LineString" as const, coordinates: [[s.lng, s.lat], [t.lng, t.lat]] },
          properties: { system: e.system },
        };
      })
      .filter(Boolean);
    return { type: "FeatureCollection" as const, features };
  }, [transitData]);

  const transitNodesGeoJSON = useMemo(() => {
    if (!transitData) return null;
    return {
      type: "FeatureCollection" as const,
      features: transitData.nodes.map((n) => ({
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [n.lng, n.lat] },
        properties: {
          id: n.id,
          nameEn: n.nameEn,
          nameTh: n.nameTh,
          system: n.system,
          color: SYSTEM_META[n.system]?.color ?? (n.system === "BMTA" ? "#FACC15" : "#6B7280"),
          emoji: n.system === "BMTA" ? "🚌" : "🚉",
        },
      })),
    };
  }, [transitData]);

  // Parks: the endpoint returns all official parks → keep the 12 nearest to the area.
  const [parks, setParks] = useState<Pt[]>([]);
  const showParks = active.has("parks");
  useEffect(() => {
    setParks([]); // clear when toggled off OR when the area changes (no stale parks at the new centre)
    if (!showParks) return;
    let cancelled = false;
    fetch("/api/bma-parks")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: any) => {
        if (cancelled) return;
        const near = (d.parks ?? [])
          .filter((p: any) => typeof p.lat === "number" && typeof p.lng === "number")
          .sort((a: any, b: any) => dist2(center.lat, center.lng, a.lat, a.lng) - dist2(center.lat, center.lng, b.lat, b.lng))
          .slice(0, 12)
          .map((p: any) => ({ lat: p.lat, lng: p.lng, label: p.name ?? "สวน", subTh: p.area ? `${p.area} ไร่` : "", subEn: p.area ? `${p.area} rai` : "", color: "#5E8C61", emoji: "🌳" }));
        setParks(near);
      })
      .catch(() => { if (!cancelled) setParks([]); });
    return () => { cancelled = true; };
  }, [showParks, center.lat, center.lng]);

  // Rain radar raster overlay (RainViewer latest frame), under the route line. Re-fetches
  // each time the layer is switched on → picks up a fresh frame, and a single failed fetch
  // (→ null, not a "" sentinel) doesn't permanently disable the layer.
  const [radarTile, setRadarTile] = useState<string | null>(null);
  const showRain = active.has("rain");
  useEffect(() => {
    if (!showRain) return;
    let cancelled = false;
    fetch("/api/radar")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: any) => { if (!cancelled) setRadarTile(d.tileUrl || null); })
      .catch(() => { if (!cancelled) setRadarTile(null); });
    return () => { cancelled = true; };
  }, [showRain]);

  // Longdo real-time road-traffic overlay (mode=trafficoverlay): a transparent PNG with
  // green = flowing / red = jammed lines, painted UNDER the verdict pins (underId). Longdo
  // refreshes congestion ~every 3 min → bump a tick into the tile URL so it stays live.
  const [trafficTick, setTrafficTick] = useState(0);
  const showTraffic = active.has("traffic") && LONGDO_ON;
  useEffect(() => {
    if (!showTraffic) return;
    const id = setInterval(() => setTrafficTick((t) => t + 1), 180_000);
    return () => clearInterval(id);
  }, [showTraffic]);
  // same-origin proxy (server holds the key + adds CORS so MapLibre can texture the raster)
  const trafficUrl = `/api/traffic-tile?z={z}&x={x}&y={y}&_=${trafficTick}`;

  // Live traffic INCIDENTS (accidents / floods / closures) — nationwide feed, auto-refresh 2 min.
  const [events, setEvents] = useState<EventPt[]>([]);
  const showEvents = active.has("events");
  useEffect(() => {
    if (!showEvents) { setEvents([]); return; }
    let cancelled = false;
    const load = () => fetch("/api/traffic-events")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => { if (!cancelled) setEvents(Array.isArray(d.events) ? d.events : []); })
      .catch(() => { if (!cancelled) setEvents([]); });
    load();
    const id = setInterval(load, 120_000);
    return () => { cancelled = true; clearInterval(id); };
  }, [showEvents]);

  // CCTV cameras — ~134 nationwide have a live HLS stream; too many markers, keep the ~18 nearest.
  const [cameras, setCameras] = useState<CamPt[]>([]);
  const showCameras = active.has("cameras");
  useEffect(() => {
    if (!showCameras) { setCameras([]); return; }
    let cancelled = false;
    fetch("/api/cameras")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        if (cancelled) return;
        const near = (Array.isArray(d.cameras) ? d.cameras : [])
          .sort((a: CamPt, b: CamPt) => dist2(center.lat, center.lng, a.lat, a.lng) - dist2(center.lat, center.lng, b.lat, b.lng))
          .slice(0, 18);
        setCameras(near);
      })
      .catch(() => { if (!cancelled) setCameras([]); });
    return () => { cancelled = true; };
  }, [showCameras, center.lat, center.lng]);

  const [selected, setSelected] = useState<Pt | null>(null);
  const [selEvent, setSelEvent] = useState<EventPt | null>(null);
  const [selCam, setSelCam] = useState<CamPt | null>(null);

  // "ดูสด" — open a camera in a full live-view modal (consent first, then a real live HLS video).
  // Public iTIC/DOH traffic cameras, no personal data; the dead jpeg.cgi snapshot is gone.
  const [liveCam, setLiveCam] = useState<CamPt | null>(null);
  const [liveOk, setLiveOk] = useState(false); // consent given for this view
  const camRef = useRef<CamHandle>(null);
  const [selWaterCam, setSelWaterCam] = useState<WaterCam | null>(null); // EGAT dam-cam snapshot modal
  const [reading, setReading] = useState(false);
  const [camRead, setCamRead] = useState<CamReadResp | null>(null);
  const [camReadErr, setCamReadErr] = useState(false);
  // honest "flood watch" overlay: only street cameras the user actually read, that returned a gated
  // flood (likely = daytime + rain-corroborated; possible = uncorroborated). No batch reads, no fakes.
  const [floodPins, setFloodPins] = useState<Record<string, "likely" | "possible">>({});
  const showWater = active.has("watercam");
  const closeLive = () => { setLiveCam(null); setLiveOk(false); setCamRead(null); setCamReadErr(false); setReading(false); };
  const closeWater = () => { setSelWaterCam(null); setCamRead(null); setCamReadErr(false); setReading(false); };
  // reset the AI read whenever the open camera changes
  useEffect(() => { setCamRead(null); setCamReadErr(false); setReading(false); }, [liveCam, selWaterCam]);

  // shared: POST a frame (client base64 OR server-fetched imageUrl) → VLM read → honest gated result.
  // pinId set → update the street-flood overlay; null (dam cams) → no flood pin (a reservoir isn't a flood).
  async function doCamRead(payload: Record<string, unknown>, pinId: string | null) {
    if (reading) return;
    setReading(true); setCamReadErr(false); setCamRead(null);
    try {
      const r = await fetch("/api/cam-read", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const d = await r.json();
      if (r.ok && d.available && d.read) {
        setCamRead(d as CamReadResp);
        if (pinId) {
          const lvl = (d as CamReadResp).flood?.level;
          setFloodPins((p) => {
            if (lvl === "likely" || lvl === "possible") return { ...p, [pinId]: lvl };
            if (!(pinId in p)) return p;
            const n = { ...p }; delete n[pinId]; return n; // a clean re-read clears an old flood pin
          });
        }
      } else setCamReadErr(true);
    } catch { setCamReadErr(true); } finally { setReading(false); }
  }
  function readFrame() {
    if (!liveCam) return;
    const image = camRef.current?.grabFrame(640);
    if (!image) { setCamReadErr(true); setCamRead(null); return; }
    doCamRead({ image, camId: liveCam.id, lat: liveCam.lat, lng: liveCam.lng }, liveCam.id);
  }
  function readWaterCam(cam: WaterCam) {
    doCamRead({ imageUrl: egatImageUrl(cam.code), camId: cam.code, lat: cam.lat, lng: cam.lng }, null);
  }
  // shared AI-read result view (error + flood verdict + chips + the honest "AI estimate" label)
  function camReadView() {
    if (camReadErr) return <p className="mt-2 font-thai text-xs text-ink-faint">{en ? "Couldn't read this frame — try again" : "อ่านภาพนี้ไม่ได้ ลองอีกครั้ง"}</p>;
    if (!camRead) return null;
    const r = camRead.read, f = camRead.flood;
    const chips = [SKY_L[r.sky], ROAD_L[r.road], TRAFFIC_L[r.traffic], TOD_L[r.timeOfDay]].filter(Boolean) as [string, string][];
    return (
      <div className="mt-2.5">
        {f.level !== "none" && (
          <p className={`mb-2 rounded-xl border px-3 py-2 font-thai text-xs leading-snug ${f.level === "likely" ? "border-indoor-warm/30 bg-indoor-warm/[0.06] text-indoor-warm" : "border-sun/40 bg-sun/[0.07] text-ink-muted"}`}>
            ⚠ {en ? f.en : f.th}
          </p>
        )}
        {f.level === "none" && f.nightCapped && f.th && <p className="mb-2 font-thai text-xs text-ink-faint">{en ? f.en : f.th}</p>}
        {chips.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {chips.map((c, i) => <span key={i} className="rounded-full border border-hairline bg-paper px-2.5 py-1 font-thai text-xs text-ink">{en ? c[1] : c[0]}</span>)}
          </div>
        )}
        <p className="mt-2 font-thai text-[0.65rem] leading-relaxed text-ink-faint">
          {en
            ? `AI estimate from this live frame, not a measurement — confidence ${Math.round(r.confidence * 100)}%, image not stored`
            : `AI อ่านจากภาพกล้องจริง ไม่ใช่ค่าที่วัด — ความมั่นใจ ${Math.round(r.confidence * 100)}%, ไม่เก็บภาพ`}
        </p>
      </div>
    );
  }
  // Don't leave an orphan popup when its layer is toggled off or the area changes.
  useEffect(() => { setSelected(null); setSelEvent(null); setSelCam(null); setSelWaterCam(null); }, [active, center.lat, center.lng]);

  const dot = (p: Pt, _i: number, kind: string) => {
    const sub = en ? p.subEn : p.subTh;
    return (
      <Marker key={`${kind}-${p.lat},${p.lng}`} longitude={p.lng} latitude={p.lat} anchor="center"
        onClick={(e) => { e.originalEvent.stopPropagation(); setSelEvent(null); setSelCam(null); setSelected(p); }}>
        <span title={`${p.label}${sub ? " — " + sub : ""}`}
          className="flex h-[28px] w-[28px] cursor-pointer items-center justify-center rounded-full ring-2 ring-white shadow-sm transition-transform hover:scale-110"
          style={{ background: p.color }}>
          <span className="leading-none" style={{ fontSize: "13px" }}>{p.emoji}</span>
        </span>
      </Marker>
    );
  };

  return (
    <>
      {showRain && radarTile ? (
        // RainViewer radar only serves real tiles up to z7 — z8+ returns a literal "Zoom Level
        // Not Supported" PNG (verified). Cap maxzoom=7 so MapLibre over-zooms the z7 tiles for
        // any closer view instead of ever requesting (and painting) that placeholder.
        <Source id="arnfa-radar" type="raster" tiles={[radarTile]} tileSize={256} maxzoom={7} attribution="Radar: RainViewer">
          <Layer id="arnfa-radar-layer" type="raster" beforeId={underId ?? (routePresent ? "route-line" : undefined)} paint={{ "raster-opacity": 0.5 }} />
        </Source>
      ) : null}
      {showTraffic ? (
        // Longdo traffic serves tiles up to z15; cap maxzoom so MapLibre over-zooms those
        // instead of requesting z16+ (which 302) — no "zoom not supported", no wasted fetches.
        <Source id="arnfa-traffic" type="raster" tiles={[trafficUrl]} tileSize={256} maxzoom={15} attribution="จราจร Longdo Map">
          <Layer id="arnfa-traffic-layer" type="raster" beforeId={underId ?? (routePresent ? "route-line" : undefined)} paint={{ "raster-opacity": 0.82 }} />
        </Source>
      ) : null}
      {air.map((p, i) => dot(p, i, "air"))}
      {rail.map((p, i) => dot(p, i, "rail"))}
      {parks.map((p, i) => dot(p, i, "park"))}
      {cooling.map((p, i) => dot(p, i, "cool"))}
      {rest.map((p, i) => dot(p, i, "rest"))}

      {/* live incidents */}
      {showEvents && events.map((ev) => (
        <Marker key={`ev-${ev.eid}`} longitude={ev.lng} latitude={ev.lat} anchor="center"
          onClick={(e) => { e.originalEvent.stopPropagation(); setSelected(null); setSelCam(null); setSelEvent(ev); }}>
          <span title={en ? ev.titleEn : ev.title}
            className="flex h-[26px] w-[26px] cursor-pointer items-center justify-center rounded-full ring-2 ring-white shadow-sm transition-transform hover:scale-110"
            style={{ background: "#E0683C" }}>
            <span className="leading-none" style={{ fontSize: "13px" }}>{eventEmoji(ev.icon)}</span>
          </span>
        </Marker>
      ))}

      {/* CCTV cameras — a camera the user read that came back with a gated flood gets a 💧 ring */}
      {showCameras && cameras.map((cm) => {
        const flood = floodPins[cm.id];
        return (
          <Marker key={`cam-${cm.id}`} longitude={cm.lng} latitude={cm.lat} anchor="center"
            onClick={(e) => { e.originalEvent.stopPropagation(); setSelected(null); setSelEvent(null); setSelCam(cm); }}>
            <span
              title={flood === "likely" ? (en ? "AI read: looks like street flooding here — verify on the live camera" : "AI อ่าน: ภาพดูเหมือนน้ำท่วมถนน — เช็คจากกล้องสด") : flood === "possible" ? (en ? "AI read: maybe water on the road — verify" : "AI อ่าน: อาจมีน้ำบนถนน — เช็ค") : cm.title}
              className="flex h-[24px] w-[24px] cursor-pointer items-center justify-center rounded-full ring-2 ring-white shadow-sm transition-transform hover:scale-110"
              style={flood
                ? { background: flood === "likely" ? "#D9534A" : "#E08A3C", boxShadow: `0 0 0 3px ${flood === "likely" ? "rgba(217,83,74,0.35)" : "rgba(224,138,60,0.3)"}` }
                : { background: "#3F6CA8" }}>
              <span className="leading-none" style={{ fontSize: "12px" }}>{flood ? "💧" : "📹"}</span>
            </span>
          </Marker>
        );
      })}

      {/* EGAT dam water cameras (snapshot — server-fetched + VLM-readable) */}
      {showWater && WATER_CAMS.map((wc) => (
        <Marker key={`water-${wc.code}`} longitude={wc.lng} latitude={wc.lat} anchor="center"
          onClick={(e) => { e.originalEvent.stopPropagation(); setSelected(null); setSelEvent(null); setSelCam(null); setSelWaterCam(wc); }}>
          <span title={en ? wc.en : wc.th}
            className="flex h-[24px] w-[24px] cursor-pointer items-center justify-center rounded-full ring-2 ring-white shadow-sm transition-transform hover:scale-110"
            style={{ background: "#2E7D9A" }}>
            <span className="leading-none" style={{ fontSize: "12px" }}>💧</span>
          </span>
        </Marker>
      ))}

      {/* Transit Graph Sources & Layers */}
      {transitEdgesGeoJSON && (
        <Source id="transit-edges" type="geojson" data={transitEdgesGeoJSON}>
          <Layer
            id="transit-edges-layer"
            type="line"
            beforeId={underId}
            paint={{
              "line-color": [
                "match", ["get", "system"],
                "BTS", "#3aa537",
                "MRT", "#1964B7",
                "ARL", "#C8102E",
                "SRT", "#A6192E",
                "BRT", "#F97316",
                "BMTA", "#CA8A04",
                "#9CA3AF",
              ],
              "line-width": 1.2,
              "line-opacity": 0.5,
            }}
          />
        </Source>
      )}
      {transitNodesGeoJSON && (
        <Source id="transit-nodes" type="geojson" data={transitNodesGeoJSON}>
          <Layer
            id="transit-nodes-layer"
            type="circle"
            beforeId={underId}
            paint={{
              "circle-color": ["get", "color"],
              "circle-radius": [
                "interpolate", ["linear"], ["zoom"],
                10, 2.5,
                14, 5,
              ],
              "circle-stroke-width": 1,
              "circle-stroke-color": "#ffffff",
              "circle-opacity": 0.9,
            }}
          />
        </Source>
      )}

      {selEvent && (
        <Popup longitude={selEvent.lng} latitude={selEvent.lat} anchor="bottom" offset={14}
          closeButton closeOnClick={false} onClose={() => setSelEvent(null)} maxWidth="240px">
          <div className="font-thai">
            <p className="flex items-start gap-1.5 text-sm font-medium leading-snug text-ink">
              <span aria-hidden style={{ fontSize: "13px" }}>{eventEmoji(selEvent.icon)}</span>{en ? selEvent.titleEn : selEvent.title}
            </p>
            {(en ? selEvent.descEn : selEvent.desc) && <p className="mt-1 text-xs leading-relaxed text-ink-muted">{en ? selEvent.descEn : selEvent.desc}</p>}
          </div>
        </Popup>
      )}

      {selCam && (
        <Popup longitude={selCam.lng} latitude={selCam.lat} anchor="bottom" offset={14}
          closeButton closeOnClick={false} onClose={() => setSelCam(null)} maxWidth="260px">
          <div className="font-thai">
            <p className="mb-1 text-xs font-medium leading-snug text-ink">{selCam.title}</p>
            <p className="mb-2 flex items-center gap-1.5 text-[0.65rem] text-ink-faint">
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[#D9534A]" aria-hidden />
              {en ? "Live traffic camera, iTIC / Highways Dept" : "กล้องจราจรสด iTIC / กรมทางหลวง"}
            </p>
            <button type="button" onClick={() => { setLiveCam(selCam); setLiveOk(false); }}
              className="w-full rounded-full bg-ink px-3 py-1.5 text-center text-xs font-medium text-paper transition-colors hover:bg-ink-muted">
              {en ? "Watch live" : "ดูสด"}
            </button>
          </div>
        </Popup>
      )}

      {selected && (
        <Popup longitude={selected.lng} latitude={selected.lat} anchor="bottom" offset={14}
          closeButton closeOnClick={false} onClose={() => setSelected(null)} maxWidth="220px">
          <div className="font-thai">
            <p className="flex items-center gap-1.5 text-sm font-medium leading-snug text-ink">
              <span aria-hidden style={{ fontSize: "12px" }}>{selected.emoji}</span>{selected.label}
            </p>
            {(en ? selected.subEn : selected.subTh) && <p className="mt-0.5 text-xs text-ink-muted">{en ? selected.subEn : selected.subTh}</p>}
          </div>
        </Popup>
      )}

      {/* CCTV live-view modal — consent, then the public snapshot auto-refreshes (portal so it
          sits above the map, not inside its transformed container) */}
      {liveCam && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-ink/70 p-4 backdrop-blur-sm" onClick={closeLive} role="dialog" aria-modal>
          <div className="w-full max-w-lg rounded-3xl border border-hairline bg-paper p-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-2 flex items-start justify-between gap-3">
              <p className="font-thai text-sm font-medium leading-snug text-ink">{liveCam.title}</p>
              <button type="button" onClick={closeLive} aria-label={en ? "Close" : "ปิด"}
                className="-mr-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-faint transition-colors hover:bg-surface">✕</button>
            </div>
            {!liveOk ? (
              <div className="py-1">
                <p className="font-thai text-xs leading-relaxed text-ink-muted">{en ? "Watch this public traffic camera as a live video stream? (uses some data)" : "ดูกล้องจราจรสาธารณะตัวนี้เป็นวิดีโอสด? (ใช้เน็ตพอสมควร)"}</p>
                <div className="mt-3 flex gap-2">
                  <button type="button" onClick={() => setLiveOk(true)} className="flex-1 rounded-full bg-ink px-4 py-2 font-thai text-sm font-medium text-paper transition-colors hover:bg-ink-muted">{en ? "View live" : "ดูเลย"}</button>
                  <button type="button" onClick={closeLive} className="rounded-full border border-hairline px-4 py-2 font-thai text-sm text-ink-muted transition-colors hover:bg-surface">{en ? "Cancel" : "ยกเลิก"}</button>
                </div>
              </div>
            ) : (
              <>
                <CamLive ref={camRef} src={liveCam.hls} title={liveCam.title} />
                <p className="mt-2 flex items-center gap-1.5 font-thai text-[0.7rem] text-ink-faint">
                  <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[#D9534A]" aria-hidden />
                  {en ? "Live video, iTIC / Highways Dept" : "วิดีโอสด iTIC / กรมทางหลวง"}
                </p>

                {/* AI reads the actual on-screen frame — the 3rd ground-truth layer + street-flood flag */}
                <div className="mt-3 border-t border-hairline pt-3">
                  <button type="button" onClick={readFrame} disabled={reading}
                    className="w-full rounded-full bg-rain/10 px-3 py-2 text-center font-thai text-sm font-medium text-rain transition-colors hover:bg-rain/20 disabled:opacity-50">
                    {reading ? (en ? "AI is reading the frame…" : "AI กำลังอ่านภาพ…") : (en ? "🔎 Let AI read this frame" : "🔎 ให้ AI อ่านสภาพจากภาพนี้")}
                  </button>
                  {camReadView()}
                </div>
              </>
            )}
          </div>
        </div>,
        document.body,
      )}

      {/* EGAT dam-cam modal — a live snapshot (server-fetched) the AI can read for water + sky */}
      {selWaterCam && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-ink/70 p-4 backdrop-blur-sm" onClick={closeWater} role="dialog" aria-modal>
          <div className="w-full max-w-lg rounded-3xl border border-hairline bg-paper p-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-2 flex items-start justify-between gap-3">
              <p className="font-thai text-sm font-medium leading-snug text-ink">{en ? selWaterCam.en : selWaterCam.th}</p>
              <button type="button" onClick={closeWater} aria-label={en ? "Close" : "ปิด"}
                className="-mr-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-faint transition-colors hover:bg-surface">✕</button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`${egatImageUrl(selWaterCam.code)}?t=${Math.floor(Date.now() / 60000)}`} alt={en ? selWaterCam.en : selWaterCam.th}
              className="aspect-video w-full rounded-xl border border-hairline bg-ink object-contain" />
            <p className="mt-2 flex items-center gap-1.5 font-thai text-[0.7rem] text-ink-faint">
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[#2E7D9A]" aria-hidden />
              {en ? "Live snapshot — EGAT dam" : "ภาพสด เขื่อน กฟผ. (EGAT)"}
            </p>
            <div className="mt-3 border-t border-hairline pt-3">
              <button type="button" onClick={() => readWaterCam(selWaterCam)} disabled={reading}
                className="w-full rounded-full bg-rain/10 px-3 py-2 text-center font-thai text-sm font-medium text-rain transition-colors hover:bg-rain/20 disabled:opacity-50">
                {reading ? (en ? "AI is reading…" : "AI กำลังอ่านภาพ…") : (en ? "🔎 Let AI read the water & sky" : "🔎 ให้ AI อ่านสภาพน้ำและฟ้า")}
              </button>
              {camReadView()}
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
