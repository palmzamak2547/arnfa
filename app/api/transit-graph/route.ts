import { NextRequest, NextResponse } from "next/server";
import {
  TRANSIT_GRAPH_NODES,
  TRANSIT_GRAPH_EDGES,
  nearestGraphStations,
} from "@/lib/data/transitGraph";

/**
 * GET /api/transit-graph
 *
 * Returns the city2graph-generated Bangkok transit network.
 *
 * Query params:
 *   lat, lng, n   — if provided, returns the n nearest stations to the point
 *   type=full     — returns all nodes + edges (for map visualisation)
 *   type=nodes    — only nodes
 *   type=edges    — only edges
 *
 * Default (no params) → type=full
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") ?? "full";

  // Nearest-station query
  const latStr = searchParams.get("lat");
  const lngStr = searchParams.get("lng");
  if (latStr && lngStr) {
    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);
    const n = Math.min(20, Math.max(1, parseInt(searchParams.get("n") ?? "5", 10)));
    if (!isFinite(lat) || !isFinite(lng)) {
      return NextResponse.json({ error: "bad_coords" }, { status: 400 });
    }
    return NextResponse.json(
      { stations: nearestGraphStations(lat, lng, n) },
      { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=172800" } }
    );
  }

  // Corridor sub-graph — the map only ever draws stations within a couple of km of the plan, but
  // the client was pulling the ENTIRE city network (measured 12.5 MB on prod) and discarding ~99%
  // of it in a useMemo. Filtering here keeps the payload proportional to what's actually drawn.
  const nearLat = parseFloat(searchParams.get("nearLat") ?? "");
  const nearLng = parseFloat(searchParams.get("nearLng") ?? "");
  if (isFinite(nearLat) && isFinite(nearLng)) {
    const km = Math.min(25, Math.max(0.5, parseFloat(searchParams.get("km") ?? "6")));
    const dLat = km / 111;
    const dLng = km / (111 * Math.cos((nearLat * Math.PI) / 180) || 1);
    const nodes = TRANSIT_GRAPH_NODES.filter(
      (n) => Math.abs(n.lat - nearLat) <= dLat && Math.abs(n.lng - nearLng) <= dLng,
    );
    const ids = new Set(nodes.map((n) => n.id));
    const edges = TRANSIT_GRAPH_EDGES.filter((e) => ids.has(e.source) && ids.has(e.target));
    return NextResponse.json(
      { nodeCount: nodes.length, edgeCount: edges.length, nodes, edges },
      { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=172800" } },
    );
  }

  // Full graph response
  const body =
    type === "nodes"
      ? { nodeCount: TRANSIT_GRAPH_NODES.length, nodes: TRANSIT_GRAPH_NODES }
      : type === "edges"
      ? { edgeCount: TRANSIT_GRAPH_EDGES.length, edges: TRANSIT_GRAPH_EDGES }
      : {
          nodeCount: TRANSIT_GRAPH_NODES.length,
          edgeCount: TRANSIT_GRAPH_EDGES.length,
          nodes: TRANSIT_GRAPH_NODES,
          edges: TRANSIT_GRAPH_EDGES,
        };

  return NextResponse.json(body, {
    headers: {
      "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=172800",
    },
  });
}
