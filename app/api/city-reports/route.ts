import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/city-reports?lat=&lng=&n=  — live citizen city-reports near a point, from the public
 * **Traffy Fondue** feed (Bangkok's official citizen-report platform, teamchadchart). This is the
 * keynote's third "City Signal" — *citizen feedback* — alongside weather + PM2.5: before you go,
 * is the STREET ok here, not just the sky? Trip-relevant reports (flood / footpath / road) are
 * flagged. Iron Rule 0: provider fails → empty list, never a fabricated report.
 *
 * Traffy's public search geo-SORTS by lat/long but doesn't hard-filter, so we pull a batch and
 * haversine-filter to a radius ourselves.
 */
export const revalidate = 0;

type Raw = { description?: string; coords?: [string, string] | string[]; address?: string; state?: string; timestamp?: string; ticket_id?: string; photo_url?: string };

function km(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371, p = Math.PI / 180;
  const h = Math.sin((bLat - aLat) * p / 2) ** 2 + Math.cos(aLat * p) * Math.cos(bLat * p) * Math.sin((bLng - aLng) * p / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// trip-relevant keywords (Thai) → these reports actually affect a journey/outdoor plan
const TRIP_RE = /(น้ำท่วม|น้ำขัง|ท่วม|ทางเท้า|ฟุตปาท|ทางเดิน|ถนน|ผิวจราจร|ทางม้าลาย|สะพาน|ไฟ(ทาง|ส่องสว่าง|ดับ)|ต้นไม้|กีดขวาง|จราจร|รถ|ฝุ่น|ควัน|กลิ่น|น้ำเสีย|ท่อ)/;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat = parseFloat(searchParams.get("lat") ?? "");
  const lng = parseFloat(searchParams.get("lng") ?? "");
  const n = Math.min(8, Math.max(1, parseInt(searchParams.get("n") ?? "5", 10) || 5));
  const radiusKm = 2.5;
  if (!isFinite(lat) || !isFinite(lng)) return NextResponse.json({ error: "bad lat/lng" }, { status: 400 });

  try {
    const url = `https://publicapi.traffy.in.th/share/teamchadchart/search?limit=80&lat=${lat}&long=${lng}`;
    const r = await fetch(url, { signal: AbortSignal.timeout(8000), headers: { Accept: "application/json" } });
    if (!r.ok) throw new Error(`traffy ${r.status}`);
    const j = (await r.json()) as { results?: Raw[] };
    const reports = (j.results ?? [])
      .map((x) => {
        const c = x.coords;
        const rlng = c ? parseFloat(String(c[0])) : NaN;
        const rlat = c ? parseFloat(String(c[1])) : NaN;
        if (!isFinite(rlat) || !isFinite(rlng)) return null;
        const d = km(lat, lng, rlat, rlng);
        const desc = (x.description || "").trim();
        return {
          desc: desc.slice(0, 140),
          lat: rlat, lng: rlng, distKm: Math.round(d * 100) / 100,
          state: x.state || "",
          address: (x.address || "").slice(0, 120),
          timestamp: x.timestamp || "",
          ticketId: x.ticket_id || "",
          photoUrl: x.photo_url || "",
          tripRelevant: TRIP_RE.test(desc),
        };
      })
      .filter((x): x is NonNullable<typeof x> => !!x && x.distKm <= radiusKm)
      // trip-relevant first, then nearest
      .sort((a, b) => (Number(b.tripRelevant) - Number(a.tripRelevant)) || (a.distKm - b.distKm))
      .slice(0, n);

    return NextResponse.json(
      { reports, source: "traffy-fondue", fetchedAt: new Date().toISOString() },
      { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900" } },
    );
  } catch (e) {
    return NextResponse.json({ reports: [], error: e instanceof Error ? e.message : "unavailable" }, { status: 200 });
  }
}
