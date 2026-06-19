// Regenerate lib/data/bmaParks.snapshot.json from the live BMA open-data portal.
// data.bangkok.go.th blocks/throttles cloud IPs (Vercel 503s), so we bundle a snapshot
// of the REAL official CSV and parse it at runtime with the same tested parser the live
// path uses. Run from a host that can reach the portal (e.g. a Thai IP):
//   node scripts/snapshot-bma-parks.mjs
import { writeFileSync } from "node:fs";

const url =
  "https://data.bangkok.go.th/dataset/88c4b42a-a6cb-48c7-af7f-b9e7b11582cc/resource/c3877d89-81b3-4285-a508-2e5af1f889eb/download/public_park.csv";

const r = await fetch(url, { signal: AbortSignal.timeout(20000) });
if (!r.ok) {
  console.error("fetch failed", r.status);
  process.exit(1);
}
const csv = (await r.text()).trim();
const rows = csv.split(/\r?\n/).length;
const date = new Date().toISOString().slice(0, 10);

// Store the raw CSV as a JSON string — JSON.stringify escapes everything safely, and
// the app parses it with parseBmaParks() so there is one parse path (live + snapshot).
writeFileSync("lib/data/bmaParks.snapshot.json", JSON.stringify({ date, csv }, null, 0) + "\n", "utf8");
console.log(`wrote lib/data/bmaParks.snapshot.json — ${rows} rows, snapshot ${date}`);
