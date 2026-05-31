// Shared POI-seeding logic for Arnfa — single source of truth for both
// scripts/seed-district.mjs (curated neighbourhood bboxes) and
// scripts/seed-all.mjs (administrative เขต by OSM boundary polygon).
//
// Every POI here is REAL data straight from OpenStreetMap Overpass. We only
// add a weather-fit *profile* heuristic per category. Nothing is fabricated.

export const CATEGORY_DEFAULTS = {
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
  temple:{outdoorness:0.6,indoorness:0.4,shade:0.35,covered:0.45,rainEnjoyment:0.2,heatTolerance:0.4,confidence:0.55},
  viewpoint:{outdoorness:0.95,indoorness:0.05,shade:0.05,covered:0.05,rainEnjoyment:0.05,heatTolerance:0.25,confidence:0.55},
  playground:{outdoorness:0.95,indoorness:0.05,shade:0.3,covered:0.05,rainEnjoyment:0.05,heatTolerance:0.3,confidence:0.5},
  nature:{outdoorness:0.95,indoorness:0.05,shade:0.25,covered:0.05,rainEnjoyment:0.05,heatTolerance:0.3,confidence:0.55},
  spa:{outdoorness:0.05,indoorness:0.95,shade:0,covered:1,rainEnjoyment:0.7,heatTolerance:0.9,confidence:0.6},
  entertainment:{outdoorness:0.05,indoorness:0.95,shade:0,covered:1,rainEnjoyment:0.7,heatTolerance:0.9,confidence:0.6},
  themepark:{outdoorness:0.75,indoorness:0.25,shade:0.3,covered:0.2,rainEnjoyment:0.2,heatTolerance:0.4,confidence:0.55},
  other:{outdoorness:0.25,indoorness:0.7,shade:0.2,covered:0.7,rainEnjoyment:0.45,heatTolerance:0.6,confidence:0.3},
};

export function categorize(t) {
  if (t.amenity === "cafe") return "cafe";
  if (["restaurant", "fast_food", "food_court"].includes(t.amenity)) return "restaurant";
  if (["bar", "pub"].includes(t.amenity)) return "bar";
  if (t.amenity === "marketplace") return "market";
  if (t.amenity === "library") return "library";
  if (t.amenity === "museum" || t.tourism === "museum") return "museum";
  if (t.amenity === "place_of_worship" || t.building === "temple") return "temple";
  if (t.leisure === "park") return "park";
  if (t.leisure === "garden") return "garden";
  if (t.leisure === "playground") return "playground";
  if (t.tourism === "gallery") return "gallery";
  if (t.tourism === "viewpoint") return "viewpoint";
  // diverse trip categories (added 2026-05-31 for nationwide variety)
  if (["beach", "peak", "hot_spring", "cave_entrance", "waterfall"].includes(t.natural) || t.waterway === "waterfall") return "nature";
  if (t.leisure === "spa" || t.amenity === "spa" || t.shop === "massage") return "spa";
  if (["cinema", "theatre", "nightclub", "arts_centre"].includes(t.amenity)) return "entertainment";
  if (["theme_park", "zoo", "aquarium"].includes(t.tourism) || t.leisure === "water_park") return "themepark";
  if (t.shop === "mall" || t.shop === "department_store") return "mall";
  // bakeries/bookshops are indoor cafe-adjacent / library-adjacent, not "outdoor other"
  if (t.shop === "bakery") return "cafe";
  if (t.shop === "books") return "library";
  if (t.amenity === "ice_cream") return "cafe";
  if (t.tourism === "attraction") return "viewpoint"; // attractions skew outdoor/landmark
  return "other";
}

export function adjust(base, t) {
  const p = { ...base };
  if (t.covered === "yes") { p.covered = Math.min(1, p.covered + 0.4); p.confidence = Math.min(1, p.confidence + 0.05); }
  if (t.indoor === "yes") { p.indoorness = Math.min(1, p.indoorness + 0.3); p.confidence = Math.min(1, p.confidence + 0.05); }
  if (t.outdoor_seating === "yes") { p.outdoorness = Math.min(1, p.outdoorness + 0.2); p.shade = Math.min(1, p.shade + 0.1); }
  if (t.air_conditioning === "yes") { p.heatTolerance = Math.min(1, p.heatTolerance + 0.15); p.confidence = Math.min(1, p.confidence + 0.05); }
  return p;
}

// Build clean POI records from raw Overpass elements (nodes + way/relation centers).
export function buildRecords(elements) {
  const named = (elements || []).filter((el) => el.tags?.name && (el.lat != null || el.center));
  const records = named.map((el) => {
    const t = el.tags || {};
    const lat = el.lat ?? el.center?.lat;
    const lng = el.lon ?? el.center?.lon;
    const category = categorize(t);
    return {
      id: `osm-${el.type[0]}${el.id}`, osmId: el.id, osmType: el.type,
      name: t.name, nameTh: t["name:th"] || null,
      lat, lng, category,
      profile: adjust(CATEGORY_DEFAULTS[category], t),
      openingHoursRaw: t.opening_hours || null,
      tags: { covered: t.covered, indoor: t.indoor, outdoor_seating: t.outdoor_seating, cuisine: t.cuisine },
    };
  }).filter((r) => r.lat != null && r.lng != null);
  // dedupe by visible name (burst duplicates / multi-node venues)
  const seen = new Set();
  return records.filter((r) => { const k = r.name.toLowerCase().trim(); if (seen.has(k)) return false; seen.add(k); return true; });
}

export const MIRRORS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://lz4.overpass-api.de/api/interpreter",
];

const SLEEP = (ms) => new Promise((r) => setTimeout(r, ms));

// POST a query with retry + backoff, rotating through mirrors (preferred first).
export async function overpass(query, { preferMirror, label = "q", maxAttempts = 5 } = {}) {
  const order = preferMirror ? [preferMirror, ...MIRRORS.filter((m) => m !== preferMirror)] : MIRRORS;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const url = order[attempt % order.length];
    try {
      const res = await fetch(url, {
        method: "POST",
        body: new URLSearchParams({ data: query }),
        headers: { "User-Agent": "Arnfa/0.1 seeder", "Content-Type": "application/x-www-form-urlencoded" },
        signal: AbortSignal.timeout(45000), // hard cap so a stalled mirror rotates instead of hanging
      });
      if (res.status === 429 || res.status === 504) {
        const wait = 2000 * (attempt + 1);
        console.error(`[${label}] ${url} -> ${res.status}, backoff ${wait}ms`);
        await SLEEP(wait);
        continue;
      }
      if (!res.ok) { console.error(`[${label}] ${url} -> HTTP ${res.status}`); await SLEEP(1500); continue; }
      return await res.json();
    } catch (e) {
      console.error(`[${label}] ${url} -> ${e.message}`);
      await SLEEP(1500);
    }
  }
  return null;
}

// ONLY the diverse "variety" categories — for additive enrichment of existing areas.
export function enrichClause(areaOrBox) {
  const f = areaOrBox;
  return [
    `node["natural"~"beach|peak|hot_spring|cave_entrance|waterfall"]${f};`,
    `way["natural"~"beach|peak|waterfall"]${f};`,
    `node["waterway"="waterfall"]${f};`,
    `node["leisure"~"spa|water_park"]${f};way["leisure"~"spa|water_park"]${f};`,
    `node["amenity"~"spa|cinema|theatre|nightclub|arts_centre"]${f};way["amenity"~"cinema|theatre|arts_centre"]${f};`,
    `node["shop"="massage"]${f};`,
    `node["tourism"~"theme_park|zoo|aquarium"]${f};way["tourism"~"theme_park|zoo|aquarium"]${f};`,
  ].join("");
}

// Expand a [s,w,n,e] bbox outward by `pad` degrees (≈111km/deg) for thin areas.
export function widenBbox([s, w, n, e], pad = 0.05) {
  return [s - pad, w - pad, n + pad, e + pad];
}

// The POI selector clause (nodes + ways + relations, with centers for areas).
export function poiClause(areaOrBox) {
  const f = areaOrBox; // e.g. "(area.a)" or "(13.7,100.5,13.8,100.6)"
  return [
    `node["amenity"~"cafe|restaurant|fast_food|food_court|bar|pub|marketplace|library|museum|ice_cream|place_of_worship"]${f};`,
    `way["amenity"~"cafe|restaurant|food_court|library|museum|marketplace|place_of_worship"]${f};`,
    `node["leisure"~"park|garden|playground"]${f};`,
    `way["leisure"~"park|garden|playground"]${f};`,
    `node["tourism"~"viewpoint|attraction|gallery|museum"]${f};`,
    `way["tourism"~"gallery|museum|attraction"]${f};`,
    `node["shop"~"mall|books|bakery|department_store"]${f};`,
    `way["shop"~"mall|department_store"]${f};`,
  ].join("");
}
