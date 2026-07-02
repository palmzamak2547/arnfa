import { NextRequest, NextResponse } from "next/server";
import { nearestBusStops } from "@/lib/data/transitGraph";

const KEY = process.env.LONGDO_KEY ?? "";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat = parseFloat(searchParams.get("lat") ?? "");
  const lng = parseFloat(searchParams.get("lng") ?? "");
  if (!isFinite(lat) || !isFinite(lng)) {
    return NextResponse.json({ error: "missing_coords" }, { status: 400 });
  }

  // 1. Try to query Longdo search API if KEY is available
  if (KEY) {
    try {
      const url = `https://search.longdo.com/mapsearch/json/search?keyword=${encodeURIComponent("ป้ายรถเมล์")}&limit=50&key=${KEY}&location=${lng},${lat}&span=3km`;
      const r = await fetch(url, { signal: AbortSignal.timeout(4000) });
      if (r.ok) {
        const d = await r.json();
        const stations = (d.data ?? [])
          .filter((item: any) => item.lat && item.lon)
          .map((item: any, i: number) => ({
            id: `longdo-bus-${i}-${item.lat}-${item.lon}`,
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon),
            nameTh: item.name ?? "ป้ายรถเมล์",
            nameEn: item.name ?? "Bus Stop",
            system: "BMTA",
            color: "#FACC15",
            source: "longdo",
          }));
        if (stations.length > 0) {
          return NextResponse.json(
            { source: "longdo", stations },
            { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } }
          );
        }
      }
    } catch (err) {
      console.warn("Longdo bus stops API failed, falling back to local data:", err);
    }
  }

  // 2. Fallback to offline BMTA nodes database
  const offlineStops = nearestBusStops(lat, lng, 2.5);
  const stations = offlineStops.map((n) => ({
    id: n.id,
    lat: n.lat,
    lng: n.lng,
    nameTh: n.nameTh && n.nameTh !== "nan" ? n.nameTh : "ป้ายรถเมล์",
    nameEn: n.nameEn && n.nameEn !== "nan" ? n.nameEn : "Bus Stop",
    system: "BMTA",
    color: "#FACC15",
    source: n.source || "osm",
  }));

  return NextResponse.json(
    { source: "local-osm", stations },
    { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=172800" } }
  );
}
