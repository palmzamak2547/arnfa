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

export type MapLayerKey = "rain" | "air" | "rail" | "parks" | "cooling" | "rest";

export const MAP_LAYERS: { key: MapLayerKey; th: string; en: string; emoji: string; color: string }[] = [
  { key: "rain", th: "เรดาร์ฝน", en: "Rain radar", emoji: "🌧️", color: "#5B7FB8" },
  { key: "air", th: "ฝุ่น PM2.5", en: "PM2.5", emoji: "💨", color: "#E08A3C" },
  { key: "rail", th: "รถไฟฟ้า", en: "Trains", emoji: "🚉", color: "#1964B7" },
  { key: "parks", th: "สวน", en: "Parks", emoji: "🌳", color: "#5E8C61" },
  { key: "cooling", th: "ที่หลบร้อน", en: "Cooling", emoji: "❄️", color: "#3B82C4" },
  { key: "rest", th: "จุดพักรถ", en: "Rest stops", emoji: "🛣️", color: "#7C6F5A" },
];

type Pt = { lat: number; lng: number; label: string; subTh: string; subEn: string; color: string; emoji: string };

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
      .catch(() => { if (!cancelled) { setPts([]); setForUrl(url); } });
    return () => { cancelled = true; };
    // mapFn is a stable module-level fn; url carries the area coords
  }, [show, url, forUrl, mapFn]);
  return show && forUrl === url ? pts : [];
}

const stripSys = (n: string) => (n || "").replace(/^(BTS|MRT|ARL|SRT|Airport Rail)\s+/i, "");
const railFn = (d: any): Pt[] => (d.stations ?? []).map((s: any) => ({ lat: s.lat, lng: s.lng, label: stripSys(s.th || s.en || ""), subTh: s.system, subEn: s.system, color: SYSTEM_META[s.system]?.color ?? "#1964B7", emoji: "🚉" }));
const restFn = (d: any): Pt[] => (d.areas ?? []).map((a: any) => ({ lat: a.lat, lng: a.lng, label: a.name, subTh: `ทล. ${a.route}`, subEn: `Hwy ${a.route}`, color: "#7C6F5A", emoji: "🛣️" }));
const coolFn = (d: any): Pt[] => (d.centers ?? []).map((c: any) => ({ lat: c.lat, lng: c.lng, label: c.name, subTh: c.district ?? "", subEn: c.district ?? "", color: "#3B82C4", emoji: "❄️" }));
const airFn = (d: any): Pt[] => (d.stations ?? []).map((s: any) => ({ lat: s.lat, lng: s.lng, label: s.stationNameTh, subTh: s.pm25 != null ? `PM2.5 ${s.pm25} · ${AIR_LABEL_TH[s.level as keyof typeof AIR_LABEL_TH] ?? ""}` : "ไม่มีข้อมูล", subEn: s.pm25 != null ? `PM2.5 ${s.pm25} µg/m³` : "no data", color: AIR_COLOR[s.level as keyof typeof AIR_COLOR] ?? "#9AA0A6", emoji: "💨" }));

export function MapDataLayers({ center, active, routePresent, en }: { center: { lat: number; lng: number }; active: Set<MapLayerKey>; routePresent: boolean; en: boolean }) {
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

  const [selected, setSelected] = useState<Pt | null>(null);
  // Don't leave an orphan popup when its layer is toggled off or the area changes.
  useEffect(() => { setSelected(null); }, [active, center.lat, center.lng]);

  const dot = (p: Pt, _i: number, kind: string) => {
    const sub = en ? p.subEn : p.subTh;
    return (
      <Marker key={`${kind}-${p.lat},${p.lng}`} longitude={p.lng} latitude={p.lat} anchor="center"
        onClick={(e) => { e.originalEvent.stopPropagation(); setSelected(p); }}>
        <span title={`${p.label}${sub ? " · " + sub : ""}`}
          className="flex h-[18px] w-[18px] cursor-pointer items-center justify-center rounded-full text-[9px] ring-2 ring-white shadow-sm transition-transform hover:scale-125"
          style={{ background: p.color }}>
          <span className="leading-none" style={{ fontSize: "9px" }}>{p.emoji}</span>
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
          <Layer id="arnfa-radar-layer" type="raster" beforeId={routePresent ? "route-line" : undefined} paint={{ "raster-opacity": 0.5 }} />
        </Source>
      ) : null}
      {air.map((p, i) => dot(p, i, "air"))}
      {rail.map((p, i) => dot(p, i, "rail"))}
      {parks.map((p, i) => dot(p, i, "park"))}
      {cooling.map((p, i) => dot(p, i, "cool"))}
      {rest.map((p, i) => dot(p, i, "rest"))}

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
