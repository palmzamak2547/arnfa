// Discover real Bangkok district (เขต) boundaries from OSM — no hand-typed coordinates.
// Resolves the Bangkok province area, then lists administrative children with their
// real names + bounding boxes (from Overpass `out bb`). We probe admin_level 6/7/8
// and report what actually exists so we pick the right level by EVIDENCE, not guess.
// Usage: node scripts/discover-districts.mjs
import { writeFileSync } from "node:fs";

const MIRRORS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

async function run(query, label) {
  for (const url of MIRRORS) {
    try {
      const res = await fetch(url, {
        method: "POST",
        body: new URLSearchParams({ data: query }),
        headers: { "User-Agent": "Arnfa/0.1 district-discovery", "Content-Type": "application/x-www-form-urlencoded" },
      });
      if (!res.ok) { console.error(`[${label}] ${url} -> HTTP ${res.status}`); continue; }
      return await res.json();
    } catch (e) {
      console.error(`[${label}] ${url} -> ${e.message}`);
    }
  }
  return null;
}

// 1) Probe which admin_level holds the ~50 เขต.
for (const lvl of [6, 7, 8]) {
  const q = `[out:json][timeout:60];area["name:en"="Bangkok"]["admin_level"="4"]->.bkk;relation["boundary"="administrative"]["admin_level"="${lvl}"](area.bkk);out tags bb;`;
  const data = await run(q, `level-${lvl}`);
  if (!data) { console.log(`level ${lvl}: query failed`); continue; }
  const els = data.elements || [];
  const named = els.filter((e) => e.tags?.["name:th"] || e.tags?.name);
  const sample = named.slice(0, 5).map((e) => e.tags["name:th"] || e.tags.name);
  console.log(`level ${lvl}: ${els.length} relations, ${named.length} named. sample: ${JSON.stringify(sample)}`);
  // Heuristic: the เขต level returns ~40-55 districts whose names start with เขต.
  const khetCount = named.filter((e) => (e.tags["name:th"] || "").startsWith("เขต")).length;
  if (khetCount >= 30) {
    const districts = named.map((e) => ({
      nameTh: e.tags["name:th"] || e.tags.name,
      nameEn: e.tags["name:en"] || null,
      osmId: e.id,
      bbox: [e.bounds.minlat, e.bounds.minlon, e.bounds.maxlat, e.bounds.maxlon],
    })).sort((a, b) => a.nameTh.localeCompare(b.nameTh, "th"));
    writeFileSync("scripts/bkk-districts.json", JSON.stringify({ adminLevel: lvl, count: districts.length, districts }, null, 2));
    console.log(`\n✓ wrote scripts/bkk-districts.json with ${districts.length} districts (admin_level ${lvl})`);
    break;
  }
}
