import { describe, it, expect } from "vitest";
import { dayPeak, airPeakIsBad, type AirForecastHour } from "./forecast";
import { airFreshness } from "./air4thai";

const mk = (iso: string, pm25: number, usAqi: number): AirForecastHour => ({ iso, pm25, usAqi });

describe("dayPeak", () => {
  const hours = [
    mk("2026-06-30T06:00", 10, 40), mk("2026-06-30T15:00", 45, 120), mk("2026-06-30T22:00", 80, 200),
    mk("2026-07-01T09:00", 12, 50), mk("2026-07-01T14:00", 30, 90),
  ];
  it("picks the worst DAYTIME hour of day 0 (ignores the 22:00 night peak)", () => {
    expect(dayPeak(hours, 0)?.iso).toBe("2026-06-30T15:00");
    expect(dayPeak(hours, 0)?.pm25).toBe(45);
  });
  it("indexes by the API's own Bangkok-local date string for day 1 (no TZ math)", () => {
    expect(dayPeak(hours, 1)?.iso).toBe("2026-07-01T14:00");
  });
  it("clamps an out-of-range dayOffset to the last available day", () => {
    expect(dayPeak(hours, 9)?.iso).toBe("2026-07-01T14:00");
  });
  it("returns null on empty input", () => expect(dayPeak([], 0)).toBeNull());
});

describe("airPeakIsBad", () => {
  it("true when US-AQI > 100", () => expect(airPeakIsBad(mk("x", 20, 112))).toBe(true));
  it("true when PM2.5 > 37.5 (Thai orange)", () => expect(airPeakIsBad(mk("x", 40, 80))).toBe(true));
  it("false when clean", () => expect(airPeakIsBad(mk("x", 10, 40))).toBe(false));
  it("false on null", () => expect(airPeakIsBad(null)).toBe(false));
});

describe("airFreshness", () => {
  // build a Bangkok-local "YYYY-MM-DD HH:mm" string N hours before now
  const bkkStr = (hoursAgo: number) => new Date(Date.now() - hoursAgo * 3600_000 + 7 * 3600_000).toISOString().slice(0, 16).replace("T", " ");
  it("null when no timestamp", () => expect(airFreshness(null)).toBeNull());
  it("fresh when < 2h old (Air4Thai is hourly)", () => expect(airFreshness(bkkStr(1))?.fresh).toBe(true));
  it("stale when > 2h old", () => expect(airFreshness(bkkStr(5))?.fresh).toBe(false));
  it("exposes HH:mm", () => expect(airFreshness("2026-06-30 14:00")?.hhmm).toBe("14:00"));
});
