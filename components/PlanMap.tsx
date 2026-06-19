"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLang } from "@/lib/i18n/useLang";
import Map, { Marker, Popup, NavigationControl, GeolocateControl, ScaleControl, Source, Layer, type MapRef } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { clsx } from "clsx";
import type { EnrichedStop } from "@/lib/plan/buildPlan";
import type { SkyState } from "./SkyChip";
import { categoryLabel } from "@/lib/plan/categoryLabel";
import { GIBS_LAYERS, gibsTileUrl, gibsDate, type GibsLayerKey } from "@/lib/satellite/gibs";
import { arnfaMapStyle } from "@/lib/map/arnfaMapStyle";

/**
 * PlanMap — MapLibre on Arnfa's OWN editorial basemap (recoloured OpenFreeMap positron,
 * see lib/map/arnfaMapStyle). Stable + premium:
 *   - warm-paper map so the route + weather-fit markers are what you read
 *   - a sky-colour legend so the marker colours decode at a glance
 *   - dashed walking line draws ON between stops in order; markers drop staggered
 *   - the map flies to fit the plan when stops change
 *   - click a stop → popup (name · category · sky · time · temp)
 *   - GeolocateControl shows where you are; ScaleControl for distance sense
 *   - if WebGL/tiles fail it degrades to an honest list, never a blank box
 * Reduced-motion: full line + markers render instantly (no draw/fly).
 */

const SKY_COLOR: Record<SkyState, string> = {
  clear: "#F2A65A", partly: "#7BA68A", cloudy: "#4B5263", rain: "#5B7FB8", storm: "#D9534A", night: "#4A5878",
};

// The marker colours, decoded — shown as a small legend so the map reads at a glance.
const SKY_LEGEND: { state: SkyState; th: string; en: string }[] = [
  { state: "clear", th: "แดด", en: "Sun" },
  { state: "partly", th: "ฟ้าโปร่ง", en: "Fair" },
  { state: "cloudy", th: "ครึ้ม", en: "Cloud" },
  { state: "rain", th: "ฝน", en: "Rain" },
];

function prefersReduced(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

export function PlanMap({ stops, center }: { stops: EnrichedStop[]; center: { lat: number; lng: number } }) {
  const { en } = useLang();
  const mapRef = useRef<MapRef>(null);
  const reduced = useMemo(prefersReduced, []);
  const initialView = useMemo(() => ({ longitude: center.lng, latitude: center.lat, zoom: 13.5 }), [center]);
  const mapStyle = useMemo(() => arnfaMapStyle(), []);
  const [selected, setSelected] = useState<EnrichedStop | null>(null);
  const [mapError, setMapError] = useState(false);
  // NASA GIBS satellite overlay (free, no key). "none" by default so the route is clear.
  const [sat, setSat] = useState<GibsLayerKey | "none">("none");

  const fullPath = useMemo(() => stops.map((s) => [s.poi.lng, s.poi.lat] as [number, number]), [stops]);

  const [revealed, setRevealed] = useState(reduced ? fullPath.length : 0);
  const [shownMarkers, setShownMarkers] = useState(reduced ? stops.length : 0);

  useEffect(() => { setSelected(null); }, [stops]);

  useEffect(() => {
    if (reduced) { setRevealed(fullPath.length); setShownMarkers(stops.length); return; }
    setRevealed(0); setShownMarkers(0);
    let raf = 0, i = 0;
    const stepMarker = () => { i++; setShownMarkers(i); if (i < stops.length) raf = window.setTimeout(stepMarker, 140) as unknown as number; };
    const markerTimer = window.setTimeout(stepMarker, 200);
    let p = 0;
    const drawTimer = window.setTimeout(function grow() { p++; setRevealed(p); if (p < fullPath.length) raf = window.setTimeout(grow, 220) as unknown as number; }, 200 + stops.length * 140);
    return () => { window.clearTimeout(markerTimer); window.clearTimeout(drawTimer); window.clearTimeout(raf); };
  }, [fullPath, stops.length, reduced]);

  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map || fullPath.length === 0) return;
    let minLng = 999, minLat = 999, maxLng = -999, maxLat = -999;
    for (const [lng, lat] of fullPath) {
      minLng = Math.min(minLng, lng); maxLng = Math.max(maxLng, lng);
      minLat = Math.min(minLat, lat); maxLat = Math.max(maxLat, lat);
    }
    map.fitBounds([[minLng, minLat], [maxLng, maxLat]], { padding: 56, maxZoom: 15.5, duration: reduced ? 0 : 1100 });
  }, [fullPath, reduced]);

  const lineGeoJSON = useMemo(() => ({
    type: "Feature" as const, properties: {},
    geometry: { type: "LineString" as const, coordinates: fullPath.slice(0, Math.max(2, revealed)) },
  }), [fullPath, revealed]);

  // Honest fallback — the plan never depends on the map rendering.
  if (mapError) {
    return (
      <div className="flex h-full w-full flex-col overflow-hidden rounded-3xl border border-hairline bg-surface/70 p-5">
        <p className="font-thai text-sm text-ink-muted mb-3">{en ? "Map couldn't load — here's the route:" : "แผนที่โหลดไม่ได้ — นี่คือเส้นทาง:"}</p>
        <ol className="space-y-2 overflow-y-auto">
          {stops.map((s, i) => (
            <li key={s.poi.id} className="flex items-center gap-3 font-thai text-sm text-ink">
              <span className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold text-white" style={{ background: SKY_COLOR[s.skyState] }}>{i + 1}</span>
              <span className="truncate">{s.poi.name}</span>
              <span className="ml-auto shrink-0 text-xs text-ink-faint tabular-nums">{s.arrivalLabel}</span>
            </li>
          ))}
        </ol>
      </div>
    );
  }

  const routeLayerPresent = fullPath.length >= 2 && revealed >= 2;
  const satLayer = sat === "none" ? null : GIBS_LAYERS.find((l) => l.key === sat) ?? null;
  const satDate = satLayer ? gibsDate(new Date(), satLayer.lagDays) : "";

  return (
    <div className="relative h-full w-full overflow-hidden rounded-3xl border border-hairline">
      <Map
        ref={mapRef}
        initialViewState={initialView}
        mapStyle={mapStyle}
        attributionControl={{ compact: true }}
        style={{ width: "100%", height: "100%" }}
        onError={(e) => { if (/webgl|context|style/i.test(String(e?.error?.message || ""))) setMapError(true); }}
      >
        <NavigationControl position="top-right" showCompass={false} />
        <GeolocateControl position="top-right" trackUserLocation positionOptions={{ enableHighAccuracy: false }} />
        <ScaleControl position="bottom-left" maxWidth={96} unit="metric" />

        {/* NASA GIBS satellite raster — sits below the route line (beforeId) so the
            plan always reads on top. Daily imagery, no key. Missing tiles just blank. */}
        {satLayer && (
          <Source key={sat} id="gibs-sat" type="raster" tiles={[gibsTileUrl(satLayer, satDate)]} tileSize={256} maxzoom={satLayer.maxNativeZoom} attribution="Imagery: NASA GIBS">
            <Layer id="gibs-sat-layer" type="raster" beforeId={routeLayerPresent ? "route-line" : undefined} paint={{ "raster-opacity": satLayer.opacity }} />
          </Source>
        )}

        {fullPath.length >= 2 && revealed >= 2 && (
          <Source id="route" type="geojson" data={lineGeoJSON}>
            <Layer id="route-line" type="line" layout={{ "line-cap": "round", "line-join": "round" }}
              paint={{ "line-color": "#1A1F2B", "line-width": 2.5, "line-dasharray": [1.5, 1.2], "line-opacity": 0.7 }} />
          </Source>
        )}

        {stops.slice(0, shownMarkers).map((stop, i) => {
          const active = selected?.poi.id === stop.poi.id;
          return (
          <Marker key={stop.poi.id} longitude={stop.poi.lng} latitude={stop.poi.lat} anchor="bottom"
            onClick={(e) => { e.originalEvent.stopPropagation(); setSelected(stop); }}>
            <button type="button" className="flex cursor-pointer flex-col items-center" title={stop.poi.name} aria-label={stop.poi.name}
              style={reduced ? undefined : { animation: "arnfa-drop 0.5s cubic-bezier(0.22,1,0.36,1) both" }}>
              <div className={clsx("flex items-center justify-center rounded-full font-semibold text-white ring-2 ring-white transition-all hover:scale-110",
                  active ? "h-9 w-9 text-sm shadow-lg scale-110" : "h-7 w-7 text-xs shadow-md")}
                style={{ background: SKY_COLOR[stop.skyState], boxShadow: active ? `0 0 0 3px ${SKY_COLOR[stop.skyState]}40, 0 6px 16px rgba(26,31,43,0.25)` : undefined }}>
                {i + 1}
              </div>
              <div className={clsx("-mt-1 rotate-45", active ? "h-2.5 w-2.5" : "h-2 w-2")} style={{ background: SKY_COLOR[stop.skyState] }} />
            </button>
          </Marker>
          );
        })}

        {selected && (
          <Popup longitude={selected.poi.lng} latitude={selected.poi.lat} anchor="bottom" offset={28} closeButton closeOnClick={false}
            onClose={() => setSelected(null)} maxWidth="240px">
            <div className="font-thai">
              <p className="font-medium text-ink text-sm leading-snug">{selected.poi.name}</p>
              <p className="text-xs text-ink-muted mt-0.5">
                {categoryLabel(selected.poi.category, en)} · {selected.arrivalLabel}
                {typeof selected.tempC === "number" && ` · ${Math.round(selected.tempC)}°`}
              </p>
            </div>
          </Popup>
        )}
      </Map>

      {/* Satellite layer switcher (NASA GIBS · free · no key) */}
      <div className="absolute left-3 top-3 z-10 flex gap-1 rounded-full border border-hairline bg-paper/90 p-1 shadow-sm backdrop-blur">
        {[{ k: "none" as const, label: en ? "Map" : "แผนที่" }, ...GIBS_LAYERS.map((l) => ({ k: l.key, label: en ? l.en : l.th }))].map(({ k, label }) => (
          <button key={k} type="button" onClick={() => setSat(k)}
            className={clsx("font-thai rounded-full px-3 py-1 text-xs transition-colors", sat === k ? "bg-ink text-paper" : "text-ink-muted hover:bg-surface")}>
            {label}
          </button>
        ))}
      </div>
      {satLayer && (
        <div className="absolute left-3 top-12 z-10 rounded-full bg-paper/85 px-2.5 py-1 font-thai text-[0.65rem] text-ink-faint backdrop-blur">
          {en ? `NASA daily image (${satDate})` : `ภาพดาวเทียม NASA รายวัน (${satDate})`}
        </div>
      )}

      {/* Sky-colour legend — decodes the marker colours at a glance ("ดูง่าย") */}
      <div className="pointer-events-none absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2.5 rounded-full border border-hairline bg-paper/90 px-3 py-1.5 shadow-sm backdrop-blur">
        {SKY_LEGEND.map((s) => (
          <span key={s.state} className="flex items-center gap-1 font-thai text-[0.65rem] text-ink-muted">
            <span className="h-2.5 w-2.5 rounded-full ring-1 ring-white" style={{ background: SKY_COLOR[s.state] }} />
            {en ? s.en : s.th}
          </span>
        ))}
      </div>
    </div>
  );
}
