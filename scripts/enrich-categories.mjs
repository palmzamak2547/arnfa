// Additively enrich every seeded area with diverse "variety" POIs (nature, spa,
// entertainment, theme parks) and top up THIN areas with a wider net — all real
// OSM, merged into existing files by id. NEVER regresses: only adds.
//
// Usage:
//   node scripts/enrich-categories.mjs                # all areas
//   node scripts/enrich-categories.mjs --only=nan,bueng-kan
//   node scripts/enrich-categories.mjs --thin=30      # also wide-net areas under N
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { overpass, enrichClause, poiClause, buildRecords, widenBbox } from "./lib/poi-seed.mjs";

const args = process.argv.slice(2);
const onlyArg = args.find((a) => a.startsWith("--only="));
const only = onlyArg ? onlyArg.split("=")[1].split(",").map((s) => s.trim()) : null;
const thinArg = args.find((a) => a.startsWith("--thin="));
const THIN = thinArg ? parseInt(thinArg.split("=")[1], 10) : 30;

const files = readdirSync("data/seed").filter((f) => f.endsWith(".json") && (only ? only.includes(f.replace(".json", "")) : true));
console.log(`enriching ${files.length} area(s) (thin top-up < ${THIN})`);
let totalAdded = 0;
const report = [];

for (const f of files) {
  const path = `data/seed/${f}`;
  const d = JSON.parse(readFileSync(path, "utf8"));
  const before = (d.pois || []).length;
  const haveIds = new Set(d.pois.map((p) => p.id));
  const filter = d.osmRelationId ? `(area.a)` : `(${d.bbox.join(",")})`;
  const areaPrefix = d.osmRelationId ? `area(${3600000000 + d.osmRelationId})->.a;` : "";

  // 1) variety categories inside the same boundary/bbox
  const q1 = `[out:json][timeout:60];${areaPrefix}(${enrichClause(filter)});out center 300;`;
  const r1 = await overpass(q1, { label: `${f}-variety` });
  let added = mergeNew(d, buildRecords(r1?.elements || []), haveIds);

  // 2) thin areas: a wider full-category net around the centre (real nearby places)
  if (before + added < THIN) {
    const wb = widenBbox(d.bbox, 0.05);
    const q2 = `[out:json][timeout:60];(${poiClause(`(${wb.join(",")})`)});out center 400;`;
    const r2 = await overpass(q2, { label: `${f}-wide` });
    added += mergeNew(d, buildRecords(r2?.elements || []), haveIds);
  }

  if (added > 0) {
    d.count = d.pois.length;
    d.enrichedAt = new Date().toISOString();
    writeFileSync(path, JSON.stringify(d, null, 2));
  }
  totalAdded += added;
  report.push({ key: d.district, before, after: d.pois.length, added });
  console.log(`${added > 0 ? "✓" : "·"} ${d.district}: ${before} → ${d.pois.length} (+${added})`);
  await new Promise((r) => setTimeout(r, 850));
}

console.log(`\n=== enriched: +${totalAdded} POIs across ${report.filter((r) => r.added > 0).length} areas ===`);
const stillThin = report.filter((r) => r.after < 12).map((r) => `${r.key}:${r.after}`);
if (stillThin.length) console.log(`still <12: ${stillThin.join(", ")}`);

// merge new records into d.pois, skipping ids we already have; returns count added
function mergeNew(d, recs, haveIds) {
  let n = 0;
  for (const r of recs) {
    if (haveIds.has(r.id)) continue;
    haveIds.add(r.id);
    d.pois.push(r);
    n++;
  }
  return n;
}
