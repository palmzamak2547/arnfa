// Seed every Bangkok administrative district (เขต) from real OSM boundaries.
// Reads scripts/bkk-districts.json (produced by discover-districts.mjs), then for
// each district queries POIs strictly INSIDE its boundary polygon (relation->area),
// so nothing bleeds in from a neighbouring district. Real OSM data only.
//
// Usage:
//   node scripts/seed-all.mjs                       # all districts, default mirror order
//   node scripts/seed-all.mjs --only=watthana,sathon
//   node scripts/seed-all.mjs --skip-existing       # don't refetch files already on disk
//   node scripts/seed-all.mjs --mirror=https://overpass.kumi.systems/api/interpreter
import { writeFileSync, existsSync, mkdirSync } from "node:fs";
import { overpass, poiClause, buildRecords } from "./lib/poi-seed.mjs";

const manifest = JSON.parse((await import("node:fs")).readFileSync("scripts/bkk-districts.json", "utf8"));

function keyOf(nameEn, nameTh) {
  const base = (nameEn || nameTh || "").replace(/\s*District$/i, "").trim();
  const k = base.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return k || `khet-${Math.abs(hash(nameTh))}`;
}
function hash(s){let h=0;for(let i=0;i<(s||"").length;i++){h=(h*31+s.charCodeAt(i))|0;}return h;}

const args = process.argv.slice(2);
const onlyArg = args.find((a) => a.startsWith("--only="));
const only = onlyArg ? onlyArg.split("=")[1].split(",").map((s) => s.trim()) : null;
const skipExisting = args.includes("--skip-existing");
const mirrorArg = args.find((a) => a.startsWith("--mirror="));
const preferMirror = mirrorArg ? mirrorArg.split("=")[1] : undefined;

mkdirSync("data/seed", { recursive: true });

const targets = manifest.districts
  .map((d) => ({ ...d, key: keyOf(d.nameEn, d.nameTh) }))
  .filter((d) => (only ? only.includes(d.key) : true));

console.log(`seeding ${targets.length} district(s)${preferMirror ? ` via ${preferMirror}` : ""}`);
const summary = [];

for (const d of targets) {
  const path = `data/seed/${d.key}.json`;
  if (skipExisting && existsSync(path)) { console.log(`· ${d.key}: skip (exists)`); continue; }
  const areaId = 3600000000 + d.osmId; // OSM relation -> Overpass area id
  const ql = `[out:json][timeout:60];area(${areaId})->.a;(${poiClause("(area.a)")});out center 400;`;
  let data = await overpass(ql, { preferMirror, label: d.key });
  // Fallback: if the area query yielded nothing, try the bbox (still real coords).
  if (!data || !(data.elements || []).length) {
    const [s, w, n, e] = d.bbox;
    const qb = `[out:json][timeout:60];(${poiClause(`(${s},${w},${n},${e})`)});out center 400;`;
    data = await overpass(qb, { preferMirror, label: `${d.key}-bbox` }) || data;
  }
  const pois = buildRecords(data?.elements || []);
  const byCat = {};
  pois.forEach((r) => { byCat[r.category] = (byCat[r.category] || 0) + 1; });
  const out = {
    district: d.key, districtTh: d.nameTh.replace(/^เขต/, ""), districtEn: (d.nameEn || "").replace(/\s*District$/i, ""),
    osmRelationId: d.osmId, bbox: d.bbox, adminLevel: manifest.adminLevel,
    fetchedAt: new Date().toISOString(), count: pois.length, pois,
  };
  writeFileSync(path, JSON.stringify(out, null, 2));
  summary.push({ key: d.key, th: out.districtTh, count: pois.length, top: Object.entries(byCat).sort((a, b) => b[1] - a[1]).slice(0, 3) });
  console.log(`✓ ${d.key} (${out.districtTh}): ${pois.length} POIs ${JSON.stringify(byCat)}`);
  await new Promise((r) => setTimeout(r, 700)); // polite gap between districts
}

console.log(`\n=== done: ${summary.length} districts, ${summary.reduce((a, s) => a + s.count, 0)} POIs ===`);
const empty = summary.filter((s) => s.count < 8);
if (empty.length) console.log(`thin (<8): ${empty.map((s) => `${s.key}:${s.count}`).join(", ")}`);
