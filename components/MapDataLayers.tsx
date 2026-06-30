"use client";

import { useEffect, useState } from "react";
import { Marker, Source, Layer, Popup } from "react-map-gl/maplibre";
import { SYSTEM_META } from "@/lib/data/transitStations";
import { AIR_COLOR, AIR_LABEL_TH } from "@/lib/air/air4thai";

/**
 * MapDataLayers — paints Arnfa's data pipeline onto the /plan map as toggleable layers:
 *   🚉 rail stations · 🌳 parks · ❄️ cooling centres · 🛣️ rest stops  (point markers)
 *   🌧️ rain radar  (RainViewer raster overlay)
 * Each layer fetches lazily the first time it's switched on, and re-fetches when the area
 * (center) changes. Off by default → the base map stays calm; the user opts into density.
 * Rendered as a child of react-map-gl's <Map>, so Marker/Source/Layer get the map via context.
 */

export type MapLayerKey = "rain" | "traffic" | "events" | "cameras" | "air" | "rail" | "parks" | "cooling" | "rest";

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
  // เดินทาง
  { key: "rail", th: "รถไฟฟ้า", en: "Trains", emoji: "🚉", color: "#1964B7", group: "move" },
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
type CamPt = { id: string; lat: number; lng: number; title: string; img: string; updated: string };

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

const stripSys = (n: string) => (n || "").replace(/^(BTS|MRT|ARL|SRT|Airport Rail)\s+/i, "");
const railFn = (d: any): Pt[] => (d.stations ?? []).map((s: any) => ({ lat: s.lat, lng: s.lng, label: stripSys(s.th || s.en || ""), subTh: s.system, subEn: s.system, color: SYSTEM_META[s.system]?.color ?? "#1964B7", emoji: "🚉" }));
const restFn = (d: any): Pt[] => (d.areas ?? []).map((a: any) => ({ lat: a.lat, lng: a.lng, label: a.name, subTh: `ทล. ${a.route}`, subEn: `Hwy ${a.route}`, color: "#7C6F5A", emoji: "🛣️" }));
const coolFn = (d: any): Pt[] => (d.centers ?? []).map((c: any) => ({ lat: c.lat, lng: c.lng, label: c.name, subTh: c.district ?? "", subEn: c.district ?? "", color: "#3B82C4", emoji: "❄️" }));
const airFn = (d: any): Pt[] => (d.stations ?? []).map((s: any) => ({ lat: s.lat, lng: s.lng, label: s.stationNameTh, subTh: s.pm25 != null ? `PM2.5 ${s.pm25} ${AIR_LABEL_TH[s.level as keyof typeof AIR_LABEL_TH] ?? ""}` : "ไม่มีข้อมูล", subEn: s.pm25 != null ? `PM2.5 ${s.pm25} µg/m³` : "no data", color: AIR_COLOR[s.level as keyof typeof AIR_COLOR] ?? "#9AA0A6", emoji: "💨" }));

export function MapDataLayers({ center, active, routePresent, en, underId }: { center: { lat: number; lng: number }; active: Set<MapLayerKey>; routePresent: boolean; en: boolean; underId?: string }) {
  const c = `lat=${center.lat}&lng=${center.lng}`;
  const rail = usePointLayer(active.has("rail"), `/api/transit?${c}&n=8`, railFn);
  const rest = usePointLayer(active.has("rest"), `/api/rest-areas?${c}&n=6`, restFn);
  const cooling = usePointLayer(active.has("cooling"), `/api/cooling?${c}&n=8`, coolFn);
  const air = usePointLayer(active.has("air"), `/api/air/nearby?${c}&n=10`, airFn);

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

  // CCTV cameras — 163 nationwide is too many markers, keep the ~18 nearest the area.
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
  const [camImgError, setCamImgError] = useState(false);
  useEffect(() => { setCamImgError(false); }, [selCam]); // reset the snapshot-failed flag per camera
  // Don't leave an orphan popup when its layer is toggled off or the area changes.
  useEffect(() => { setSelected(null); setSelEvent(null); setSelCam(null); }, [active, center.lat, center.lng]);

  // a camera's snapshot is only honestly "live" if its lastupdate is recent (the feed has stale /
  // even future-dated rows); otherwise we label it "latest image", not "live".
  const camAgeMin = selCam ? (() => { const t = Date.parse(selCam.updated.replace(" ", "T")); return Number.isFinite(t) ? (Date.now() - t) / 60000 : NaN; })() : NaN;
  const camFresh = Number.isFinite(camAgeMin) && camAgeMin >= 0 && camAgeMin < 20;

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
        // RainViewer radar is coarse (native ~z10). Cap maxzoom so MapLibre over-zooms the
        // z10 tiles instead of requesting z13+ tiles that return a "Zoom not supported" image.
        <Source id="arnfa-radar" type="raster" tiles={[radarTile]} tileSize={256} maxzoom={10} attribution="Radar: RainViewer">
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

      {/* CCTV cameras */}
      {showCameras && cameras.map((cm) => (
        <Marker key={`cam-${cm.id}`} longitude={cm.lng} latitude={cm.lat} anchor="center"
          onClick={(e) => { e.originalEvent.stopPropagation(); setSelected(null); setSelEvent(null); setSelCam(cm); }}>
          <span title={cm.title}
            className="flex h-[24px] w-[24px] cursor-pointer items-center justify-center rounded-full ring-2 ring-white shadow-sm transition-transform hover:scale-110"
            style={{ background: "#3F6CA8" }}>
            <span className="leading-none" style={{ fontSize: "12px" }}>📹</span>
          </span>
        </Marker>
      ))}

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
            <p className="mb-1.5 text-xs font-medium leading-snug text-ink">{selCam.title}</p>
            {!camImgError && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`/api/cam-snapshot?u=${encodeURIComponent(selCam.img)}`} alt={selCam.title} width={240} height={135}
                className="h-auto w-full rounded-lg border border-hairline bg-surface object-cover"
                onError={() => setCamImgError(true)} />
            )}
            <p className="mt-1 text-[0.65rem] text-ink-faint">
              {camImgError
                ? (en ? "Snapshot unavailable right now" : "ภาพไม่พร้อมใช้งานตอนนี้")
                : camFresh
                ? (en ? "Live snapshot, iTIC / Highways Dept" : "ภาพสด iTIC / กรมทางหลวง")
                : (en ? "Latest image, iTIC / Highways Dept" : "ภาพล่าสุด iTIC / กรมทางหลวง")}
            </p>
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
    </>
  );
}
