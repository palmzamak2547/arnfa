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
import { ARNFA_MAP_STYLE_URL, ARNFA_LAND, applyArnfaRecolor } from "@/lib/map/arnfaMapStyle";
import { MapDataLayers, MAP_LAYERS, LAYER_GROUPS, type MapLayerKey } from "@/components/MapDataLayers";
import { selectTravelMode } from "@/lib/ml/travelModeChoice";
import { hopEstimate } from "@/lib/plan/transit";

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

export function PlanMap({
  stops,
  center,
  mlModes = {},
}: {
  stops: EnrichedStop[];
  center: { lat: number; lng: number };
  mlModes?: Record<number, string>;
}) {
  const { en } = useLang();
  const mapRef = useRef<MapRef>(null);
  const reduced = useMemo(prefersReduced, []);
  const initialView = useMemo(() => ({ longitude: center.lng, latitude: center.lat, zoom: 13.5 }), [center]);
  const [selected, setSelected] = useState<EnrichedStop | null>(null);
  const [transitPopup, setTransitPopup] = useState<{
    lng: number;
    lat: number;
    nameTh: string;
    nameEn: string;
    system: string;
    color: string;
    emoji: string;
    isEdge?: boolean;
  } | null>(null);
  const [cursor, setCursor] = useState<string>("auto");
  const [mapError, setMapError] = useState(false);
  // NASA GIBS satellite overlay (free, no key). "none" by default so the route is clear.
  const [sat, setSat] = useState<GibsLayerKey | "none">("none");
  // Data-pipeline overlays. On by default for rail & busstops → user-friendly.
  const [layers, setLayers] = useState<Set<MapLayerKey>>(new Set(["rail", "busstops"]));
  const [layersOpen, setLayersOpen] = useState(false);
  const toggleLayer = (k: MapLayerKey) => setLayers((prev) => { const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); return n; });

  const fullPath = useMemo(() => stops.map((s) => [s.poi.lng, s.poi.lat] as [number, number]), [stops]);

  const [revealed, setRevealed] = useState(reduced ? fullPath.length : 0);
  const [shownMarkers, setShownMarkers] = useState(reduced ? stops.length : 0);

  useEffect(() => { setSelected(null); setTransitPopup(null); }, [stops]);

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

  const legsGeoJSON = useMemo(() => {
    if (stops.length < 2) return null;
    const features = [];
    for (let i = 1; i < stops.length; i++) {
      const prev = stops[i - 1];
      const stop = stops[i];
      const meters = (hopEstimate(prev.poi.lat, prev.poi.lng, stop.poi.lat, stop.poi.lng).km * 1000);
      const rainProb = stop.rainProb;
      const trafficRisk = stop.trafficAlert ? stop.trafficAlert.riskScore : 0;
      
      const choice = selectTravelMode({
        distanceMeters: meters,
        rainProb,
        trafficRiskScore: trafficRisk,
        travelerProfile: "standard"
      });
      
      const mlMode = mlModes ? mlModes[i] : null;
      const recommendedMode = mlMode ?? choice.recommendedMode;
      
      features.push({
        type: "Feature" as const,
        geometry: {
          type: "LineString" as const,
          coordinates: [[prev.poi.lng, prev.poi.lat], [stop.poi.lng, stop.poi.lat]]
        },
        properties: {
          legIndex: i,
          mode: recommendedMode,
        }
      });
    }
    return { type: "FeatureCollection" as const, features: features.slice(0, revealed) };
  }, [stops, mlModes, revealed]);

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
        mapStyle={ARNFA_MAP_STYLE_URL}
        attributionControl={{ compact: true }}
        style={{ width: "100%", height: "100%" }}
        onLoad={(e) => applyArnfaRecolor(e.target as unknown as Parameters<typeof applyArnfaRecolor>[0])}
        onStyleData={(e) => {
          // Re-assert the Open Sky palette only if the style actually reverted (rare full reload):
          // cheap one-property check, so adding satellite/radar sources (which also fire styledata) is a no-op.
          const m = e.target as unknown as Parameters<typeof applyArnfaRecolor>[0] & { getPaintProperty?: (l: string, p: string) => unknown };
          try { if (m.getPaintProperty?.("background", "background-color") !== ARNFA_LAND) applyArnfaRecolor(m); } catch { /* style not ready */ }
        }}
        onError={(e) => { if (/webgl|context|style/i.test(String(e?.error?.message || ""))) setMapError(true); }}
        cursor={cursor}
        interactiveLayerIds={["transit-nodes-layer", "transit-edges-layer", "rail-nodes-layer", "rail-edges-layer"]}
        onMouseEnter={() => setCursor("pointer")}
        onMouseLeave={() => setCursor("auto")}
        onClick={(e) => {
          const map = mapRef.current?.getMap();
          if (!map) return;
          const features = map.queryRenderedFeatures(e.point, {
            layers: ["transit-nodes-layer", "transit-edges-layer", "rail-nodes-layer", "rail-edges-layer"]
          });
          
          if (features.length > 0) {
            const f = features[0];
            const props = f.properties ?? {};
            if (f.layer.id === "transit-nodes-layer" || f.layer.id === "rail-nodes-layer") {
              const coords = (f.geometry as any).coordinates;
              setTransitPopup({
                lng: coords[0],
                lat: coords[1],
                nameTh: props.nameTh || "",
                nameEn: props.nameEn || "",
                system: props.system || "",
                color: props.color || "#6B7280",
                emoji: props.emoji || "🚉",
              });
              setSelected(null);
            } else if (f.layer.id === "transit-edges-layer" || f.layer.id === "rail-edges-layer") {
              const system = props.system || "";
              const systemColor: Record<string, string> = {
                BTS: "#3aa537",
                MRT: "#1964B7",
                ARL: "#C8102E",
                SRT: "#A6192E",
                BRT: "#F97316",
                BMTA: "#CA8A04",
              };
              setTransitPopup({
                lng: e.lngLat.lng,
                lat: e.lngLat.lat,
                nameTh: `เส้นทาง ${system}`,
                nameEn: `${system} Line`,
                system: system,
                color: systemColor[system] || "#9CA3AF",
                emoji: system === "BMTA" ? "🚌" : "🚇",
                isEdge: true
              });
              setSelected(null);
            }
          } else {
            setTransitPopup(null);
            setSelected(null);
          }
        }}
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
              paint={{ "line-color": "#1A1F2B", "line-width": 2.5, "line-dasharray": [1.5, 1.2], "line-opacity": 0.18 }} />
          </Source>
        )}

        {legsGeoJSON && legsGeoJSON.features.length > 0 && (
          <Source id="route-legs" type="geojson" data={legsGeoJSON}>
            {/* Walk Leg Layer */}
            <Layer
              id="route-leg-walk"
              type="line"
              filter={["==", ["get", "mode"], "walk"]}
              layout={{ "line-cap": "round", "line-join": "round" }}
              paint={{
                "line-color": "#3aa537",
                "line-width": 3.8,
                "line-dasharray": [1.5, 1.5],
                "line-opacity": 0.88,
              }}
            />
            {/* Transit Leg Layer */}
            <Layer
              id="route-leg-transit"
              type="line"
              filter={["==", ["get", "mode"], "transit"]}
              layout={{ "line-cap": "round", "line-join": "round" }}
              paint={{
                "line-color": "#1964B7",
                "line-width": 3.8,
                "line-dasharray": [3.5, 1.5],
                "line-opacity": 0.88,
              }}
            />
            {/* Taxi/Drive Leg Layer */}
            <Layer
              id="route-leg-taxi"
              type="line"
              filter={["any", ["==", ["get", "mode"], "taxi"], ["==", ["get", "mode"], "drive"]]}
              layout={{ "line-cap": "round", "line-join": "round" }}
              paint={{
                "line-color": "#E0683C",
                "line-width": 3.8,
                "line-opacity": 0.88,
              }}
            />
            {/* Bike Leg Layer */}
            <Layer
              id="route-leg-bike"
              type="line"
              filter={["==", ["get", "mode"], "bike"]}
              layout={{ "line-cap": "round", "line-join": "round" }}
              paint={{
                "line-color": "#8B5CF6",
                "line-width": 3.8,
                "line-dasharray": [1, 3],
                "line-opacity": 0.88,
              }}
            />
          </Source>
        )}

        <MapDataLayers center={center} active={layers} routePresent={routeLayerPresent} en={en} stops={stops} />

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
                {categoryLabel(selected.poi.category, en)}, {selected.arrivalLabel}
                {typeof selected.tempC === "number" && `, ${Math.round(selected.tempC)}°`}
              </p>
            </div>
          </Popup>
        )}

        {transitPopup && (
          <Popup longitude={transitPopup.lng} latitude={transitPopup.lat} anchor="bottom" offset={10} closeButton closeOnClick={false}
            onClose={() => setTransitPopup(null)} maxWidth="260px">
            <div className="font-thai">
              <p className="flex items-center gap-1.5 text-sm font-medium leading-snug text-ink">
                <span aria-hidden style={{ fontSize: "14px" }}>{transitPopup.emoji}</span>
                {en ? transitPopup.nameEn : transitPopup.nameTh}
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-muted">
                <span className="shrink-0 rounded px-1.5 py-0.5 text-[0.6rem] font-semibold text-white"
                  style={{ background: transitPopup.color }}>
                  {transitPopup.system}
                </span>
                <span>
                  {transitPopup.isEdge
                    ? (en ? "Transit Route" : "เส้นทางขนส่งสาธารณะ")
                    : (transitPopup.system === "BMTA" ? (en ? "Bus Stop" : "ป้ายรถเมล์") : (en ? "Transit Station" : "สถานีรถไฟฟ้า"))}
                </span>
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

      {/* Data-layers control — toggle the pipeline onto the map (off by default → calm) */}
      <div className="absolute bottom-9 right-2 z-10 flex flex-col items-end gap-1.5">
        {layersOpen && (
          <div className="flex max-h-[62vh] w-44 flex-col overflow-y-auto rounded-2xl border border-hairline bg-paper/95 p-1.5 shadow-md backdrop-blur">
            {LAYER_GROUPS.map((g) => {
              const items = MAP_LAYERS.filter((l) => l.group === g.id);
              if (!items.length) return null;
              return (
                <div key={g.id} className="mb-0.5">
                  <p className="px-2 pb-0.5 pt-1.5 font-thai text-[0.6rem] uppercase tracking-wide text-ink-faint">{en ? g.en : g.th}</p>
                  {items.map((l) => {
                    const on = layers.has(l.key);
                    return (
                      <button key={l.key} type="button" onClick={() => toggleLayer(l.key)}
                        className={clsx("font-thai flex w-full items-center gap-2 rounded-xl px-2.5 py-1 text-xs transition-colors", on ? "bg-ink text-paper" : "text-ink-muted hover:bg-surface")}>
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: l.color }} aria-hidden />
                        <span className="flex-1 text-left">{en ? l.en : l.th}</span>
                        <span className={clsx("h-2.5 w-2.5 shrink-0 rounded-full border", on ? "border-paper bg-paper" : "border-current opacity-40")} aria-hidden />
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
        <button type="button" onClick={() => setLayersOpen((o) => !o)} aria-expanded={layersOpen}
          className={clsx("font-thai flex items-center gap-1.5 rounded-full border border-hairline px-3 py-1.5 text-xs shadow-sm backdrop-blur transition-colors", layersOpen || layers.size ? "bg-ink text-paper" : "bg-paper/90 text-ink-muted hover:bg-surface")}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M12 3 3 8l9 5 9-5-9-5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /><path d="m3 13 9 5 9-5M3 17.5l9 5 9-5" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" opacity=".5" /></svg>
          {en ? "Layers" : "ชั้นข้อมูล"}
          {layers.size > 0 && <span className="ml-0.5 rounded-full bg-paper/30 px-1.5 text-[0.6rem] tabular-nums">{layers.size}</span>}
        </button>
      </div>

      {/* Legend toolbar — decodes sky colors and recommended ML route modes at a glance */}
      <div className="pointer-events-none absolute bottom-3 left-1/2 z-10 hidden -translate-x-1/2 flex-col items-center gap-1.5 sm:flex">
        {/* Sky-colour legend */}
        <div className="flex items-center gap-2.5 rounded-full border border-hairline bg-paper/90 px-3.5 py-1.5 shadow-sm backdrop-blur">
          <span className="font-thai text-[0.6rem] uppercase tracking-wider text-ink-faint mr-1">{en ? "Sky" : "สภาพฟ้า"}</span>
          {SKY_LEGEND.map((s) => (
            <span key={s.state} className="flex items-center gap-1 font-thai text-[0.65rem] text-ink-muted">
              <span className="h-2.5 w-2.5 rounded-full ring-1 ring-white" style={{ background: SKY_COLOR[s.state] }} />
              {en ? s.en : s.th}
            </span>
          ))}
        </div>
        
        {/* ML Recommended Mode legend */}
        <div className="flex items-center gap-2.5 rounded-full border border-hairline bg-paper/90 px-3.5 py-1 shadow-sm backdrop-blur">
          <span className="font-thai text-[0.6rem] uppercase tracking-wider text-ink-faint mr-1">{en ? "ML Route" : "ML แนะนำ"}</span>
          <span className="flex items-center gap-1 font-thai text-[0.65rem] text-ink-muted">
            <span className="inline-block h-0.5 w-3 border-t-2 border-dashed" style={{ borderColor: "#3aa537" }} />
            {en ? "Walk" : "เดิน"}
          </span>
          <span className="flex items-center gap-1 font-thai text-[0.65rem] text-ink-muted">
            <span className="inline-block h-0.5 w-3 border-t-2 border-dashed" style={{ borderColor: "#1964B7" }} />
            {en ? "Transit" : "รถไฟฟ้า"}
          </span>
          <span className="flex items-center gap-1 font-thai text-[0.65rem] text-ink-muted">
            <span className="inline-block h-0.5 w-3 border-t-2" style={{ borderColor: "#E0683C" }} />
            {en ? "Taxi/Car" : "รถยนต์"}
          </span>
          <span className="flex items-center gap-1 font-thai text-[0.65rem] text-ink-muted">
            <span className="inline-block h-0.5 w-3 border-t-2 border-dotted" style={{ borderColor: "#8B5CF6" }} />
            {en ? "Bike" : "จักรยาน"}
          </span>
        </div>
      </div>
    </div>
  );
}

