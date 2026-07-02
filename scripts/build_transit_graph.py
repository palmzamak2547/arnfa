#!/usr/bin/env python3
"""
build_transit_graph.py
======================
Uses city2graph + osmnx to build a Bangkok public-transit network graph,
then exports two static snapshots that arnfa's front-end reads:

  lib/data/transitGraph.nodes.json  — stations with lat/lng/system/name
  lib/data/transitGraph.edges.json  — connections between stations

Run once (locally) whenever you need to refresh the transit data:

    python3 scripts/build_transit_graph.py

The script also merges the supplementary SRT dataset (from Downloads) if it
contains any records with coordinates.

Requirements (already installed):
    pip install city2graph osmnx geopandas networkx
"""

from __future__ import annotations

import json
import math
import sys
from pathlib import Path

# ── paths ────────────────────────────────────────────────────────────────────
REPO_ROOT = Path(__file__).parent.parent
OUT_NODES = REPO_ROOT / "lib" / "data" / "transitGraph.nodes.json"
OUT_EDGES = REPO_ROOT / "lib" / "data" / "transitGraph.edges.json"
DATASET_PATH = Path.home() / "Downloads" / "dataset_thailand-transit-scraper_2026-07-02_04-43-47-084.json"

# ── Bangkok bounding box (Overture / OSM style: min_lon, min_lat, max_lon, max_lat) ─
BKK_BBOX = [100.33, 13.49, 100.94, 13.96]

# ── OSM transit tags we care about ───────────────────────────────────────────
SYSTEM_COLORS: dict[str, str] = {
    "BTS": "#3aa537",
    "MRT": "#1964B7",
    "ARL": "#C8102E",
    "SRT": "#A6192E",
    "BRT": "#F97316",
}

def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = math.sin(d_lat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(d_lon / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


def fetch_osm_transit() -> list[dict]:
    """Download Bangkok rail/bus rapid transit stations from OSM via osmnx."""
    try:
        import osmnx as ox
        ox.settings.log_console = False

        print("Fetching OSM transit nodes for Bangkok…")
        tags = {
            "public_transport": ["stop_position", "station", "halt"],
            "railway": ["station", "halt", "tram_stop"],
            "station": ["subway", "light_rail"],
        }
        # New osmnx API: bbox = (left, bottom, right, top)
        gdf = ox.features_from_bbox(
            bbox=(BKK_BBOX[0], BKK_BBOX[1], BKK_BBOX[2], BKK_BBOX[3]),
            tags=tags,
        )

        stations: list[dict] = []
        for idx, row in gdf.iterrows():
            geom = row.geometry
            # Only point features have a clear centroid
            if geom is None:
                continue
            centroid = geom.centroid if geom.geom_type != "Point" else geom
            lat, lng = round(centroid.y, 6), round(centroid.x, 6)
            if not (-90 <= lat <= 90 and -180 <= lng <= 180):
                continue

            name_en = str(row.get("name:en") or row.get("name") or "")
            name_th = str(row.get("name:th") or "")

            # Guess the transit system from tags
            network = str(row.get("network") or row.get("operator") or "")
            system = _guess_system(network, name_en)

            stations.append({
                "id": str(idx),
                "lat": lat,
                "lng": lng,
                "nameEn": name_en,
                "nameTh": name_th,
                "system": system,
                "color": SYSTEM_COLORS.get(system, "#6B7280"),
                "source": "osm",
            })

        print(f"  → {len(stations)} OSM transit nodes")
        return stations

    except Exception as e:
        print(f"  ⚠ OSM fetch failed: {e}", file=sys.stderr)
        return []


def _guess_system(network: str, name: str) -> str:
    text = (network + " " + name).upper()
    if "BTS" in text or "SKYTRAIN" in text:
        return "BTS"
    if "MRT" in text or "METRO" in text or "SUBWAY" in text:
        return "MRT"
    if "ARL" in text or "AIRPORT" in text or "SUVARNABHUMI" in text:
        return "ARL"
    if "BRT" in text:
        return "BRT"
    if "SRT" in text or "RED LINE" in text or "RAILWAYS" in text:
        return "SRT"
    return "OTHER"


def load_supplementary_srt() -> list[dict]:
    """Load the downloaded SRT dataset — only records that have coordinates."""
    if not DATASET_PATH.exists():
        print(f"  ℹ Supplementary dataset not found at {DATASET_PATH}, skipping.")
        return []
    with DATASET_PATH.open() as f:
        raw: list[dict] = json.load(f)
    stations = []
    for r in raw:
        if not r.get("latitude") or not r.get("longitude"):
            continue  # skip records without coords (currently all 15 are null)
        stations.append({
            "id": f"srt-{r['station_key']}",
            "lat": float(r["latitude"]),
            "lng": float(r["longitude"]),
            "nameEn": r.get("station_name_en") or "",
            "nameTh": r.get("station_name_th") or "",
            "system": "SRT",
            "color": SYSTEM_COLORS["SRT"],
            "line": r.get("line") or "",
            "source": "srt-scraper",
        })
    print(f"  → {len(stations)} SRT stations from supplementary dataset (with coords)")
    return stations


def build_edges(nodes: list[dict], max_km: float = 2.5) -> list[dict]:
    """
    Connect stations that are within max_km of each other AND share the same
    transit system. This is a simple proximity graph — good enough for a visual
    network and for GNN experiments with city2graph.
    """
    edges: list[dict] = []
    by_system: dict[str, list[dict]] = {}
    for n in nodes:
        by_system.setdefault(n["system"], []).append(n)

    for system, stn_list in by_system.items():
        for i, a in enumerate(stn_list):
            for b in stn_list[i + 1:]:
                d = haversine_km(a["lat"], a["lng"], b["lat"], b["lng"])
                if d <= max_km:
                    edges.append({
                        "source": a["id"],
                        "target": b["id"],
                        "distanceKm": round(d, 3),
                        "system": system,
                    })

    print(f"  → {len(edges)} edges (same-system, ≤{max_km} km)")
    return edges


def deduplicate(nodes: list[dict], radius_km: float = 0.05) -> list[dict]:
    """Remove near-duplicate stations (same location, different sources)."""
    kept: list[dict] = []
    for candidate in nodes:
        duplicate = False
        for existing in kept:
            if haversine_km(candidate["lat"], candidate["lng"], existing["lat"], existing["lng"]) < radius_km:
                duplicate = True
                break
        if not duplicate:
            kept.append(candidate)
    print(f"  → {len(kept)} unique nodes after deduplication (radius {radius_km*1000:.0f} m)")
    return kept


def city2graph_enrich(nodes: list[dict]) -> list[dict]:
    """
    Use city2graph utilities to build a NetworkX graph and extract any additional
    attributes (e.g., betweenness centrality, degree). Results are merged back
    into the node records as extra metadata for the front-end.
    """
    try:
        import geopandas as gpd
        import networkx as nx
        import city2graph
        from shapely.geometry import Point

        print("Building NetworkX graph with city2graph…")
        gdf_nodes = gpd.GeoDataFrame(
            nodes,
            geometry=[Point(n["lng"], n["lat"]) for n in nodes],
            crs="EPSG:4326",
        ).set_index("id")

        # Build a simple proximity graph (fixed-radius) for the BKK bounding box
        # city2graph.fixed_radius_graph expects projected CRS for metre-based radius
        gdf_proj = gdf_nodes.to_crs("EPSG:32647")  # UTM zone 47N (Thailand)
        # fixed_radius_graph returns (nodes_gdf, edges_gdf) tuple
        result = city2graph.fixed_radius_graph(gdf_proj, radius=2500)

        # Unpack the tuple
        if isinstance(result, tuple) and len(result) == 2:
            nodes_gdf, edges_gdf = result
            # Convert to NetworkX for centrality calculation
            import networkx as nx
            G = nx.Graph()
            for idx in nodes_gdf.index:
                G.add_node(str(idx))
            for _, row in edges_gdf.iterrows():
                G.add_edge(str(row.get("source", row.name[0])), str(row.get("target", row.name[1])))
        else:
            # Might be a NetworkX graph in some versions
            G = result

        if len(G.nodes) > 0:
            centrality = nx.betweenness_centrality(G, normalized=True)
            degree = dict(G.degree())
            for n in nodes:
                nid = n["id"]
                n["betweenness"] = round(centrality.get(nid, 0), 4)
                n["degree"] = degree.get(nid, 0)
            print(f"  → city2graph enrichment done ({len(G.nodes)} nodes, {len(G.edges)} edges in proximity graph)")
        else:
            print("  ⚠ city2graph graph was empty — skipping enrichment")

    except Exception as e:
        print(f"  ⚠ city2graph enrichment failed: {e}", file=sys.stderr)

    return nodes


def main() -> None:
    print("=" * 60)
    print("arnfa · build_transit_graph.py")
    print("=" * 60)

    # 1. Fetch from OSM
    osm_nodes = fetch_osm_transit()

    # 2. Merge supplementary SRT dataset (if it has coordinates)
    srt_nodes = load_supplementary_srt()
    all_nodes = osm_nodes + srt_nodes

    if not all_nodes:
        print("❌ No nodes fetched. Check your internet connection.", file=sys.stderr)
        sys.exit(1)

    # 3. Deduplicate
    all_nodes = deduplicate(all_nodes)

    # 4. Enrich with city2graph (betweenness, degree)
    all_nodes = city2graph_enrich(all_nodes)

    # 5. Build edges
    edges = build_edges(all_nodes)

    # 6. Write outputs
    OUT_NODES.parent.mkdir(parents=True, exist_ok=True)
    OUT_NODES.write_text(json.dumps({"nodes": all_nodes}, ensure_ascii=False, indent=2), encoding="utf-8")
    OUT_EDGES.write_text(json.dumps({"edges": edges}, ensure_ascii=False, indent=2), encoding="utf-8")

    print()
    print("✅ Outputs written:")
    print(f"   {OUT_NODES}")
    print(f"   {OUT_EDGES}")
    print()
    print("Next: commit these files and push to deploy.")


if __name__ == "__main__":
    main()
