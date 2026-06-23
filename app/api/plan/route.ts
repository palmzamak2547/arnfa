import { NextRequest, NextResponse } from "next/server";
import { getForecast } from "@/lib/weather/chain";
import { buildPlan } from "@/lib/plan/buildPlan";
import { loadDistrict, districtMeta } from "@/lib/poi/districts";
import { overlayCrowd } from "@/lib/poi/crowd";
import { startIndexForDay } from "@/lib/plan/days";
import { bkkNow } from "@/lib/bkkNow";

/**
 * GET /api/plan?area=chiang-mai&budget=240&day=0  — the decision engine as an
 * endpoint, so the site AND AI agents (Arnfa MCP) can ask "plan a weather-fit day
 * here". Runs the SAME pure engine the UI uses. Iron Rule 0: real forecast or 503.
 */
const BUDGETS = new Set([150, 240, 420]);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const area = searchParams.get("area") ?? "";
  const budget = parseInt(searchParams.get("budget") ?? "240", 10);
  const day = Math.min(6, Math.max(0, parseInt(searchParams.get("day") ?? "0", 10)));
  const meta = districtMeta(area);
  if (!meta) return NextResponse.json({ error: "unknown_area", hint: "GET /api/areas for valid keys" }, { status: 400 });
  const budgetMin = BUDGETS.has(budget) ? budget : 240;

  try {
    const [districtRaw, forecast] = await Promise.all([
      loadDistrict(area),
      getForecast(meta.lat, meta.lng, 168),
    ]);
    const district = await overlayCrowd(districtRaw); // flywheel read-back (crowd-refined profiles)
    const startHourIndex = startIndexForDay(forecast.hours, day, bkkNow());
    const plan = buildPlan(district, forecast.hours, {
      startHourIndex, budgetMin, start: { lat: meta.lat, lng: meta.lng },
    });
    return NextResponse.json({
      area: { key: meta.key, th: meta.th, en: meta.en, tier: meta.tier },
      day, budgetMin, providerUsed: forecast.providerUsed,
      stops: plan.stops.map((s) => ({
        name: s.poi.name, category: s.poi.category, lat: s.poi.lat, lng: s.poi.lng,
        arrival: s.arrivalLabel, sky: s.skyState, tempC: Math.round(s.tempC),
        rainProb: Math.round(s.rainProb * 100), reason: s.reason, openStatus: s.openStatus,
        crowd: s.poi.crowd ?? null,
      })),
    }, { headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1800" } });
  } catch (e) {
    return NextResponse.json({ error: "plan_unavailable", detail: e instanceof Error ? e.message : String(e) }, { status: 503 });
  }
}
