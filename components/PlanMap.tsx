"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Map, { Marker, NavigationControl, Source, Layer, type MapRef } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import type { EnrichedStop } from "@/lib/plan/buildPlan";
import type { SkyState } from "./SkyChip";

/**
 * PlanMap — MapLibre + OpenFreeMap liberty. The route is animated:
 *   - a dashed walking line draws ON between stops in order (interaction research #5)
 *   - markers drop in staggered, sky-tinted
 *   - the map flies to fit the plan when stops change
 * Reduced-motion: the full line + markers render instantly (no draw/fly).
 * Spec: 03-data-sources § OpenFreeMap + interaction research.
 */

const STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";

const SKY_COLOR: Record<SkyState, string> = {
  clear: "#F2A65A", partly: "#7BA68A", cloudy: "#4B5263", rain: "#5B7FB8", storm: "#D9534A", night: "#4A5878",
};

function prefersReduced(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

export function PlanMap({ stops, center }: { stops: EnrichedStop[]; center: { lat: number; lng: number } }) {
  const mapRef = useRef<MapRef>(null);
  const reduced = useMemo(prefersReduced, []);
  const initialView = useMemo(() => ({ longitude: center.lng, latitude: center.lat, zoom: 13.5 }), [center]);

  // The full ordered path through the stops.
  const fullPath = useMemo(
    () => stops.map((s) => [s.poi.lng, s.poi.lat] as [number, number]),
    [stops],
  );

  // How many points of the path are currently revealed (animates 0 → full).
  const [revealed, setRevealed] = useState(reduced ? fullPath.length : 0);
  const [shownMarkers, setShownMarkers] = useState(reduced ? stops.length : 0);

  // Re-run the draw-on whenever the set of stops changes.
  useEffect(() => {
    if (reduced) {
      setRevealed(fullPath.length);
      setShownMarkers(stops.length);
      return;
    }
    setRevealed(0);
    setShownMarkers(0);
    let raf = 0;
    let i = 0;
    const stepMarker = () => {
      i++;
      setShownMarkers(i);
      if (i < stops.length) raf = window.setTimeout(stepMarker, 140) as unknown as number;
    };
    // markers drop first (staggered), then the line draws through them
    const markerTimer = window.setTimeout(stepMarker, 200);

    let p = 0;
    const drawTimer = window.setTimeout(function grow() {
      p++;
      setRevealed(p);
      if (p < fullPath.length) raf = window.setTimeout(grow, 220) as unknown as number;
    }, 200 + stops.length * 140);

    return () => { window.clearTimeout(markerTimer); window.clearTimeout(drawTimer); window.clearTimeout(raf); };
  }, [fullPath, stops.length, reduced]);

  // Fly to fit all stops when they change.
  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map || fullPath.length === 0) return;
    let minLng = 999, minLat = 999, maxLng = -999, maxLat = -999;
    for (const [lng, lat] of fullPath) {
      minLng = Math.min(minLng, lng); maxLng = Math.max(maxLng, lng);
      minLat = Math.min(minLat, lat); maxLat = Math.max(maxLat, lat);
    }
    map.fitBounds([[minLng, minLat], [maxLng, maxLat]], {
      padding: 56, maxZoom: 15.5, duration: reduced ? 0 : 1100,
    });
  }, [fullPath, reduced]);

  const lineGeoJSON = useMemo(
    () => ({
      type: "Feature" as const,
      properties: {},
      geometry: { type: "LineString" as const, coordinates: fullPath.slice(0, Math.max(2, revealed)) },
    }),
    [fullPath, revealed],
  );

  return (
    <div className="h-full w-full overflow-hidden rounded-3xl border border-hairline">
      <Map ref={mapRef} initialViewState={initialView} mapStyle={STYLE_URL} attributionControl={{ compact: true }} style={{ width: "100%", height: "100%" }}>
        <NavigationControl position="top-right" showCompass={false} />

        {fullPath.length >= 2 && revealed >= 2 && (
          <Source id="route" type="geojson" data={lineGeoJSON}>
            <Layer
              id="route-line"
              type="line"
              layout={{ "line-cap": "round", "line-join": "round" }}
              paint={{ "line-color": "#1A1F2B", "line-width": 2.5, "line-dasharray": [1.5, 1.2], "line-opacity": 0.55 }}
            />
          </Source>
        )}

        {stops.slice(0, shownMarkers).map((stop, i) => (
          <Marker key={stop.poi.id} longitude={stop.poi.lng} latitude={stop.poi.lat} anchor="bottom">
            <div
              className="flex flex-col items-center"
              title={stop.poi.name}
              style={reduced ? undefined : { animation: "arnfa-drop 0.5s cubic-bezier(0.22,1,0.36,1) both" }}
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold text-white shadow-md ring-2 ring-white" style={{ background: SKY_COLOR[stop.skyState] }}>
                {i + 1}
              </div>
              <div className="h-2 w-2 -mt-1 rotate-45" style={{ background: SKY_COLOR[stop.skyState] }} />
            </div>
          </Marker>
        ))}
      </Map>
    </div>
  );
}
