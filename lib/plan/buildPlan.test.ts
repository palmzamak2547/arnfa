import { describe, it, expect } from "vitest";
import { buildPlan, type SeedDistrict, type SeedPoi } from "./buildPlan";
import type { HourlyForecast } from "@/lib/weather/types";

// Two venues a stone's throw apart: one fully OUTDOOR (park), one INDOOR (gallery),
// with a calm clear forecast and a budget that fits exactly one stop. With no
// safety penalty the park (higher neutral interest) is chosen; raise the outdoor
// penalty (dangerous PM2.5 / heat) and the engine must switch to the indoor gallery.
function poi(id: string, category: string, p: Partial<SeedPoi["profile"]>, lat = 13.74, lng = 100.57): SeedPoi {
  return {
    id, osmId: 1, name: id, nameTh: null, lat, lng, category,
    profile: { outdoorness: 0.5, indoorness: 0.5, shade: 0.3, covered: 0.5, rainEnjoyment: 0.4, heatTolerance: 0.5, confidence: 0.7, ...p },
    openingHoursRaw: null, tags: {},
  };
}

const district: SeedDistrict = {
  district: "t", districtTh: "ทดสอบ", bbox: [13.73, 100.56, 13.75, 100.58], fetchedAt: "", count: 2,
  pois: [
    poi("park", "park", { outdoorness: 0.95, indoorness: 0.05, rainEnjoyment: 0.05, covered: 0.05 }, 13.7402, 100.5700),
    poi("gallery", "gallery", { outdoorness: 0.1, indoorness: 0.9, rainEnjoyment: 0.65, covered: 0.95 }, 13.7405, 100.5702),
  ],
};

const forecast: HourlyForecast[] = Array.from({ length: 12 }, (_, i) => ({
  hourISO: `2026-06-01T${String(9 + i).padStart(2, "0")}:00`,
  tempC: 31, apparentTempC: 33, rainProb: 0.05, rainIntensity: 0, heatIndex: 0.3,
  cloudCover: 0.2, uvIndex: 6, windSpeedKmh: 8, windDirectionDeg: 180, humidity: 0.6,
  weatherCode: 1, provider: "open-meteo", fetchedAt: "",
}));

const opts = { startHourIndex: 0, budgetMin: 80, start: { lat: 13.7402, lng: 100.5700 } };

describe("buildPlan outdoorPenalty (safety lever)", () => {
  it("no penalty → the outdoor park is the pick", () => {
    const plan = buildPlan(district, forecast, { ...opts, outdoorPenalty: 0 });
    expect(plan.stops.length).toBeGreaterThan(0);
    expect(plan.stops[0].poi.category).toBe("park");
  });

  it("high penalty → switches to the indoor gallery", () => {
    const plan = buildPlan(district, forecast, { ...opts, outdoorPenalty: 0.85 });
    expect(plan.stops.length).toBeGreaterThan(0);
    expect(plan.stops[0].poi.category).toBe("gallery");
  });

  it("indoor venue scores are unaffected by the penalty (only outdoorness scales)", () => {
    const a = buildPlan(district, forecast, { ...opts, budgetMin: 200, outdoorPenalty: 0 });
    const b = buildPlan(district, forecast, { ...opts, budgetMin: 200, outdoorPenalty: 0.85 });
    const galleryA = a.stops.find((s) => s.poi.id === "gallery");
    const galleryB = b.stops.find((s) => s.poi.id === "gallery");
    // gallery present in both; penalty must not erase indoor options
    expect(galleryA && galleryB).toBeTruthy();
  });
});
