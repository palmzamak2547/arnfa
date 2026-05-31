// Seed famous tourist destinations (not provincial capitals) from real OSM.
// bbox-based (curated centres). Full categories + variety, kind:"spot".
// Usage: node scripts/seed-spots.mjs [--only=pai,patong] [--skip-existing]
import { writeFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { overpass, poiClause, enrichClause, buildRecords } from "./lib/poi-seed.mjs";

const manifest = JSON.parse(readFileSync("scripts/tourist-spots.json", "utf8"));
const args = process.argv.slice(2);
const onlyArg = args.find((a) => a.startsWith("--only="));
const only = onlyArg ? onlyArg.split("=")[1].split(",").map((s) => s.trim()) : null;
const skipExisting = args.includes("--skip-existing");

mkdirSync("data/seed", { recursive: true });
const targets = manifest.spots.filter((s) => (only ? only.includes(s.key) : true));
console.log(`seeding ${targets.length} tourist spot(s)`);
const summary = [];

for (const s of targets) {
  const path = `data/seed/${s.key}.json`;
  if (skipExisting && existsSync(path)) { console.log(`· ${s.key}: skip`); continue; }
  const box = `(${s.bbox.join(",")})`;
  // full categories + the variety set, in one query
  const ql = `[out:json][timeout:60];(${poiClause(box)}${enrichClause(box)});out center 400;`;
  const data = await overpass(ql, { label: s.key });
  const pois = buildRecords(data?.elements || []);
  const byCat = {};
  pois.forEach((r) => { byCat[r.category] = (byCat[r.category] || 0) + 1; });
  const out = {
    district: s.key, districtTh: s.th, districtEn: s.en, kind: "spot",
    province: s.province, osmRelationId: null, bbox: s.bbox,
    fetchedAt: new Date().toISOString(), count: pois.length, pois,
  };
  writeFileSync(path, JSON.stringify(out, null, 2));
  summary.push({ key: s.key, count: pois.length });
  console.log(`✓ ${s.key} (${s.th}): ${pois.length} POIs ${JSON.stringify(byCat)}`);
  await new Promise((r) => setTimeout(r, 900));
}
console.log(`\n=== done: ${summary.length} spots, ${summary.reduce((a, x) => a + x.count, 0)} POIs ===`);
const thin = summary.filter((x) => x.count < 8);
if (thin.length) console.log(`thin (<8): ${thin.map((x) => `${x.key}:${x.count}`).join(", ")}`);
