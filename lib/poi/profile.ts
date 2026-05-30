/**
 * POI profile heuristics — Phase 0 seed values from OSM tags.
 * Spec: projects/arnfa/02-architecture.md § Profile pipeline
 */

import type { PoiProfile } from "../core/weatherFit";
import type { OverpassNode } from "./overpass";

export type PoiCategory =
  | "cafe" | "restaurant" | "bar" | "park" | "garden" | "market"
  | "mall" | "museum" | "gallery" | "library" | "viewpoint" | "playground" | "other";

export type PoiRecord = {
  id: string;
  osmId: number;
  name: string;
  nameTh?: string;
  lat: number;
  lng: number;
  category: PoiCategory;
  rawTags: Record<string, string>;
  profile: PoiProfile;
  openingHoursRaw?: string;
};

const CATEGORY_DEFAULTS: Record<PoiCategory, PoiProfile> = {
  cafe:       { outdoorness: 0.15, indoorness: 0.85, shade: 0.1,  covered: 0.9,  rainEnjoyment: 0.75, heatTolerance: 0.85, confidence: 0.6 },
  restaurant: { outdoorness: 0.2,  indoorness: 0.8,  shade: 0.1,  covered: 0.85, rainEnjoyment: 0.55, heatTolerance: 0.8,  confidence: 0.55 },
  bar:        { outdoorness: 0.3,  indoorness: 0.7,  shade: 0.2,  covered: 0.7,  rainEnjoyment: 0.55, heatTolerance: 0.65, confidence: 0.5 },
  park:       { outdoorness: 0.95, indoorness: 0.05, shade: 0.4,  covered: 0.05, rainEnjoyment: 0.05, heatTolerance: 0.3,  confidence: 0.6 },
  garden:     { outdoorness: 0.92, indoorness: 0.08, shade: 0.5,  covered: 0.05, rainEnjoyment: 0.1,  heatTolerance: 0.35, confidence: 0.55 },
  market:     { outdoorness: 0.45, indoorness: 0.55, shade: 0.6,  covered: 0.65, rainEnjoyment: 0.35, heatTolerance: 0.45, confidence: 0.5 },
  mall:       { outdoorness: 0.02, indoorness: 0.98, shade: 0,    covered: 1,    rainEnjoyment: 0.5,  heatTolerance: 0.95, confidence: 0.7 },
  museum:     { outdoorness: 0.05, indoorness: 0.95, shade: 0,    covered: 1,    rainEnjoyment: 0.65, heatTolerance: 0.9,  confidence: 0.7 },
  gallery:    { outdoorness: 0.1,  indoorness: 0.9,  shade: 0.05, covered: 0.95, rainEnjoyment: 0.65, heatTolerance: 0.85, confidence: 0.65 },
  library:    { outdoorness: 0.02, indoorness: 0.98, shade: 0,    covered: 1,    rainEnjoyment: 0.7,  heatTolerance: 0.9,  confidence: 0.75 },
  viewpoint:  { outdoorness: 0.95, indoorness: 0.05, shade: 0.05, covered: 0.05, rainEnjoyment: 0.05, heatTolerance: 0.25, confidence: 0.55 },
  playground: { outdoorness: 0.95, indoorness: 0.05, shade: 0.3,  covered: 0.05, rainEnjoyment: 0.05, heatTolerance: 0.3,  confidence: 0.5 },
  other:      { outdoorness: 0.5,  indoorness: 0.5,  shade: 0.3,  covered: 0.5,  rainEnjoyment: 0.4,  heatTolerance: 0.5,  confidence: 0.3 },
};

function categorizeFromTags(t: Record<string, string>): PoiCategory {
  if (t.amenity === "cafe") return "cafe";
  if (t.amenity === "restaurant" || t.amenity === "fast_food" || t.amenity === "food_court") return "restaurant";
  if (t.amenity === "bar" || t.amenity === "pub") return "bar";
  if (t.amenity === "marketplace") return "market";
  if (t.amenity === "library") return "library";
  if (t.amenity === "museum") return "museum";
  if (t.leisure === "park") return "park";
  if (t.leisure === "garden") return "garden";
  if (t.leisure === "playground") return "playground";
  if (t.tourism === "museum") return "museum";
  if (t.tourism === "gallery") return "gallery";
  if (t.tourism === "viewpoint") return "viewpoint";
  if (t.tourism === "attraction") return "other";
  if (t.shop === "mall" || t.shop === "department_store") return "mall";
  return "other";
}

function adjustForTags(base: PoiProfile, t: Record<string, string>): PoiProfile {
  const p = { ...base };
  if (t.covered === "yes") { p.covered = Math.min(1, p.covered + 0.4); p.confidence = Math.min(1, p.confidence + 0.05); }
  if (t.indoor === "yes") { p.indoorness = Math.min(1, p.indoorness + 0.3); p.confidence = Math.min(1, p.confidence + 0.05); }
  if (t.outdoor_seating === "yes") { p.outdoorness = Math.min(1, p.outdoorness + 0.2); p.shade = Math.min(1, p.shade + 0.1); }
  if (t.air_conditioning === "yes") { p.heatTolerance = Math.min(1, p.heatTolerance + 0.15); p.confidence = Math.min(1, p.confidence + 0.05); }
  return p;
}

export function profileFromOverpassNode(node: OverpassNode): PoiRecord {
  const tags = node.tags ?? {};
  const category = categorizeFromTags(tags);
  return {
    id: `osm-${node.id}`,
    osmId: node.id,
    name: tags.name ?? `OSM ${node.id}`,
    nameTh: tags["name:th"],
    lat: node.lat,
    lng: node.lon,
    category,
    rawTags: tags,
    profile: adjustForTags(CATEGORY_DEFAULTS[category], tags),
    openingHoursRaw: tags.opening_hours,
  };
}

export function profilesFromOverpass(nodes: OverpassNode[]): PoiRecord[] {
  return nodes.map(profileFromOverpassNode);
}
