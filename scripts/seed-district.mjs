// Fetch real Bangkok POIs from OSM Overpass + apply profile heuristics → freeze to JSON.
// Usage: node scripts/seed-district.mjs thonglor
import { writeFileSync } from "node:fs";

const DISTRICTS = {
  thonglor:  { th: "ทองหล่อ",   bbox: [13.7250, 100.5680, 13.7470, 100.5910] },
  ari:       { th: "อารีย์",     bbox: [13.7720, 100.5340, 13.7920, 100.5550] },
  silom:     { th: "สีลม",       bbox: [13.7200, 100.5200, 13.7350, 100.5450] },
  siam:      { th: "สยาม",       bbox: [13.7400, 100.5260, 13.7520, 100.5400] },
  ekkamai:   { th: "เอกมัย",     bbox: [13.7170, 100.5800, 13.7340, 100.5990] },
  phranakhon:{ th: "พระนคร",     bbox: [13.7480, 100.4880, 13.7680, 100.5080] },
};

const CATEGORY_DEFAULTS = {
  cafe:{outdoorness:0.15,indoorness:0.85,shade:0.1,covered:0.9,rainEnjoyment:0.75,heatTolerance:0.85,confidence:0.6},
  restaurant:{outdoorness:0.2,indoorness:0.8,shade:0.1,covered:0.85,rainEnjoyment:0.55,heatTolerance:0.8,confidence:0.55},
  bar:{outdoorness:0.3,indoorness:0.7,shade:0.2,covered:0.7,rainEnjoyment:0.55,heatTolerance:0.65,confidence:0.5},
  park:{outdoorness:0.95,indoorness:0.05,shade:0.4,covered:0.05,rainEnjoyment:0.05,heatTolerance:0.3,confidence:0.6},
  garden:{outdoorness:0.92,indoorness:0.08,shade:0.5,covered:0.05,rainEnjoyment:0.1,heatTolerance:0.35,confidence:0.55},
  market:{outdoorness:0.45,indoorness:0.55,shade:0.6,covered:0.65,rainEnjoyment:0.35,heatTolerance:0.45,confidence:0.5},
  mall:{outdoorness:0.02,indoorness:0.98,shade:0,covered:1,rainEnjoyment:0.5,heatTolerance:0.95,confidence:0.7},
  museum:{outdoorness:0.05,indoorness:0.95,shade:0,covered:1,rainEnjoyment:0.65,heatTolerance:0.9,confidence:0.7},
  gallery:{outdoorness:0.1,indoorness:0.9,shade:0.05,covered:0.95,rainEnjoyment:0.65,heatTolerance:0.85,confidence:0.65},
  library:{outdoorness:0.02,indoorness:0.98,shade:0,covered:1,rainEnjoyment:0.7,heatTolerance:0.9,confidence:0.75},
  viewpoint:{outdoorness:0.95,indoorness:0.05,shade:0.05,covered:0.05,rainEnjoyment:0.05,heatTolerance:0.25,confidence:0.55},
  playground:{outdoorness:0.95,indoorness:0.05,shade:0.3,covered:0.05,rainEnjoyment:0.05,heatTolerance:0.3,confidence:0.5},
  other:{outdoorness:0.25,indoorness:0.7,shade:0.2,covered:0.7,rainEnjoyment:0.45,heatTolerance:0.6,confidence:0.3},
};

function categorize(t) {
  if (t.amenity === "cafe") return "cafe";
  if (["restaurant", "fast_food", "food_court"].includes(t.amenity)) return "restaurant";
  if (["bar", "pub"].includes(t.amenity)) return "bar";
  if (t.amenity === "marketplace") return "market";
  if (t.amenity === "library") return "library";
  if (t.amenity === "museum" || t.tourism === "museum") return "museum";
  if (t.leisure === "park") return "park";
  if (t.leisure === "garden") return "garden";
  if (t.leisure === "playground") return "playground";
  if (t.tourism === "gallery") return "gallery";
  if (t.tourism === "viewpoint") return "viewpoint";
  if (t.shop === "mall" || t.shop === "department_store") return "mall";
  // bakeries/bookshops are indoor cafe-adjacent / library-adjacent, not "outdoor other"
  if (t.shop === "bakery") return "cafe";
  if (t.shop === "books") return "library";
  if (t.amenity === "ice_cream") return "cafe";
  if (t.tourism === "attraction") return "viewpoint"; // attractions skew outdoor/landmark
  return "other";
}

function adjust(base, t) {
  const p = { ...base };
  if (t.covered === "yes") { p.covered = Math.min(1, p.covered + 0.4); p.confidence = Math.min(1, p.confidence + 0.05); }
  if (t.indoor === "yes") { p.indoorness = Math.min(1, p.indoorness + 0.3); p.confidence = Math.min(1, p.confidence + 0.05); }
  if (t.outdoor_seating === "yes") { p.outdoorness = Math.min(1, p.outdoorness + 0.2); p.shade = Math.min(1, p.shade + 0.1); }
  if (t.air_conditioning === "yes") { p.heatTolerance = Math.min(1, p.heatTolerance + 0.15); p.confidence = Math.min(1, p.confidence + 0.05); }
  return p;
}

const key = process.argv[2] || "thonglor";
const d = DISTRICTS[key];
if (!d) { console.error("unknown district", key); process.exit(1); }
const [s, w, n, e] = d.bbox;
const box = `(${s},${w},${n},${e})`;
const ql = `[out:json][timeout:25];(node["amenity"~"cafe|restaurant|bar|pub|food_court|marketplace|library|museum|ice_cream"]${box};node["leisure"~"park|garden|playground"]${box};node["tourism"~"viewpoint|attraction|gallery|museum"]${box};node["shop"~"mall|books|bakery|department_store"]${box};);out body 250;`;

const res = await fetch("https://overpass-api.de/api/interpreter", {
  method: "POST",
  body: new URLSearchParams({ data: ql }),
  headers: { "User-Agent": "Arnfa/0.1 seeder", "Content-Type": "application/x-www-form-urlencoded" },
});
if (!res.ok) { console.error("overpass", res.status); process.exit(1); }
const data = await res.json();
const named = (data.elements || []).filter((el) => el.type === "node" && el.tags?.name);
const records = named.map((node) => {
  const t = node.tags || {};
  const category = categorize(t);
  return {
    id: `osm-${node.id}`, osmId: node.id,
    name: t.name, nameTh: t["name:th"] || null,
    lat: node.lat, lng: node.lon, category,
    profile: adjust(CATEGORY_DEFAULTS[category], t),
    openingHoursRaw: t.opening_hours || null,
    tags: { covered: t.covered, indoor: t.indoor, outdoor_seating: t.outdoor_seating, cuisine: t.cuisine },
  };
});
const seen = new Set();
const deduped = records.filter((r) => { const k = r.name.toLowerCase().trim(); if (seen.has(k)) return false; seen.add(k); return true; });
const out = { district: key, districtTh: d.th, bbox: d.bbox, fetchedAt: new Date().toISOString(), count: deduped.length, pois: deduped };
writeFileSync(`data/seed/${key}.json`, JSON.stringify(out, null, 2));
const byCat = {};
deduped.forEach((r) => { byCat[r.category] = (byCat[r.category] || 0) + 1; });
console.log(`${key}: ${deduped.length} POIs ->`, JSON.stringify(byCat));
