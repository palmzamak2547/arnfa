import { describe, expect, it } from "vitest";
import { weatherFit, finalScore, type PoiProfile, type SlotForecast } from "./weatherFit";

const COZY_CAFE: PoiProfile = { outdoorness: 0.1, indoorness: 0.9, shade: 0, covered: 1, rainEnjoyment: 0.85, heatTolerance: 0.9, confidence: 0.8 };
const OPEN_PARK: PoiProfile = { outdoorness: 0.95, indoorness: 0.05, shade: 0.4, covered: 0, rainEnjoyment: 0.05, heatTolerance: 0.3, confidence: 0.7 };
const COVERED_MARKET: PoiProfile = { outdoorness: 0.4, indoorness: 0.6, shade: 0.7, covered: 0.9, rainEnjoyment: 0.4, heatTolerance: 0.5, confidence: 0.7 };
const ROOFTOP_BAR: PoiProfile = { outdoorness: 0.8, indoorness: 0.2, shade: 0.3, covered: 0.2, rainEnjoyment: 0.1, heatTolerance: 0.4, confidence: 0.6 };

const CLEAR_SKY: SlotForecast = { hourISO: "2026-06-01T10:00:00+07:00", rainProb: 0.05, rainIntensity: 0.1, heatIndex: 0.3 };
const HEAVY_RAIN: SlotForecast = { hourISO: "2026-06-01T15:00:00+07:00", rainProb: 0.85, rainIntensity: 0.9, heatIndex: 0.4 };
const DRIZZLE: SlotForecast = { hourISO: "2026-06-01T13:00:00+07:00", rainProb: 0.5, rainIntensity: 0.3, heatIndex: 0.5 };
const BLAZING_NOON: SlotForecast = { hourISO: "2026-06-01T12:00:00+07:00", rainProb: 0.05, rainIntensity: 0.1, heatIndex: 0.95 };

describe("weatherFit() — core algorithm", () => {
  it("clear sky + open park = high fit", () => {
    expect(weatherFit(OPEN_PARK, CLEAR_SKY).fit).toBeGreaterThan(0.8);
  });

  it("heavy rain + open park = low fit", () => {
    expect(weatherFit(OPEN_PARK, HEAVY_RAIN).fit).toBeLessThan(0.5);
  });

  it("heavy rain + cozy cafe > clear sky + cozy cafe (the signature insight)", () => {
    expect(weatherFit(COZY_CAFE, HEAVY_RAIN).fit).toBeGreaterThan(weatherFit(COZY_CAFE, CLEAR_SKY).fit);
  });

  it("heavy rain: cozy cafe > open park (engine prefers indoor in rain)", () => {
    expect(weatherFit(COZY_CAFE, HEAVY_RAIN).fit).toBeGreaterThan(weatherFit(OPEN_PARK, HEAVY_RAIN).fit);
  });

  it("blazing noon: rooftop bar lower than cozy cafe", () => {
    const rooftop = weatherFit(ROOFTOP_BAR, BLAZING_NOON).fit;
    expect(rooftop).toBeLessThan(weatherFit(COZY_CAFE, BLAZING_NOON).fit);
    expect(rooftop).toBeLessThan(0.7);
  });

  it("blazing noon + cozy cafe = high fit (AC)", () => {
    expect(weatherFit(COZY_CAFE, BLAZING_NOON).fit).toBeGreaterThan(0.9);
  });

  it("covered market in drizzle holds up", () => {
    expect(weatherFit(COVERED_MARKET, DRIZZLE).fit).toBeGreaterThan(0.7);
  });

  it("fit always in [0,1]", () => {
    for (const poi of [COZY_CAFE, OPEN_PARK, COVERED_MARKET, ROOFTOP_BAR]) {
      for (const fc of [CLEAR_SKY, HEAVY_RAIN, DRIZZLE, BLAZING_NOON]) {
        const f = weatherFit(poi, fc).fit;
        expect(f).toBeGreaterThanOrEqual(0);
        expect(f).toBeLessThanOrEqual(1);
      }
    }
  });

  it("reason mentions ฝน for outdoor + rain", () => {
    expect(weatherFit(OPEN_PARK, HEAVY_RAIN).reason).toMatch(/ฝน/);
  });

  it("reason mentions ในร่ม when indoorBoost kicks in", () => {
    expect(weatherFit(COZY_CAFE, HEAVY_RAIN).reason).toMatch(/ในร่ม/);
  });
});

describe("finalScore() — composition layer", () => {
  it("isOpenAt=0 kills score", () => {
    expect(finalScore({ interest: 0.9, fit: 0.9, isOpenAt: 0, reachable: 1, proximityBoost: 1, confidence: 0.9 })).toBe(0);
  });
  it("reachable=0 kills score", () => {
    expect(finalScore({ interest: 0.9, fit: 0.9, isOpenAt: 1, reachable: 0, proximityBoost: 1, confidence: 0.9 })).toBe(0);
  });
  it("low confidence dampens score", () => {
    const high = finalScore({ interest: 0.9, fit: 0.9, isOpenAt: 1, reachable: 1, proximityBoost: 1, confidence: 0.9 });
    const low = finalScore({ interest: 0.9, fit: 0.9, isOpenAt: 1, reachable: 1, proximityBoost: 1, confidence: 0.2 });
    expect(low).toBeLessThan(high);
  });
});
