// Regenerate lib/data/bmaCooling.snapshot.json from the BMA cooling-center ArcGIS layer.
// bmamap.bangkok.go.th (like data.bangkok.go.th) blocks Vercel's cloud IP, so we bundle a
// snapshot of the REAL official GeoJSON. Run from a host that can reach it (Thai IP):
//   node scripts/snapshot-bma-cooling.mjs
import { writeFileSync } from "node:fs";

const url =
  "https://bmamap.bangkok.go.th/bmamap/rest/services/COOLINGCENTER/BKKCOOLINGCENTER/MapServer/0/query?where=1%3D1&outFields=*&returnGeometry=true&f=geojson";

const r = await fetch(url, { signal: AbortSignal.timeout(25000) });
if (!r.ok) { console.error("fetch failed", r.status); process.exit(1); }
const gj = await r.json();
const feats = gj?.features ?? [];

const BKK = { latMin: 13.4, latMax: 14.0, lngMin: 100.2, lngMax: 100.95 };
const centers = [];
for (const f of feats) {
  const [lng, lat] = f?.geometry?.coordinates ?? [];
  const p = f?.properties ?? {};
  const name = String(p.NAME ?? "").trim();
  if (!name || !isFinite(lat) || !isFinite(lng)) continue;
  if (lat < BKK.latMin || lat > BKK.latMax || lng < BKK.lngMin || lng > BKK.lngMax) continue;
  centers.push({
    id: String(p.ID ?? p.OBJECTID ?? centers.length),
    name,
    type: String(p.TYPE ?? "").trim(),       // ห้องหลบร้อน
    district: String(p.DNAME ?? "").trim(),
    address: String(p.ADDRESS ?? "").trim(),
    time: String(p.TIME ?? "").trim(),
    lat: +lat, lng: +lng,
  });
}

const date = new Date().toISOString().slice(0, 10);
writeFileSync("lib/data/bmaCooling.snapshot.json", JSON.stringify({ date, centers }, null, 0) + "\n", "utf8");
console.log(`wrote lib/data/bmaCooling.snapshot.json — ${centers.length} cooling centers, ${date}`);
