import { describe, it, expect } from "vitest";
import { skyScoreNow, skyVerdict, worthMoving } from "./skyScore";
import type { HourlyForecast } from "@/lib/weather/types";

const f = (over: Partial<HourlyForecast>): HourlyForecast => ({
  hourISO: "2026-06-01T12:00", tempC: 31, apparentTempC: 33, rainProb: 0.1, rainIntensity: 0,
  heatIndex: 0.3, cloudCover: 0.3, uvIndex: 6, windSpeedKmh: 8, windDirectionDeg: 180,
  humidity: 0.6, weatherCode: 1, provider: "open-meteo", fetchedAt: "", ...over,
});

describe("skyScoreNow", () => {
  it("clear, dry, mild → high", () => {
    expect(skyScoreNow(f({ rainProb: 0.05, cloudCover: 0.1, heatIndex: 0.2 }))).toBeGreaterThan(0.8);
  });
  it("about to rain → low (rain dominates)", () => {
    expect(skyScoreNow(f({ rainProb: 0.9, cloudCover: 0.9, heatIndex: 0.3 }))).toBeLessThan(0.4);
  });
  it("stays within 0..1", () => {
    const s = skyScoreNow(f({ rainProb: 1, cloudCover: 1, heatIndex: 1 }));
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThanOrEqual(1);
  });
});

describe("worthMoving", () => {
  it("real gap to a good destination → yes", () => {
    expect(worthMoving(0.45, 0.7)).toBe(true);
  });
  it("marginal gap → no", () => {
    expect(worthMoving(0.6, 0.66)).toBe(false);
  });
  it("better but destination still poor → no", () => {
    expect(worthMoving(0.2, 0.4)).toBe(false);
  });
});

describe("skyVerdict", () => {
  it("maps bands", () => {
    expect(skyVerdict(0.8)).toBe("clearish");
    expect(skyVerdict(0.55)).toBe("ok");
    expect(skyVerdict(0.4)).toBe("closing");
    expect(skyVerdict(0.1)).toBe("poor");
  });
});
