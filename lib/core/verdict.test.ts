import { describe, expect, it } from "vitest";
import { dayVerdict, outdoorGoodness } from "./verdict";
import type { HourlyForecast } from "@/lib/weather/types";

function hour(h: number, o: Partial<HourlyForecast> = {}): HourlyForecast {
  return {
    hourISO: `2026-06-01T${String(h).padStart(2, "0")}:00:00+07:00`,
    tempC: 32, apparentTempC: 36, rainProb: 0.05, rainIntensity: 0.1, heatIndex: 0.3,
    cloudCover: 0.2, uvIndex: 6, windSpeedKmh: 8, windDirectionDeg: 180, humidity: 0.6,
    weatherCode: 1, provider: "open-meteo", fetchedAt: "2026-06-01T09:00:00+07:00",
    ...o,
  };
}

describe("outdoorGoodness", () => {
  it("is 0 at night", () => {
    expect(outdoorGoodness(hour(2))).toBe(0);
    expect(outdoorGoodness(hour(22))).toBe(0);
  });
  it("is high on a clear mild daytime hour", () => {
    expect(outdoorGoodness(hour(10, { rainProb: 0.05, heatIndex: 0.2 }))).toBeGreaterThan(0.8);
  });
  it("drops with rain", () => {
    expect(outdoorGoodness(hour(15, { rainProb: 0.9, rainIntensity: 0.9 }))).toBeLessThan(0.3);
  });
  it("drops with extreme heat", () => {
    expect(outdoorGoodness(hour(13, { heatIndex: 0.95 }))).toBeLessThan(0.6);
  });
});

describe("dayVerdict", () => {
  it("GO when now is clear and mild", () => {
    const hours = [10, 11, 12, 13, 14].map((h) => hour(h, { rainProb: 0.05, heatIndex: 0.25 }));
    const v = dayVerdict(hours, 0);
    expect(v.kind).toBe("go");
    expect(v.headline).toMatch(/ออกได้เลย/);
  });

  it("WAIT when now is rainy but a clear window comes later", () => {
    const hours = [
      hour(11, { rainProb: 0.8, rainIntensity: 0.8, heatIndex: 0.3 }),
      hour(12, { rainProb: 0.7, rainIntensity: 0.7 }),
      hour(13, { rainProb: 0.5, rainIntensity: 0.5 }),
      hour(14, { rainProb: 0.05, rainIntensity: 0.1, heatIndex: 0.25 }),
      hour(15, { rainProb: 0.05, rainIntensity: 0.1, heatIndex: 0.2 }),
      hour(16, { rainProb: 0.05, rainIntensity: 0.1, heatIndex: 0.2 }),
    ];
    const v = dayVerdict(hours, 0);
    expect(v.kind).toBe("wait");
    expect(v.bestHourISO).not.toBeNull();
    expect(v.windowLabel).toMatch(/\d\d:\d\d–\d\d:\d\d/);
  });

  it("STAY when rain dominates the whole range", () => {
    const hours = [11, 12, 13, 14, 15, 16].map((h) => hour(h, { rainProb: 0.85, rainIntensity: 0.85 }));
    const v = dayVerdict(hours, 0);
    expect(v.kind).toBe("stay");
    expect(v.headline).toMatch(/ในร่ม/);
  });

  it("STAY when extreme heat dominates", () => {
    const hours = [11, 12, 13, 14, 15].map((h) => hour(h, { heatIndex: 0.95, rainProb: 0.0 }));
    const v = dayVerdict(hours, 0);
    expect(v.kind).toBe("stay");
  });

  it("handles empty input gracefully", () => {
    const v = dayVerdict([], 0);
    expect(v.kind).toBe("stay");
  });
});
