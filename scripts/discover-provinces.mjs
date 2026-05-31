// Discover Thailand's 76 provincial capital districts (อำเภอเมือง) from OSM — the
// trip unit for the national rollout (one walkable city per province). No hand
// coordinates: we read each capital district's real name + bbox from OSM.
// Bangkok is excluded (it has เขต, not an อำเภอเมือง — already covered separately).
// Usage: node scripts/discover-provinces.mjs
import { writeFileSync } from "node:fs";

const MIRRORS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://lz4.overpass-api.de/api/interpreter",
];

async function run(query, label) {
  for (const url of MIRRORS) {
    try {
      const res = await fetch(url, {
        method: "POST",
        body: new URLSearchParams({ data: query }),
        headers: { "User-Agent": "Arnfa/0.1 province-discovery", "Content-Type": "application/x-www-form-urlencoded" },
        signal: AbortSignal.timeout(120000),
      });
      if (!res.ok) { console.error(`[${label}] ${url} -> HTTP ${res.status}`); continue; }
      return await res.json();
    } catch (e) { console.error(`[${label}] ${url} -> ${e.message}`); }
  }
  return null;
}

// Step 1: the REAL province list (admin_level 4) → the set of province names, so we
// can tell a true capital (อำเภอเมือง<Province>) from a same-shaped non-capital
// amphoe like อำเภอเมืองจันทร์ (a district in ศรีสะเกษ, NOT a province).
const provQ = `[out:json][timeout:120];area["name:en"="Thailand"]["admin_level"="2"]->.th;relation["boundary"="administrative"]["admin_level"="4"](area.th);out tags;`;
const provData = await run(provQ, "provinces");
const provinceNames = new Set();
const provinceEnByTh = new Map();
for (const e of provData?.elements || []) {
  const th = (e.tags?.["name:th"] || "").replace(/^จังหวัด/, "").trim();
  const en = (e.tags?.["name:en"] || "").replace(/\s+Province$/i, "").trim();
  if (th) { provinceNames.add(th); if (en) provinceEnByTh.set(th, en); }
}
console.log(`provinces (admin4): ${provinceNames.size} named`);

// Step 2: capital candidates by the THAI name (อำเภอเมือง<X>) — this doesn't rely
// on name:en (some real capitals lack a clean one), and the province cross-check
// below removes look-alike non-capitals (อำเภอเมืองจันทร์, cross-border mis-tags).
// Ayutthaya is the one capital NOT named เมือง (อำเภอพระนครศรีอยุธยา), added explicitly.
const q = `[out:json][timeout:200];area["name:en"="Thailand"]["admin_level"="2"]->.th;(relation["boundary"="administrative"]["admin_level"="6"]["name:th"~"^อำเภอเมือง"](area.th);relation["boundary"="administrative"]["admin_level"="6"]["name:th"="อำเภอพระนครศรีอยุธยา"](area.th););out tags bb;`;
const data = await run(q, "capitals");
if (!data) { console.error("discovery failed"); process.exit(1); }

const els = (data.elements || []).filter((e) => e.tags?.["name:th"] && e.bounds);
const provinces = els.map((e) => {
  const nameTh = e.tags["name:th"] || "";       // "อำเภอเมืองเชียงใหม่" | "อำเภอพระนครศรีอยุธยา"
  const provinceTh = nameTh.replace(/^อำเภอเมือง/, "").replace(/^อำเภอ/, "").trim(); // "เชียงใหม่" | "พระนครศรีอยุธยา"
  const nameEn = e.tags["name:en"] || "";        // "Mueang Chiang Mai District"
  const provinceEn = (provinceEnByTh.get(provinceTh) || nameEn.replace(/^Mueang\s+/i, "").replace(/\s+District$/i, "")).trim();
  const key = (provinceEn || provinceTh).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return { provinceTh, provinceEn, key, osmId: e.id, bbox: [e.bounds.minlat, e.bounds.minlon, e.bounds.maxlat, e.bounds.maxlon] };
}).filter((p) => p.key && p.provinceTh && provinceNames.has(p.provinceTh)); // <- only true capitals

// Recovery pass: some real capitals slip through the area-filtered query (an OSM
// membership quirk). For each still-missing REAL Thai province (skip Bangkok, which
// has เขต, and skip cross-border Myanmar regions tagged รัฐ*/ภาค*), fetch its capital
// directly by exact name — try อำเภอเมือง<P> then อำเภอ<P> (Ayutthaya-style).
const haveCapital = new Set(provinces.map((p) => p.provinceTh));
const realMissing = [...provinceNames].filter(
  (th) => !haveCapital.has(th) && th !== "กรุงเทพมหานคร" && !/^รัฐ|^ภาค/.test(th),
);
for (const prov of realMissing) {
  const rq = `[out:json][timeout:60];(relation["boundary"="administrative"]["admin_level"="6"]["name:th"="อำเภอเมือง${prov}"];relation["boundary"="administrative"]["admin_level"="6"]["name:th"="อำเภอ${prov}"];);out tags bb;`;
  const rd = await run(rq, `recover-${prov}`);
  const e = (rd?.elements || []).find((x) => x.bounds);
  if (!e) { console.log(`  recover ${prov}: not found`); continue; }
  const provinceEn = (provinceEnByTh.get(prov) || (e.tags["name:en"] || "").replace(/^Mueang\s+/i, "").replace(/\s+District$/i, "")).trim();
  const key = (provinceEn || prov).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  if (!key) { console.log(`  recover ${prov}: no latin key`); continue; }
  provinces.push({ provinceTh: prov, provinceEn, key, osmId: e.id, bbox: [e.bounds.minlat, e.bounds.minlon, e.bounds.maxlat, e.bounds.maxlon] });
  console.log(`  recovered ${prov} → ${key}`);
}
provinces.sort((a, b) => a.provinceTh.localeCompare(b.provinceTh, "th"));

const stillMissing = [...provinceNames].filter((th) => !new Set(provinces.map((p) => p.provinceTh)).has(th) && th !== "กรุงเทพมหานคร" && !/^รัฐ|^ภาค/.test(th));
if (stillMissing.length) console.log(`still missing (real provinces): ${stillMissing.join(", ")}`);

// de-dupe by key (defensive)
const seen = new Set();
const unique = provinces.filter((p) => { if (seen.has(p.key)) return false; seen.add(p.key); return true; })
  .sort((a, b) => a.provinceTh.localeCompare(b.provinceTh, "th"));

writeFileSync("scripts/th-provinces.json", JSON.stringify({ count: unique.length, provinces: unique }, null, 2));
console.log(`✓ wrote scripts/th-provinces.json — ${unique.length} provincial capitals`);
console.log("sample:", unique.slice(0, 6).map((p) => `${p.provinceTh}/${p.key}`).join(", "));
const noEn = unique.filter((p) => !p.provinceEn);
if (noEn.length) console.log("missing English:", noEn.map((p) => p.provinceTh).join(", "));
