// Regenerate lib/data/bmaDistrictAir.snapshot.json from the BMA per-district PM2.5 dataset
// (data.bangkok.go.th hdv2026 → sed_kr_pmstd.csv). MONTHLY historical readings per เขต — a
// "this district's usual dust" context layer, NOT real-time (Air4Thai is real-time). Keeps
// the LATEST month per district. Portal blocks Vercel → bundled snapshot. Run from a Thai IP:
//   node scripts/snapshot-bma-district-air.mjs
import { writeFileSync } from "node:fs";

const url = "https://data.bangkok.go.th/dataset/1d7f9e7c-ffc4-44c0-bc3c-efacdddd70df/resource/fcc3555e-77ae-4443-a589-7489ec24ad0b/download/sed_kr_pmstd.csv";
const r = await fetch(url, { signal: AbortSignal.timeout(20000) });
if (!r.ok) { console.error("fetch failed", r.status); process.exit(1); }
const lines = (await r.text()).split(/\r?\n/).filter((l) => l.trim());
const header = lines[0].split(",");
const ci = (n) => header.indexOf(n);
const c = { district: ci("district"), month: ci("month"), year: ci("year"), avg: ci("avg_value"), max: ci("max_value"), exceed: ci("exceed_std_days") };

// keep the latest (year, month) per district
const latest = new Map();
for (let i = 1; i < lines.length; i++) {
  const f = lines[i].split(",");
  const district = (f[c.district] ?? "").trim();
  const avg = parseFloat(f[c.avg]);
  // reject misaligned rows: district must be a Thai name (not numeric), avg plausible
  if (!district || !/[฀-๿]/.test(district) || /^[\d.]+$/.test(district) || !isFinite(avg) || avg < 1 || avg > 300) continue;
  const year = parseInt(f[c.year], 10) || 0, month = parseInt(f[c.month], 10) || 0;
  const rec = { district, avg: Math.round(avg), max: Math.round(parseFloat(f[c.max]) || 0), exceedDays: parseInt(f[c.exceed], 10) || 0, month, year };
  const prev = latest.get(district);
  if (!prev || year * 100 + month > prev.year * 100 + prev.month) latest.set(district, rec);
}
const districts = [...latest.values()].sort((a, b) => b.avg - a.avg);
const date = new Date().toISOString().slice(0, 10);
writeFileSync("lib/data/bmaDistrictAir.snapshot.json", JSON.stringify({ date, districts }, null, 0) + "\n", "utf8");
console.log(`wrote lib/data/bmaDistrictAir.snapshot.json — ${districts.length} districts, latest month, ${date}`);
