// Add wikidata/image/website to EXISTING POIs that have an OSM wikidata tag, so we
// can show a real, verified Commons photo for them. Additive, matched by id, never
// changes anything else. Lighter than a full re-seed (queries only tagged features).
// Usage: node scripts/enrich-wikidata.mjs [--only=chiang-mai]
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { overpass } from "./lib/poi-seed.mjs";

const args = process.argv.slice(2);
const onlyArg = args.find((a) => a.startsWith("--only="));
const only = onlyArg ? onlyArg.split("=")[1].split(",").map((s) => s.trim()) : null;

const files = readdirSync("data/seed").filter((f) => f.endsWith(".json") && (only ? only.includes(f.replace(".json", "")) : true));
console.log(`wikidata-enriching ${files.length} area(s)`);
let totalTagged = 0;

for (const f of files) {
  const path = `data/seed/${f}`;
  const d = JSON.parse(readFileSync(path, "utf8"));
  const byId = new Map(d.pois.map((p) => [p.id, p]));
  const filter = d.osmRelationId ? "(area.a)" : `(${d.bbox.join(",")})`;
  const areaPrefix = d.osmRelationId ? `area(${3600000000 + d.osmRelationId})->.a;` : "";
  const q = `[out:json][timeout:60];${areaPrefix}(nwr["wikidata"]${filter};);out tags center 400;`;
  const data = await overpass(q, { label: `${f}-wd` });
  let tagged = 0;
  for (const el of data?.elements || []) {
    const id = `osm-${el.type[0]}${el.id}`;
    const poi = byId.get(id);
    const t = el.tags || {};
    if (!poi || !t.wikidata) continue;
    if (!poi.wikidata) { poi.wikidata = t.wikidata; tagged++; }
    if (!poi.image && (t.image || t["wikimedia_commons"])) poi.image = t.image || t["wikimedia_commons"];
    if (!poi.website && (t.website || t["contact:website"])) poi.website = t.website || t["contact:website"];
  }
  if (tagged > 0) { d.wikidataAt = new Date().toISOString(); writeFileSync(path, JSON.stringify(d, null, 2)); }
  totalTagged += tagged;
  console.log(`${tagged > 0 ? "✓" : "·"} ${d.district}: +${tagged} with wikidata`);
  await new Promise((r) => setTimeout(r, 850));
}
console.log(`\n=== done: ${totalTagged} POIs linked to wikidata ===`);
