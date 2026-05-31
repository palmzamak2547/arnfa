// Seed every Thai province's capital-city POIs from real OSM.
// Reads scripts/th-provinces.json. For provinces with an OSM capital-district
// relation we query POIs inside that real boundary polygon; for the few without a
// clean relation we query a bbox around the capital-town centre. Real OSM only.
//
// Usage:
//   node scripts/seed-provinces.mjs                 # all, skip existing
//   node scripts/seed-provinces.mjs --only=nan,phuket
//   node scripts/seed-provinces.mjs --refetch       # ignore existing files
import { writeFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { overpass, poiClause, buildRecords } from "./lib/poi-seed.mjs";

const manifest = JSON.parse(readFileSync("scripts/th-provinces.json", "utf8"));
const args = process.argv.slice(2);
const onlyArg = args.find((a) => a.startsWith("--only="));
const only = onlyArg ? onlyArg.split("=")[1].split(",").map((s) => s.trim()) : null;
const refetch = args.includes("--refetch");

mkdirSync("data/seed", { recursive: true });

const targets = manifest.provinces.filter((p) => (only ? only.includes(p.key) : true));
console.log(`seeding ${targets.length} province capital(s)`);
const summary = [];

for (const p of targets) {
  const path = `data/seed/${p.key}.json`;
  if (!refetch && existsSync(path)) { console.log(`· ${p.key}: skip (exists)`); continue; }

  let data = null;
  if (p.osmId) {
    const areaId = 3600000000 + p.osmId;
    const ql = `[out:json][timeout:60];area(${areaId})->.a;(${poiClause("(area.a)")});out center 400;`;
    data = await overpass(ql, { label: p.key });
  }
  // bbox path (no relation) OR area returned nothing
  if (!data || !(data.elements || []).length) {
    const [s, w, n, e] = p.bbox;
    const qb = `[out:json][timeout:60];(${poiClause(`(${s},${w},${n},${e})`)});out center 400;`;
    data = await overpass(qb, { label: `${p.key}-bbox` }) || data;
  }

  const pois = buildRecords(data?.elements || []);
  const byCat = {};
  pois.forEach((r) => { byCat[r.category] = (byCat[r.category] || 0) + 1; });
  const out = {
    district: p.key, districtTh: p.provinceTh, districtEn: p.provinceEn,
    kind: "province", osmRelationId: p.osmId ?? null, bbox: p.bbox,
    fetchedAt: new Date().toISOString(), count: pois.length, pois,
  };
  writeFileSync(path, JSON.stringify(out, null, 2));
  summary.push({ key: p.key, th: p.provinceTh, count: pois.length });
  console.log(`✓ ${p.key} (${p.provinceTh}): ${pois.length} POIs ${JSON.stringify(byCat)}`);
  await new Promise((r) => setTimeout(r, 900)); // polite gap (Overpass is shared)
}

console.log(`\n=== done: ${summary.length} provinces, ${summary.reduce((a, s) => a + s.count, 0)} POIs ===`);
const thin = summary.filter((s) => s.count < 8);
if (thin.length) console.log(`thin (<8): ${thin.map((s) => `${s.key}:${s.count}`).join(", ")}`);
