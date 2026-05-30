"use client";

import { useMemo, useRef } from "react";
import Map, { Marker, NavigationControl, type MapRef } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import type { EnrichedStop } from "@/lib/plan/buildPlan";
import type { SkyState } from "./SkyChip";

/** PlanMap — MapLibre + OpenFreeMap liberty. Markers tinted by sky state. Spec: 03-data-sources § OpenFreeMap */

const STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";

const SKY_COLOR: Record<SkyState, string> = {
  clear: "#F2A65A", partly: "#7BA68A", cloudy: "#4B5263", rain: "#5B7FB8", storm: "#D9534A", night: "#4A5878",
};

export function PlanMap({ stops, center }: { stops: EnrichedStop[]; center: { lat: number; lng: number } }) {
  const mapRef = useRef<MapRef>(null);
  const initialView = useMemo(() => ({ longitude: center.lng, latitude: center.lat, zoom: 14 }), [center]);

  return (
    <div className="h-full w-full overflow-hidden rounded-3xl border border-hairline">
      <Map ref={mapRef} initialViewState={initialView} mapStyle={STYLE_URL} attributionControl={{ compact: true }} style={{ width: "100%", height: "100%" }}>
        <NavigationControl position="top-right" showCompass={false} />
        {stops.map((stop, i) => (
          <Marker key={stop.poi.id} longitude={stop.poi.lng} latitude={stop.poi.lat} anchor="bottom">
            <div className="flex flex-col items-center" title={stop.poi.name}>
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
