/**
 * bmaParks — OFFICIAL Bangkok public parks from the city's open-data portal
 * (data.bangkok.go.th, dataset `park`). Real กทม. green-space POIs with coordinates,
 * hours, and size — the BDI "Envi Link / City Signal" data-as-trust layer (FACT, not
 * estimation). Parsed defensively: a malformed or out-of-bounds row is skipped, never
 * fabricated.
 */
import snapshot from "./bmaParks.snapshot.json"; // bundled real data — portal blocks Vercel

export type BmaPark = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  district: string;   // เขต
  hours: string;      // open_close, raw
  areaRai: number;    // leading ไร่ figure (0 if unparseable)
};

export const BMA_PARK_CSV =
  "https://data.bangkok.go.th/dataset/88c4b42a-a6cb-48c7-af7f-b9e7b11582cc/resource/c3877d89-81b3-4285-a508-2e5af1f889eb/download/public_park.csv";
export const BMA_PARK_SOURCE = "data.bangkok.go.th"; // attribution

// Bangkok bounding box — reject coordinates outside it (bad/empty rows).
const BKK = { latMin: 13.4, latMax: 14.0, lngMin: 100.2, lngMax: 100.95 };

/** Split one CSV line, honoring double-quoted fields (BMA's export is unquoted, but
 *  be safe). */
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "", q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { if (q && line[i + 1] === '"') { cur += '"'; i++; } else q = !q; }
    else if (c === "," && !q) { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

/** Pure parse of the public_park.csv body → validated parks. */
export function parseBmaParks(csv: string): BmaPark[] {
  const lines = csv.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const header = splitCsvLine(lines[0]).map((h) => h.trim());
  const col = (name: string) => header.indexOf(name);
  const ci = { name: col("park_name"), lat: col("lat"), lng: col("lng"), d: col("dname"), oc: col("open_close"), a: col("area"), id: col("id_park") };
  if (ci.name < 0 || ci.lat < 0 || ci.lng < 0) return []; // schema changed → bail honestly

  const parks: BmaPark[] = [];
  for (let i = 1; i < lines.length; i++) {
    const f = splitCsvLine(lines[i]);
    const lat = parseFloat(f[ci.lat]);
    const lng = parseFloat(f[ci.lng]);
    const name = (f[ci.name] ?? "").trim();
    if (!name || !isFinite(lat) || !isFinite(lng)) continue;
    if (lat < BKK.latMin || lat > BKK.latMax || lng < BKK.lngMin || lng > BKK.lngMax) continue;
    const areaRai = parseInt((f[ci.a] ?? "").match(/(\d+)\s*ไร่/)?.[1] ?? "0", 10) || 0;
    parks.push({
      id: (f[ci.id] ?? String(i)).trim(),
      name,
      lat, lng,
      district: (f[ci.d] ?? "").trim(),
      hours: (f[ci.oc] ?? "").trim(),
      areaRai,
    });
  }
  return parks;
}

/** Fetch + parse the official parks (server-side). Returns [] on failure (caller
 *  degrades honestly — never invents a park). Cached at the data layer for a day. */
export async function fetchBmaParks(): Promise<BmaPark[]> {
  try {
    const r = await fetch(BMA_PARK_CSV, { signal: AbortSignal.timeout(8000), next: { revalidate: 86400 } });
    if (r.ok) {
      const live = parseBmaParks(await r.text());
      if (live.length) return live; // freshest, when the portal is reachable
    }
  } catch {
    /* portal blocks/throttles cloud IPs (e.g. Vercel) → fall through to the snapshot */
  }
  // Bundled snapshot of the same official CSV — guarantees prod has the real data.
  return parseBmaParks((snapshot as { csv: string }).csv);
}

/** The date the bundled snapshot was captured from the portal (for honest provenance). */
export const BMA_PARK_SNAPSHOT_DATE = (snapshot as { date: string }).date;
