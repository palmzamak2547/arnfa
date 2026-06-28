"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import Map, { Marker, NavigationControl, GeolocateControl, ScaleControl, Source, Layer, type MapRef, type MapLayerMouseEvent } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { useLang } from "@/lib/i18n/useLang";
import { ARNFA_MAP_STYLE_URL, ARNFA_LAND, applyArnfaRecolor } from "@/lib/map/arnfaMapStyle";
import { MapDataLayers, MAP_LAYERS, type MapLayerKey } from "@/components/MapDataLayers";
import { SKY_VERDICT_TH, SKY_VERDICT_EN, type SkyVerdict } from "@/lib/core/skyScore";

/**
 * SkyMapView — "แผนที่ฟ้า / Sky Map": the spatial counterpart to /where. Every area in Thailand
 * is a live pin on Arnfa's own editorial basemap, coloured by its sky verdict (same engine,
 * map-native). Pick a day (real /api/where?day=N — the honest version of a forecast scrubber,
 * never a synthetic curve), search, jump to the clearest sky now, tap a pin for the verdict +
 * "plan here". Pins are a data-driven circle layer (fast for ~150 points). Honest fallback to
 * the /where list if WebGL/tiles fail or the forecast can't be read. Reuses the /plan map shell.
 */

type Area = {
  key: string; th: string; en: string; zone: string; tier: string;
  lat: number; lng: number; tempC: number; rainProb: number; score: number; verdict: SkyVerdict;
};

// verdict → pin colour (matches /where's VDOT: clear=sage, ok=sun, closing=rain, poor=indoor-warm)
const VCOLOR: Record<SkyVerdict, string> = {
  clearish: "#7BA68A", ok: "#F2A65A", closing: "#5B7FB8", poor: "#D9534A",
};

const TH_DOW = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];
const EN_DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
function dayLabel(offset: number, en: boolean): string {
  if (offset === 0) return en ? "Today" : "วันนี้";
  if (offset === 1) return en ? "Tom." : "พรุ่งนี้";
  const d = new Date(Date.now() + offset * 86400000);
  return (en ? EN_DOW : TH_DOW)[d.getDay()];
}

function prefersReduced(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

export function SkyMapView() {
  const { en } = useLang();
  const mapRef = useRef<MapRef>(null);
  const reduced = useMemo(prefersReduced, []);

  const [day, setDay] = useState(0);
  const [areas, setAreas] = useState<Area[] | null>(null);
  const [date, setDate] = useState("");
  const [error, setError] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [selected, setSelected] = useState<Area | null>(null);
  const [q, setQ] = useState("");
  const [layers, setLayers] = useState<Set<MapLayerKey>>(new Set());
  const [layersOpen, setLayersOpen] = useState(false);
  const [didFit, setDidFit] = useState(false);
  const toggleLayer = (k: MapLayerKey) => setLayers((p) => { const n = new Set(p); n.has(k) ? n.delete(k) : n.add(k); return n; });

  // real per-day ranking — same source as /where + the home pick
  useEffect(() => {
    let cancelled = false;
    setAreas(null); setError(false); setSelected(null);
    fetch(`/api/where?day=${day}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => { if (!cancelled) { setAreas(d.areas); setDate(d.date); } })
      .catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, [day]);

  // fit the whole country once the first day's areas land
  useEffect(() => {
    if (didFit || !areas?.length) return;
    const map = mapRef.current?.getMap();
    if (!map) return;
    let minLng = 999, minLat = 999, maxLng = -999, maxLat = -999;
    for (const a of areas) {
      minLng = Math.min(minLng, a.lng); maxLng = Math.max(maxLng, a.lng);
      minLat = Math.min(minLat, a.lat); maxLat = Math.max(maxLat, a.lat);
    }
    map.fitBounds([[minLng, minLat], [maxLng, maxLat]], { padding: 48, maxZoom: 9, duration: reduced ? 0 : 900 });
    setDidFit(true);
  }, [areas, didFit, reduced]);

  const geojson = useMemo(() => ({
    type: "FeatureCollection" as const,
    features: (areas ?? []).map((a) => ({
      type: "Feature" as const,
      properties: { key: a.key, color: VCOLOR[a.verdict] },
      geometry: { type: "Point" as const, coordinates: [a.lng, a.lat] },
    })),
  }), [areas]);

  const flyTo = (a: Area) => {
    const map = mapRef.current?.getMap();
    map?.flyTo({ center: [a.lng, a.lat], zoom: Math.max(map.getZoom(), 10), duration: reduced ? 0 : 900 });
  };
  const selectArea = (a: Area) => { setSelected(a); flyTo(a); };

  const onMapClick = (e: MapLayerMouseEvent) => {
    const f = e.features?.[0];
    const key = f?.properties?.key as string | undefined;
    if (key) { const a = areas?.find((x) => x.key === key); if (a) { setSelected(a); flyTo(a); } }
    else setSelected(null);
  };

  const matches = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term || !areas) return [];
    return areas.filter((a) => a.th.toLowerCase().includes(term) || a.en.toLowerCase().includes(term)).slice(0, 8);
  }, [q, areas]);

  const clearest = areas?.[0] ?? null;
  const mapsDir = selected ? `https://www.google.com/maps/dir/?api=1&destination=${selected.lat},${selected.lng}` : "#";

  // Honest fallback — never a blank box; point at the list version of the same data.
  if (mapError) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="font-thai text-ink-muted">{en ? "The map couldn't load here — the same live ranking is on the list view:" : "แผนที่โหลดไม่ได้ตรงนี้ — อันดับฟ้าสด ๆ ชุดเดียวกันดูแบบรายการได้:"}</p>
        <Link href="/where" className="rounded-full bg-ink px-5 py-2.5 font-thai text-sm text-paper">{en ? "Open Where to go →" : "เปิด ไปไหนดี →"}</Link>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden">
      <Map
        ref={mapRef}
        initialViewState={{ longitude: 100.9, latitude: 13.4, zoom: 5.1 }}
        mapStyle={ARNFA_MAP_STYLE_URL}
        attributionControl={{ compact: true }}
        style={{ width: "100%", height: "100%" }}
        interactiveLayerIds={["sky-pins"]}
        onClick={onMapClick}
        onLoad={(e) => applyArnfaRecolor(e.target as unknown as Parameters<typeof applyArnfaRecolor>[0])}
        onStyleData={(e) => {
          const m = e.target as unknown as Parameters<typeof applyArnfaRecolor>[0] & { getPaintProperty?: (l: string, p: string) => unknown };
          try { if (m.getPaintProperty?.("background", "background-color") !== ARNFA_LAND) applyArnfaRecolor(m); } catch { /* not ready */ }
        }}
        onError={(e) => { if (/webgl|context|style/i.test(String(e?.error?.message || ""))) setMapError(true); }}
      >
        <NavigationControl position="top-right" showCompass={false} />
        <GeolocateControl position="top-right" trackUserLocation positionOptions={{ enableHighAccuracy: false }} />
        <ScaleControl position="bottom-left" maxWidth={96} unit="metric" />

        <MapDataLayers center={{ lat: 13.4, lng: 100.9 }} active={layers} routePresent={false} en={en} />

        {/* the live sky pins — one per area, coloured by verdict (data-driven circle layer) */}
        {areas && (
          <Source id="sky-areas" type="geojson" data={geojson}>
            <Layer
              id="sky-pins"
              type="circle"
              paint={{
                "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 3.4, 8, 6, 12, 9],
                "circle-color": ["get", "color"],
                "circle-stroke-width": 1.4,
                "circle-stroke-color": "#ffffff",
                "circle-opacity": 0.92,
              }}
            />
          </Source>
        )}

        {/* selected pin gets a bigger highlighted ring */}
        {selected && (
          <Marker longitude={selected.lng} latitude={selected.lat} anchor="center">
            <div className="h-5 w-5 rounded-full ring-2 ring-white" style={{ background: VCOLOR[selected.verdict], boxShadow: `0 0 0 4px ${VCOLOR[selected.verdict]}40, 0 6px 16px rgba(26,31,43,0.3)` }} />
          </Marker>
        )}
      </Map>

      {/* ── top bar: search + day selector ───────────────────────────────── */}
      <div className="pointer-events-none absolute inset-x-0 top-3 z-10 flex flex-col items-center gap-2 px-3">
        <div className="pointer-events-auto relative w-full max-w-md">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={en ? "Search an area…" : "ค้นหาพื้นที่…"}
            aria-label={en ? "Search area" : "ค้นหาพื้นที่"}
            className="w-full rounded-full border border-hairline bg-paper/90 px-5 py-2.5 font-thai text-sm text-ink shadow-sm backdrop-blur outline-none placeholder:text-ink-faint focus:border-sun"
          />
          {matches.length > 0 && (
            <ul className="absolute inset-x-0 top-12 max-h-64 overflow-y-auto rounded-2xl border border-hairline bg-paper/95 p-1 shadow-md backdrop-blur">
              {matches.map((a) => (
                <li key={a.key}>
                  <button type="button" onClick={() => { selectArea(a); setQ(""); }}
                    className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left font-thai text-sm text-ink transition-colors hover:bg-surface">
                    <span className="flex items-center gap-2 truncate">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: VCOLOR[a.verdict] }} aria-hidden />
                      <span className="truncate">{en ? a.en : a.th}</span>
                    </span>
                    <span className="shrink-0 text-xs text-ink-faint tabular-nums">{a.tempC}° · {a.rainProb}%</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="pointer-events-auto flex max-w-full gap-1 overflow-x-auto rounded-full border border-hairline bg-paper/90 p-1 shadow-sm backdrop-blur">
          {Array.from({ length: 7 }, (_, i) => i).map((o) => (
            <button key={o} type="button" onClick={() => setDay(o)}
              className={clsx("shrink-0 rounded-full px-3 py-1.5 font-thai text-xs transition-colors", o === day ? "bg-ink text-paper" : "text-ink-muted hover:bg-surface")}>
              {dayLabel(o, en)}
            </button>
          ))}
        </div>
      </div>

      {/* ── clearest-now chip (bottom-left) ──────────────────────────────── */}
      {clearest && !selected && (
        <button type="button" onClick={() => selectArea(clearest)}
          className="absolute bottom-9 left-3 z-10 flex items-center gap-2 rounded-full border border-hairline bg-paper/92 px-3.5 py-2 text-left font-thai text-xs shadow-sm backdrop-blur transition-colors hover:bg-surface">
          <span className="h-2.5 w-2.5 rounded-full ring-1 ring-white" style={{ background: VCOLOR[clearest.verdict] }} aria-hidden />
          <span className="text-ink-muted">{en ? "Clearest now" : "ฟ้าดีสุดตอนนี้"}</span>
          <span className="font-medium text-ink">{en ? clearest.en : clearest.th}</span>
          <span className="text-ink-faint tabular-nums">{clearest.tempC}°</span>
        </button>
      )}

      {/* ── layers toggle (bottom-right, reuses the /plan overlays) ───────── */}
      <div className="absolute bottom-9 right-2 z-10 flex flex-col items-end gap-1.5">
        {layersOpen && (
          <div className="flex flex-col gap-1 rounded-2xl border border-hairline bg-paper/95 p-1.5 shadow-md backdrop-blur">
            {MAP_LAYERS.map((l) => {
              const on = layers.has(l.key);
              return (
                <button key={l.key} type="button" onClick={() => toggleLayer(l.key)}
                  className={clsx("flex items-center gap-2 rounded-xl px-2.5 py-1 font-thai text-xs transition-colors", on ? "bg-ink text-paper" : "text-ink-muted hover:bg-surface")}>
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: l.color }} aria-hidden />
                  <span className="flex-1 text-left">{en ? l.en : l.th}</span>
                  <span className={clsx("h-2.5 w-2.5 shrink-0 rounded-full border", on ? "border-paper bg-paper" : "border-current opacity-40")} aria-hidden />
                </button>
              );
            })}
          </div>
        )}
        <button type="button" onClick={() => setLayersOpen((o) => !o)} aria-expanded={layersOpen}
          className={clsx("flex items-center gap-1.5 rounded-full border border-hairline px-3 py-1.5 font-thai text-xs shadow-sm backdrop-blur transition-colors", layersOpen || layers.size ? "bg-ink text-paper" : "bg-paper/90 text-ink-muted hover:bg-surface")}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M12 3 3 8l9 5 9-5-9-5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /><path d="m3 13 9 5 9-5M3 17.5l9 5 9-5" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" opacity=".5" /></svg>
          {en ? "Layers" : "ชั้นข้อมูล"}
          {layers.size > 0 && <span className="ml-0.5 rounded-full bg-paper/30 px-1.5 text-[0.6rem] tabular-nums">{layers.size}</span>}
        </button>
      </div>

      {/* ── detail sheet (selected area) ─────────────────────────────────── */}
      {selected && (
        <div className="absolute inset-x-3 bottom-3 z-20 mx-auto max-w-sm rounded-3xl border border-hairline bg-paper/95 p-4 shadow-[0_24px_60px_-30px_rgba(26,31,43,0.5)] backdrop-blur sm:left-auto sm:right-3 sm:mx-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="font-thai-serif text-xl font-light leading-snug text-ink">{en ? selected.en : selected.th}</h2>
              <p className="mt-0.5 flex items-center gap-1.5 font-thai text-xs text-ink-muted">
                <span className="h-2 w-2 rounded-full" style={{ background: VCOLOR[selected.verdict] }} aria-hidden />
                {en ? SKY_VERDICT_EN[selected.verdict] : SKY_VERDICT_TH[selected.verdict]} · {selected.zone}
              </p>
            </div>
            <button type="button" onClick={() => setSelected(null)} aria-label={en ? "Close" : "ปิด"}
              className="-mr-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-faint transition-colors hover:bg-surface">✕</button>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-2xl border border-hairline bg-surface/60 px-3 py-2">
              <div className="font-thai-serif text-2xl font-light tabular-nums text-ink">{selected.tempC}°</div>
              <div className="font-thai text-[0.7rem] text-ink-faint">{en ? "feels-like high" : "ร้อนสุด รู้สึกเหมือน"}</div>
            </div>
            <div className="rounded-2xl border border-hairline bg-surface/60 px-3 py-2">
              <div className="font-thai-serif text-2xl font-light tabular-nums text-ink">{selected.rainProb}%</div>
              <div className="font-thai text-[0.7rem] text-ink-faint">{en ? "rain chance" : "โอกาสฝน"}</div>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <Link href={`/plan?y=${selected.key}&d=${day}`}
              className="flex-1 rounded-full bg-ink px-4 py-2.5 text-center font-thai text-sm font-medium text-paper transition-colors hover:bg-ink-muted">
              {en ? "Plan here" : "วางแผนที่นี่"}
            </Link>
            <a href={mapsDir} target="_blank" rel="noopener noreferrer"
              className="rounded-full border border-ink px-4 py-2.5 font-thai text-sm font-medium text-ink transition-colors hover:bg-ink hover:text-paper">
              {en ? "Directions" : "เส้นทาง"}
            </a>
          </div>
        </div>
      )}

      {/* loading + error states (over the map, never a blank box) */}
      {!areas && !error && (
        <div className="pointer-events-none absolute bottom-9 left-1/2 z-10 -translate-x-1/2 rounded-full bg-paper/90 px-4 py-2 font-thai text-xs text-ink-muted shadow-sm backdrop-blur">
          {en ? "Reading the sky across Thailand…" : "กำลังอ่านฟ้าทั่วไทย…"}
        </div>
      )}
      {error && (
        <div className="absolute bottom-9 left-1/2 z-10 -translate-x-1/2 rounded-2xl border border-hairline bg-paper/95 px-4 py-2.5 text-center font-thai text-xs text-ink-muted shadow-sm backdrop-blur">
          {en ? "Couldn't read the skies right now — try again (we don't guess)." : "อ่านฟ้าไม่ได้ตอนนี้ ลองใหม่อีกที (เราไม่เดาให้)"}
        </div>
      )}

      {/* sky-colour legend + provenance (bottom strip) */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-0 hidden justify-center pb-1 sm:flex">
        <span className="font-thai text-[0.62rem] text-ink-faint/70">
          {en ? `Live sky per area · Open-Meteo · ${date}` : `ฟ้าสดรายพื้นที่ · Open-Meteo · ${date}`}
        </span>
      </div>
    </div>
  );
}
