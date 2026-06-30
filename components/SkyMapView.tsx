"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import Map, { Marker, NavigationControl, ScaleControl, Source, Layer, type MapRef, type MapLayerMouseEvent } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { useLang } from "@/lib/i18n/useLang";
import { ARNFA_MAP_STYLE_URL, ARNFA_LAND, applyArnfaRecolor } from "@/lib/map/arnfaMapStyle";
import { MapDataLayers, MAP_LAYERS, LAYER_GROUPS, type MapLayerKey } from "@/components/MapDataLayers";
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

// Progressive disclosure: how far you must zoom in before each tier's pins fade in. Province
// capitals are always on (the country read); the 50 dense Bangkok เขต appear last — so the
// nationwide view stays calm and the city view gets rich without ever feeling like soup.
const TIER_MINZOOM: Record<string, number> = { province: 0, spot: 6.5, neighborhood: 8, district: 8.8 };

// the 4-swatch sky-verdict key — the legend the map was missing
const LEGEND: SkyVerdict[] = ["clearish", "ok", "closing", "poor"];

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

/** nearest of our forecast areas to a free point (Longdo POI / the user's GPS) — so a searched
 *  place or "where I am" snaps to the area whose live sky verdict we actually have. Returns null
 *  if the point is beyond `maxKm` of every area (e.g. across a border) — we don't claim a verdict
 *  for somewhere outside our coverage (Iron Rule 0). */
function nearestArea(areas: Area[] | null, lat: number, lng: number, maxKm = 70): Area | null {
  if (!areas?.length) return null;
  let best: Area | null = null, bd = Infinity;
  const coslat = Math.cos((lat * Math.PI) / 180);
  for (const a of areas) {
    const dx = (a.lng - lng) * coslat, dy = a.lat - lat;
    const d = dx * dx + dy * dy;
    if (d < bd) { bd = d; best = a; }
  }
  // bd is in squared degrees (equirectangular); ~111 km per degree
  return best && Math.sqrt(bd) * 111 <= maxKm ? best : null;
}

type Poi = { name: string; lat: number; lng: number; type: string; address: string };
type GeoState =
  | { phase: "idle" } | { phase: "consent" } | { phase: "locating" }
  | { phase: "done"; place: string } | { phase: "denied" } | { phase: "unsupported" } | { phase: "error" };

export function SkyMapView() {
  const { en } = useLang();
  const mapRef = useRef<MapRef>(null);
  const reduced = useMemo(prefersReduced, []);
  const dayCache = useRef<Record<number, { areas: Area[]; date: string }>>({}); // prefetched days → instant switch (Map name is the react-map-gl import)
  const didPrefetch = useRef(false);
  const aliveRef = useRef(true); // guards the geolocation flow (GPS can resolve ~12s after unmount)
  useEffect(() => () => { aliveRef.current = false; }, []);
  const [mapCenter, setMapCenter] = useState({ lat: 13.4, lng: 100.9 }); // live viewport centre for the data layers

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
  const [poi, setPoi] = useState<Poi[]>([]);          // Longdo place search results
  const [geo, setGeo] = useState<GeoState>({ phase: "idle" });
  const [here, setHere] = useState<{ lat: number; lng: number } | null>(null); // the user's GPS dot
  const [routeInfo, setRouteInfo] = useState<{ seconds: number; meters: number } | null>(null);
  const toggleLayer = (k: MapLayerKey) => setLayers((p) => { const n = new Set(p); n.has(k) ? n.delete(k) : n.add(k); return n; });

  // Longdo Thai place search — debounced, server-proxied (key stays server-side)
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setPoi([]); return; }
    let cancelled = false;
    const t = setTimeout(() => {
      fetch(`/api/geocode?q=${encodeURIComponent(term)}`)
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((d) => { if (!cancelled) setPoi(Array.isArray(d.results) ? d.results : []); })
        .catch(() => { if (!cancelled) setPoi([]); });
    }, 320);
    return () => { cancelled = true; clearTimeout(t); };
  }, [q]);

  // real per-day ranking — same source as /where + the home pick. A prefetched day shows
  // instantly (no spinner); otherwise fetch once and cache it.
  useEffect(() => {
    const hit = dayCache.current[day];
    setError(false); setSelected(null);
    if (hit) { setAreas(hit.areas); setDate(hit.date); return; }
    let cancelled = false;
    setAreas(null);
    fetch(`/api/where?day=${day}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => { if (!cancelled) { dayCache.current[day] = { areas: d.areas, date: d.date }; setAreas(d.areas); setDate(d.date); } })
      .catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, [day]);

  // once the first day is in, quietly prefetch the rest of the week so the 7-day scrubber
  // sweeps instantly (one pass; cache.has() guards against refetch).
  useEffect(() => {
    if (!areas || didPrefetch.current) return;
    didPrefetch.current = true;
    let cancelled = false;
    (async () => {
      for (let d = 0; d < 7; d++) {
        if (cancelled || dayCache.current[d]) continue;
        try {
          const r = await fetch(`/api/where?day=${d}`);
          if (!r.ok) continue;
          const j = await r.json();
          if (!cancelled) dayCache.current[d] = { areas: j.areas, date: j.date };
        } catch { /* a missed prefetch just falls back to an on-click fetch */ }
      }
    })();
    return () => { cancelled = true; };
  }, [areas]);

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
      // `mark` = a colour-blind-safe shape cue: caution verdicts carry a dark centre dot
      // (closing=1, poor=2) so red/green pins are still distinguishable without relying on hue.
      properties: { key: a.key, color: VCOLOR[a.verdict], tier: a.tier, minzoom: TIER_MINZOOM[a.tier] ?? 8, mark: a.verdict === "poor" ? 2 : a.verdict === "closing" ? 1 : 0 },
      geometry: { type: "Point" as const, coordinates: [a.lng, a.lat] },
    })),
  }), [areas]);

  const flyTo = (a: Area) => {
    const map = mapRef.current?.getMap();
    map?.flyTo({ center: [a.lng, a.lat], zoom: Math.max(map.getZoom(), 10), duration: reduced ? 0 : 900 });
  };
  const selectArea = (a: Area) => { setSelected(a); flyTo(a); };

  // jump to a searched Longdo place, then snap to the nearest area whose verdict we have
  const selectPoi = (p: Poi) => {
    const map = mapRef.current?.getMap();
    map?.flyTo({ center: [p.lng, p.lat], zoom: Math.max(map.getZoom(), 13), duration: reduced ? 0 : 900 });
    const near = nearestArea(areas, p.lat, p.lng);
    if (near) setSelected(near);
    setQ(""); setPoi([]);
  };

  // "where I am" — consent first, then high-accuracy GPS, fly there, reverse-geocode the
  // district (Longdo), and snap to the nearest area's sky verdict. Location is never stored.
  const locate = () => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) { setGeo({ phase: "unsupported" }); return; }
    setGeo({ phase: "locating" });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (!aliveRef.current) return;
        const lat = pos.coords.latitude, lng = pos.coords.longitude;
        setHere({ lat, lng });
        const map = mapRef.current?.getMap();
        map?.flyTo({ center: [lng, lat], zoom: Math.max(map?.getZoom() ?? 0, 12), duration: reduced ? 0 : 900 });
        const near = nearestArea(areas, lat, lng);
        if (near) setSelected(near);
        fetch(`/api/geocode?lat=${lat}&lng=${lng}`)
          .then((r) => (r.ok ? r.json() : Promise.reject()))
          .then((d) => {
            if (!aliveRef.current) return;
            const pl = d.place;
            const label = pl ? [pl.district, pl.province].filter(Boolean).join(" ") : "";
            setGeo({ phase: "done", place: label });
          })
          .catch(() => { if (aliveRef.current) setGeo({ phase: "done", place: "" }); });
      },
      (err) => { if (aliveRef.current) setGeo({ phase: err.code === err.PERMISSION_DENIED ? "denied" : "error" }); },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 },
    );
  };

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

  // traffic-aware drive time from the user's location to the selected area (Longdo routing)
  useEffect(() => {
    if (!selected || !here) { setRouteInfo(null); return; }
    let cancelled = false;
    setRouteInfo(null);
    fetch(`/api/route-time?flon=${here.lng}&flat=${here.lat}&tlon=${selected.lng}&tlat=${selected.lat}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => { if (!cancelled && d.ok) setRouteInfo({ seconds: d.seconds, meters: d.meters }); })
      .catch(() => { if (!cancelled) setRouteInfo(null); });
    return () => { cancelled = true; };
  }, [selected, here]);

  const clearest = areas?.[0] ?? null;
  const worst = areas && areas.length > 1 ? areas[areas.length - 1] : null; // areas come ranked best→worst
  const topGood = !!clearest && (clearest.verdict === "clearish" || clearest.verdict === "ok"); // honest "clearest" vs "best of a wet day"
  const dl = day === 0 ? (en ? "today" : "วันนี้") : day === 1 ? (en ? "tomorrow" : "พรุ่งนี้") : dayLabel(day, en); // day-aware label (no "today/live" on a future day)
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
        onMoveEnd={(e) => { const c = e.target.getCenter(); setMapCenter({ lat: Math.round(c.lat * 100) / 100, lng: Math.round(c.lng * 100) / 100 }); }}
        onLoad={(e) => applyArnfaRecolor(e.target as unknown as Parameters<typeof applyArnfaRecolor>[0])}
        onStyleData={(e) => {
          const m = e.target as unknown as Parameters<typeof applyArnfaRecolor>[0] & { getPaintProperty?: (l: string, p: string) => unknown };
          try { if (m.getPaintProperty?.("background", "background-color") !== ARNFA_LAND) applyArnfaRecolor(m); } catch { /* not ready */ }
        }}
        onError={(e) => { if (/webgl|context|style/i.test(String(e?.error?.message || ""))) setMapError(true); }}
      >
        <NavigationControl position="top-right" showCompass={false} />
        <ScaleControl position="bottom-left" maxWidth={96} unit="metric" />

        <MapDataLayers center={mapCenter} active={layers} routePresent={false} en={en} underId={areas ? "sky-pins" : undefined} />

        {/* the live sky pins — one per area, coloured by verdict (data-driven circle layer) */}
        {areas && (
          <Source id="sky-areas" type="geojson" data={geojson}>
            <Layer
              id="sky-pins"
              type="circle"
              paint={{
                // zoom is the top-level interpolate input (style-spec rule); the per-tier sizing
                // and per-tier reveal live in the OUTPUTS so province pins read larger and the
                // dense district pins fade in only once you zoom into the city.
                "circle-radius": ["interpolate", ["linear"], ["zoom"],
                  5, ["match", ["get", "tier"], "province", 4, "spot", 3.6, 3.2],
                  12, ["match", ["get", "tier"], "province", 10.8, "spot", 9.9, 9]],
                "circle-color": ["get", "color"],
                "circle-stroke-width": 1.4,
                "circle-stroke-color": "#ffffff",
                // each pin is hidden until the zoom passes its tier's reveal point (a feature
                // `minzoom` prop) — the literal stop-zooms are compared to it, so no zoom nesting.
                "circle-opacity": ["interpolate", ["linear"], ["zoom"],
                  5, ["case", [">=", 5, ["get", "minzoom"]], 0.92, 0],
                  6.5, ["case", [">=", 6.5, ["get", "minzoom"]], 0.92, 0],
                  8, ["case", [">=", 8, ["get", "minzoom"]], 0.92, 0],
                  8.8, ["case", [">=", 8.8, ["get", "minzoom"]], 0.92, 0]],
                "circle-stroke-opacity": ["interpolate", ["linear"], ["zoom"],
                  5, ["case", [">=", 5, ["get", "minzoom"]], 1, 0],
                  6.5, ["case", [">=", 6.5, ["get", "minzoom"]], 1, 0],
                  8, ["case", [">=", 8, ["get", "minzoom"]], 1, 0],
                  8.8, ["case", [">=", 8.8, ["get", "minzoom"]], 1, 0]],
              }}
            />
            {/* colour-blind aid: a dark centre dot on caution pins (closing/poor) so the verdict
                reads by SHAPE, not hue alone — fades in with the pins via the same minzoom gate */}
            <Layer
              id="sky-pins-mark"
              type="circle"
              paint={{
                "circle-radius": ["interpolate", ["linear"], ["zoom"],
                  5, ["match", ["get", "mark"], 2, 1.5, 1, 1, 0],
                  12, ["match", ["get", "mark"], 2, 3.2, 1, 2.1, 0]],
                "circle-color": "#23272F",
                "circle-opacity": ["interpolate", ["linear"], ["zoom"],
                  5, ["case", [">=", 5, ["get", "minzoom"]], 0.9, 0],
                  6.5, ["case", [">=", 6.5, ["get", "minzoom"]], 0.9, 0],
                  8, ["case", [">=", 8, ["get", "minzoom"]], 0.9, 0],
                  8.8, ["case", [">=", 8.8, ["get", "minzoom"]], 0.9, 0]],
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

        {/* the user's live location (opt-in) */}
        {here && (
          <Marker longitude={here.lng} latitude={here.lat} anchor="center">
            <span aria-label={en ? "You are here" : "ตำแหน่งของคุณ"} className="block h-3.5 w-3.5 rounded-full bg-[#2F6FB3] ring-[3px] ring-white shadow-[0_0_0_6px_rgba(47,111,179,0.18)]" />
          </Marker>
        )}
      </Map>

      {/* ── top bar: country verdict banner + search + day selector ───────── */}
      <div className="pointer-events-none absolute inset-x-0 top-3 z-10 flex flex-col items-center gap-2 px-3">
        {clearest && !selected && (
          <div className="pointer-events-none max-w-[94%] truncate rounded-full bg-ink/85 px-3.5 py-1 font-thai text-[0.72rem] text-paper shadow-sm backdrop-blur">
            {topGood ? (en ? `Clearest ${dl} ` : `ฟ้าโปร่งสุด${dl} `) : (en ? `Best ${dl} ` : `ฟ้าดีสุด${dl} `)}
            <span className="font-medium">{en ? clearest.en : clearest.th}</span>
            {worst && <span className="opacity-70">{en ? ` — avoid ${worst.en}` : ` — เลี่ยง ${worst.th}`}</span>}
          </div>
        )}
        <div className="pointer-events-auto relative w-full max-w-md">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={en ? "Search an area…" : "ค้นหาพื้นที่…"}
            aria-label={en ? "Search area" : "ค้นหาพื้นที่"}
            className="w-full rounded-full border border-hairline bg-paper/90 px-5 py-2.5 font-thai text-sm text-ink shadow-sm backdrop-blur outline-none placeholder:text-ink-faint focus:border-sun"
          />
          {(matches.length > 0 || poi.length > 0) && (
            <div className="absolute inset-x-0 top-12 max-h-72 overflow-y-auto rounded-2xl border border-hairline bg-paper/95 p-1 shadow-md backdrop-blur">
              {matches.length > 0 && (
                <ul>
                  {matches.map((a) => (
                    <li key={a.key}>
                      <button type="button" onClick={() => { selectArea(a); setQ(""); setPoi([]); }}
                        className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left font-thai text-sm text-ink transition-colors hover:bg-surface">
                        <span className="flex items-center gap-2 truncate">
                          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: VCOLOR[a.verdict] }} aria-hidden />
                          <span className="truncate">{en ? a.en : a.th}</span>
                        </span>
                        <span className="shrink-0 text-xs text-ink-faint tabular-nums">{a.tempC}° {en ? `${a.rainProb}% rain` : `ฝน ${a.rainProb}%`}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {poi.length > 0 && (
                <>
                  <p className="px-3 pb-1 pt-2 font-thai text-[0.62rem] uppercase tracking-wide text-ink-faint">{en ? "Places in Thailand" : "สถานที่ในไทย"}</p>
                  <ul>
                    {poi.map((p, i) => (
                      <li key={`poi-${i}`}>
                        <button type="button" onClick={() => selectPoi(p)}
                          className="flex w-full items-start gap-2 rounded-xl px-3 py-2 text-left font-thai text-sm text-ink transition-colors hover:bg-surface">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" className="mt-0.5 shrink-0 text-ink-faint" aria-hidden><path d="M12 21s-6-5.2-6-10a6 6 0 1 1 12 0c0 4.8-6 10-6 10Z" stroke="currentColor" strokeWidth="1.6" /><circle cx="12" cy="11" r="2" stroke="currentColor" strokeWidth="1.6" /></svg>
                          <span className="min-w-0">
                            <span className="block truncate">{p.name}</span>
                            {p.address && <span className="block truncate text-[0.7rem] text-ink-faint">{p.address}</span>}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
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

      {/* ── bottom-left: sky-verdict legend (the key) + clearest-now chip ──── */}
      <div className={clsx("absolute bottom-9 left-3 z-10 flex flex-col items-start gap-1.5", selected && "max-sm:hidden")}>
        {clearest && !selected && (
          <button type="button" onClick={() => selectArea(clearest)}
            className="flex items-center gap-2 rounded-full border border-hairline bg-paper/92 px-3.5 py-2 text-left font-thai text-xs shadow-sm backdrop-blur transition-colors hover:bg-surface">
            <span className="h-2.5 w-2.5 rounded-full ring-1 ring-white" style={{ background: VCOLOR[clearest.verdict] }} aria-hidden />
            <span className="text-ink-muted">{day === 0 ? (en ? "Clearest now" : "ฟ้าดีสุดตอนนี้") : (en ? `Best ${dl}` : `ฟ้าดีสุด${dl}`)}</span>
            <span className="font-medium text-ink">{en ? clearest.en : clearest.th}</span>
            <span className="text-ink-faint tabular-nums">{clearest.tempC}°</span>
          </button>
        )}
        {areas && (
          <div className="pointer-events-none flex flex-wrap items-center gap-x-2.5 gap-y-1 rounded-2xl border border-hairline bg-paper/90 px-3 py-1.5 shadow-sm backdrop-blur">
            {LEGEND.map((v) => (
              <span key={v} className="flex items-center gap-1 font-thai text-[0.62rem] text-ink-muted">
                <span className="relative flex h-2.5 w-2.5 items-center justify-center rounded-full ring-1 ring-white" style={{ background: VCOLOR[v] }} aria-hidden>
                  {(v === "closing" || v === "poor") && <span className="h-1 w-1 rounded-full bg-[#23272F]" />}
                </span>
                {en ? SKY_VERDICT_EN[v] : SKY_VERDICT_TH[v]}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── location: consent → accurate GPS → your district + nearest verdict ─ */}
      <div className="absolute right-2 top-[84px] z-10 flex flex-col items-end gap-1.5">
        <button type="button"
          onClick={() => setGeo((g) => (g.phase === "consent" ? { phase: "idle" } : g.phase === "locating" ? g : { phase: "consent" }))}
          aria-label={en ? "My location" : "ตำแหน่งของฉัน"} title={en ? "My location" : "ตำแหน่งของฉัน"}
          className={clsx("flex h-9 w-9 items-center justify-center rounded-full border border-hairline shadow-sm backdrop-blur transition-colors",
            here ? "bg-ink text-paper" : "bg-paper/90 text-ink-muted hover:bg-surface")}>
          {geo.phase === "locating"
            ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />
            : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden><circle cx="12" cy="12" r="3.2" stroke="currentColor" strokeWidth="1.7" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>}
        </button>
        {geo.phase === "consent" && (
          <div className="w-60 rounded-2xl border border-hairline bg-paper/95 p-3 shadow-md backdrop-blur">
            <p className="font-thai text-xs leading-relaxed text-ink">{en ? "Use your location to read the sky right where you are? Arnfah never stores it." : "ใช้ตำแหน่งของคุณเพื่ออ่านฟ้าตรงที่คุณอยู่ไหม อ่านฟ้าไม่เก็บตำแหน่งไว้"}</p>
            <div className="mt-2.5 flex gap-2">
              <button type="button" onClick={locate} className="flex-1 rounded-full bg-ink px-3 py-1.5 font-thai text-xs text-paper transition-colors hover:bg-ink-muted">{en ? "Allow" : "อนุญาต"}</button>
              <button type="button" onClick={() => setGeo({ phase: "idle" })} className="rounded-full border border-hairline px-3 py-1.5 font-thai text-xs text-ink-muted transition-colors hover:bg-surface">{en ? "Not now" : "ไว้ก่อน"}</button>
            </div>
          </div>
        )}
        {geo.phase === "done" && geo.place && (
          <div className="max-w-[15rem] rounded-full border border-hairline bg-paper/92 px-3 py-1.5 font-thai text-[0.72rem] text-ink shadow-sm backdrop-blur">
            {en ? "You're near " : "คุณอยู่แถว "}<span className="font-medium">{geo.place}</span>
          </div>
        )}
        {(geo.phase === "denied" || geo.phase === "unsupported" || geo.phase === "error") && (
          <div className="max-w-[15rem] rounded-2xl border border-hairline bg-paper/95 px-3 py-1.5 text-right font-thai text-[0.72rem] text-ink-muted shadow-sm backdrop-blur">
            {geo.phase === "denied"
              ? (en ? "Location is off — allow it in your browser to use this." : "ตำแหน่งถูกปิดอยู่ เปิดในเบราว์เซอร์เพื่อใช้งาน")
              : geo.phase === "unsupported"
              ? (en ? "This device can't share location." : "อุปกรณ์นี้แชร์ตำแหน่งไม่ได้")
              : (en ? "Couldn't get your location — try again." : "หาตำแหน่งไม่ได้ ลองอีกครั้ง")}
          </div>
        )}
      </div>

      {/* ── layers toggle (bottom-right, reuses the /plan overlays) ───────── */}
      <div className={clsx("absolute bottom-9 right-2 z-10 flex flex-col items-end gap-1.5", selected && "max-sm:hidden")}>
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
                        className={clsx("flex w-full items-center gap-2 rounded-xl px-2.5 py-1 font-thai text-xs transition-colors", on ? "bg-ink text-paper" : "text-ink-muted hover:bg-surface")}>
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
                {en ? SKY_VERDICT_EN[selected.verdict] : SKY_VERDICT_TH[selected.verdict]} — {selected.zone}
              </p>
            </div>
            <button type="button" onClick={() => setSelected(null)} aria-label={en ? "Close" : "ปิด"}
              className="-mr-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-faint transition-colors hover:bg-surface">✕</button>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-2xl border border-hairline bg-surface/60 px-3 py-2">
              <div className="font-thai-serif text-2xl font-light tabular-nums text-ink">{selected.tempC}°</div>
              <div className="font-thai text-[0.7rem] text-ink-faint">{en ? "high" : "อุณหภูมิสูงสุด"}</div>
            </div>
            <div className="rounded-2xl border border-hairline bg-surface/60 px-3 py-2">
              <div className="font-thai-serif text-2xl font-light tabular-nums text-ink">{selected.rainProb}%</div>
              <div className="font-thai text-[0.7rem] text-ink-faint">{en ? "rain chance" : "โอกาสฝน"}</div>
            </div>
          </div>
          {routeInfo && (
            <div className="mt-3 flex items-center gap-2 rounded-2xl border border-hairline bg-surface/50 px-3 py-2 font-thai text-xs text-ink">
              <span aria-hidden>🚗</span>
              <span>{en ? "From you " : "จากตำแหน่งคุณ "}<span className="font-medium tabular-nums">~{Math.round(routeInfo.seconds / 60)} {en ? "min" : "นาที"}</span> <span className="text-ink-faint">({(routeInfo.meters / 1000).toFixed(1)} {en ? "km" : "กม."})</span></span>
              <span className="ml-auto text-[0.62rem] text-ink-faint">{en ? "live traffic" : "ตามจราจรสด"}</span>
            </div>
          )}
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
          {day === 0
            ? (en ? `Live sky per area — Open-Meteo, ${date}` : `ฟ้าสดรายพื้นที่ จาก Open-Meteo ${date}`)
            : (en ? `Forecast for ${date} — Open-Meteo` : `พยากรณ์ ${date} จาก Open-Meteo`)}
        </span>
      </div>
    </div>
  );
}
