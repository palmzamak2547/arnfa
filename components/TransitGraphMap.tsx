"use client";

import { useEffect, useRef, useState } from "react";
import { useLang } from "@/lib/i18n/useLang";
import type { TransitGraphNode, TransitGraphEdge } from "@/lib/data/transitGraph";

type GraphData = {
  nodes: TransitGraphNode[];
  edges: TransitGraphEdge[];
  nodeCount: number;
  edgeCount: number;
};

const SYSTEM_COLORS: Record<string, string> = {
  BTS: "#3aa537",
  MRT: "#1964B7",
  ARL: "#C8102E",
  SRT: "#A6192E",
  BRT: "#F97316",
  OTHER: "#6B7280",
};

/**
 * TransitGraphMap — visualises the city2graph-generated Bangkok transit network.
 *
 * Uses maplibre-gl (already a dependency) to render nodes as coloured circles
 * and edges as lines on an interactive map.
 */
export function TransitGraphMap({
  lat = 13.7563,
  lng = 100.5018,
}: {
  lat?: number;
  lng?: number;
}) {
  const { en } = useLang();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<unknown>(null);
  const [graph, setGraph] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<TransitGraphNode | null>(null);

  // Fetch the transit graph from /api/transit-graph
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch("/api/transit-graph")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d: GraphData) => {
        if (!cancelled) {
          setGraph(d);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load graph");
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Initialise maplibre-gl once graph data is available
  useEffect(() => {
    if (!graph || !mapContainerRef.current || mapRef.current) return;

    // Dynamic import avoids SSR issues
    import("maplibre-gl").then((ml) => {
      const maplibregl = ml.default ?? ml;
      const map = new (maplibregl as unknown as { Map: new (opts: unknown) => unknown }).Map({
        container: mapContainerRef.current!,
        style: {
          version: 8,
          sources: {
            osm: {
              type: "raster",
              tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
              tileSize: 256,
              attribution: "&copy; OpenStreetMap contributors",
            },
          },
          layers: [{ id: "osm", type: "raster", source: "osm" }],
        },
        center: [lng, lat],
        zoom: 11,
      }) as {
        on: (event: string, handler: unknown) => void;
        addSource: (id: string, source: unknown) => void;
        addLayer: (layer: unknown) => void;
        getSource: (id: string) => unknown;
        remove: () => void;
        queryRenderedFeatures: (point: unknown, opts: unknown) => unknown[];
        getCanvas: () => HTMLCanvasElement;
      };
      mapRef.current = map;

      map.on("load", () => {
        // Build GeoJSON from graph data
        const nodeIndex = new Map(graph.nodes.map((n) => [n.id, n]));

        // Edges layer
        const edgeFeatures = graph.edges
          .map((e) => {
            const s = nodeIndex.get(e.source);
            const t = nodeIndex.get(e.target);
            if (!s || !t) return null;
            return {
              type: "Feature" as const,
              geometry: {
                type: "LineString" as const,
                coordinates: [
                  [s.lng, s.lat],
                  [t.lng, t.lat],
                ],
              },
              properties: { system: e.system, distanceKm: e.distanceKm },
            };
          })
          .filter(Boolean);

        map.addSource("transit-edges", {
          type: "geojson",
          data: { type: "FeatureCollection", features: edgeFeatures },
        });

        map.addLayer({
          id: "transit-edges-layer",
          type: "line",
          source: "transit-edges",
          paint: {
            "line-color": [
              "match",
              ["get", "system"],
              "BTS", "#3aa537",
              "MRT", "#1964B7",
              "ARL", "#C8102E",
              "SRT", "#A6192E",
              "BRT", "#F97316",
              "#6B7280",
            ],
            "line-width": 1.5,
            "line-opacity": 0.6,
          },
        });

        // Nodes layer
        const nodeFeatures = graph.nodes.map((n) => ({
          type: "Feature" as const,
          geometry: { type: "Point" as const, coordinates: [n.lng, n.lat] },
          properties: {
            id: n.id,
            nameEn: n.nameEn,
            nameTh: n.nameTh,
            system: n.system,
            color: SYSTEM_COLORS[n.system] ?? "#6B7280",
            degree: n.degree ?? 1,
          },
        }));

        map.addSource("transit-nodes", {
          type: "geojson",
          data: { type: "FeatureCollection", features: nodeFeatures },
        });

        map.addLayer({
          id: "transit-nodes-layer",
          type: "circle",
          source: "transit-nodes",
          paint: {
            "circle-color": ["get", "color"],
            "circle-radius": [
              "interpolate", ["linear"], ["zoom"],
              10, 3,
              14, 6,
            ],
            "circle-stroke-width": 1,
            "circle-stroke-color": "#ffffff",
            "circle-opacity": 0.9,
          },
        });

        // Click handler
        map.on("click", "transit-nodes-layer", (e: unknown) => {
          const ev = e as { features?: Array<{ properties: Record<string, unknown> }> };
          if (!ev.features || ev.features.length === 0) return;
          const props = ev.features[0].properties;
          setSelectedNode({
            id: String(props.id),
            nameEn: String(props.nameEn ?? ""),
            nameTh: String(props.nameTh ?? ""),
            system: String(props.system ?? ""),
            color: String(props.color ?? "#6B7280"),
            lat: 0, lng: 0, source: "osm",
          });
        });

        map.getCanvas().style.cursor = "";
        map.on("mouseenter", "transit-nodes-layer", () => {
          map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", "transit-nodes-layer", () => {
          map.getCanvas().style.cursor = "";
        });
      });
    });

    return () => {
      if (mapRef.current) {
        (mapRef.current as { remove: () => void }).remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graph]);

  // System legend
  const systems = graph
    ? Array.from(new Set(graph.nodes.map((n) => n.system))).filter((s) => s !== "OTHER")
    : [];

  return (
    <section className="rounded-3xl border border-hairline bg-surface/70 overflow-hidden">
      {/* Header */}
      <div className="flex items-baseline justify-between gap-3 p-5 pb-3">
        <div>
          <h3 className="font-thai-serif text-lg font-light text-ink">
            {en ? "Bangkok Transit Network" : "โครงข่ายขนส่งกรุงเทพฯ"}
          </h3>
          <p className="font-thai text-xs text-ink-faint mt-0.5">
            {en ? "Built with city2graph + OSMnx" : "สร้างด้วย city2graph + OSMnx"}
          </p>
        </div>
        {graph && (
          <div className="text-right">
            <span className="font-display text-sm font-semibold text-ink">
              {graph.nodeCount.toLocaleString()}
            </span>
            <span className="font-thai text-xs text-ink-faint ml-1">
              {en ? "stations" : "สถานี"}
            </span>
          </div>
        )}
      </div>

      {/* System legend */}
      {systems.length > 0 && (
        <div className="flex flex-wrap gap-2 px-5 pb-3">
          {systems.map((sys) => (
            <span
              key={sys}
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[0.65rem] font-semibold text-white"
              style={{ background: SYSTEM_COLORS[sys] ?? "#6B7280" }}
            >
              {sys}
            </span>
          ))}
        </div>
      )}

      {/* Map container */}
      <div className="relative h-72 sm:h-96 w-full">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-surface/80 z-10">
            <div className="flex flex-col items-center gap-2">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-rain border-t-transparent" />
              <p className="font-thai text-xs text-ink-muted">
                {en ? "Loading transit graph…" : "กำลังโหลดกราฟขนส่ง…"}
              </p>
            </div>
          </div>
        )}
        {error && !loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-surface/80 z-10">
            <div className="text-center px-6">
              <p className="font-thai text-sm text-ink-muted mb-2">
                {en ? "Transit graph not available yet." : "ยังไม่มีข้อมูลกราฟขนส่ง"}
              </p>
              <p className="font-thai text-xs text-ink-faint">
                {en
                  ? "Run: npm run build:graph"
                  : "รัน: npm run build:graph เพื่อสร้างข้อมูล"}
              </p>
            </div>
          </div>
        )}
        <div ref={mapContainerRef} className="h-full w-full" />

        {/* Selected station info bubble */}
        {selectedNode && (
          <div className="absolute bottom-4 left-4 right-4 z-10 rounded-xl border border-hairline bg-paper/95 backdrop-blur-sm p-3 shadow-lg">
            <div className="flex items-center gap-2">
              <span
                className="shrink-0 rounded px-1.5 py-0.5 text-[0.6rem] font-semibold text-white"
                style={{ background: SYSTEM_COLORS[selectedNode.system] ?? "#6B7280" }}
              >
                {selectedNode.system}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-thai text-sm font-medium text-ink truncate">
                  {en ? selectedNode.nameEn || selectedNode.nameTh : selectedNode.nameTh || selectedNode.nameEn}
                </p>
                {selectedNode.nameEn && selectedNode.nameTh && (
                  <p className="font-thai text-xs text-ink-faint truncate">
                    {en ? selectedNode.nameTh : selectedNode.nameEn}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSelectedNode(null)}
                className="shrink-0 text-ink-faint hover:text-ink text-lg leading-none"
              >
                ×
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-hairline">
        <p className="font-thai text-[0.7rem] text-ink-faint">
          {en
            ? "Data from OpenStreetMap · Graph built with city2graph"
            : "ข้อมูลจาก OpenStreetMap · กราฟสร้างด้วย city2graph"}
        </p>
      </div>
    </section>
  );
}
