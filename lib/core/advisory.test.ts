import { describe, it, expect } from "vitest";
import { dayAdvisory } from "./advisory";
import type { HourlyForecast } from "@/lib/weather/types";

function hour(h: number, over: Partial<HourlyForecast> = {}): HourlyForecast {
  return {
    hourISO: `2026-06-01T${String(h).padStart(2, "0")}:00`,
    tempC: 30, apparentTempC: 32, rainProb: 0.1, rainIntensity: 0.05, heatIndex: 0.3,
    cloudCover: 0.3, uvIndex: 5, windSpeedKmh: 10, windDirectionDeg: 180, humidity: 0.65,
    weatherCode: 1, provider: "open-meteo", fetchedAt: "2026-06-01T00:00:00Z", ...over,
  };
}
const day = (over: Partial<HourlyForecast>) => Array.from({ length: 12 }, (_, i) => hour(8 + i, over));

describe("dayAdvisory", () => {
  it("returns null for an empty window", () => {
    expect(dayAdvisory([])).toBeNull();
  });

  it("hot, high-UV, dry day → sunscreen + water + shades, no umbrella, no danger", () => {
    const a = dayAdvisory(day({ apparentTempC: 37, uvIndex: 9, rainProb: 0.1, heatIndex: 0.5 }))!;
    const ids = a.packing.map((p) => p.id);
    expect(ids).toContain("sunscreen");
    expect(ids).toContain("water");
    expect(ids).toContain("shades");
    expect(ids).not.toContain("umbrella");
    expect(a.outfit.th).toMatch(/ร้อน/);
    expect(a.outdoorPenalty).toBe(0); // hot but not dangerous heat-index
  });

  it("rainy day → umbrella packed + outfit mentions rain", () => {
    const a = dayAdvisory(day({ rainProb: 0.7, rainIntensity: 0.4, uvIndex: 2 }))!;
    expect(a.packing.map((p) => p.id)).toContain("umbrella");
    expect(a.outfit.th).toMatch(/ฝน/);
  });

  it("unhealthy PM2.5 → danger flag + mask + outdoorPenalty 0.6", () => {
    const a = dayAdvisory(day({}), { pm25: 78, level: "unhealthy" })!;
    expect(a.safety.some((s) => s.level === "danger" && /PM2\.5/.test(s.th))).toBe(true);
    expect(a.packing.map((p) => p.id)).toContain("mask");
    expect(a.outdoorPenalty).toBeCloseTo(0.6);
  });

  it("very-unhealthy air pushes the strongest indoor penalty", () => {
    const a = dayAdvisory(day({}), { pm25: 180, level: "very-unhealthy" })!;
    expect(a.outdoorPenalty).toBeCloseTo(0.85);
  });

  it("dangerous heat index flags danger and a penalty even with clean air", () => {
    const a = dayAdvisory(day({ heatIndex: 0.9, apparentTempC: 41 }))!;
    expect(a.safety.some((s) => s.level === "danger" && /ความร้อน/.test(s.th))).toBe(true);
    expect(a.outdoorPenalty).toBeGreaterThanOrEqual(0.45);
  });

  it("good air + mild day → no danger flags, penalty 0", () => {
    const a = dayAdvisory(day({ apparentTempC: 30, uvIndex: 4, rainProb: 0.1, heatIndex: 0.2 }), { pm25: 12, level: "good" })!;
    expect(a.safety.filter((s) => s.level === "danger")).toHaveLength(0);
    expect(a.outdoorPenalty).toBe(0);
  });
});
