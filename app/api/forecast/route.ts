import { NextRequest, NextResponse } from "next/server";
import { getForecast } from "@/lib/weather/chain";

/**
 * GET /api/forecast?lat=&lng=&hours=  — provider chain (Open-Meteo → MET Norway).
 * Iron Rule 0: all providers fail → 503 honest error (UI shows "ดูฟ้าตอนนี้ไม่ได้").
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat = parseFloat(searchParams.get("lat") ?? "13.7563");
  const lng = parseFloat(searchParams.get("lng") ?? "100.5018");
  const hours = Math.min(180, parseInt(searchParams.get("hours") ?? "24", 10)); // up to ~7 days

  if (!isFinite(lat) || !isFinite(lng)) {
    return NextResponse.json({ error: "bad lat/lng" }, { status: 400 });
  }

  try {
    const result = await getForecast(lat, lng, hours);
    return NextResponse.json(result, {
      headers: { "Cache-Control": "public, s-maxage=900, stale-while-revalidate=1800" },
    });
  } catch (e) {
    return NextResponse.json({ error: "forecast_unavailable", detail: e instanceof Error ? e.message : String(e) }, { status: 503 });
  }
}
