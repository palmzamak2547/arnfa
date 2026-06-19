import { NextRequest, NextResponse } from "next/server";
import { rankAreasForDay } from "@/lib/where/today";

/**
 * GET /api/where?day=0..6 — rank every area in Thailand by the chosen day's sky.
 * Thin wrapper over rankAreasForDay() (shared with the home page's live pick).
 * Sky only (rain/cloud/heat over 08:00–18:00); haze is per-station, not factored.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const day = Math.min(6, Math.max(0, parseInt(searchParams.get("day") ?? "0", 10)));

  const ranked = await rankAreasForDay(day);
  if (!ranked) return NextResponse.json({ error: "where_unavailable" }, { status: 503 });

  return NextResponse.json(
    { day, date: ranked.date, count: ranked.areas.length, areas: ranked.areas },
    { headers: { "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600" } },
  );
}
