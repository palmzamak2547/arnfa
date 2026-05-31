import { describe, it, expect } from "vitest";
import { summarizeNowcast, type NowcastSlot } from "./nowcast";

// Anchor "now" at local 12:00 and build 15-min slots from it. Open-Meteo returns
// LOCAL-naive timestamps (timezone=Asia/Bangkok, no "Z"), so we format the same
// way — new Date(naive) parses as local, matching how the function reads them.
const NOW = new Date("2026-06-01T12:00:00").getTime();
const pad = (n: number) => String(n).padStart(2, "0");
const localISO = (ms: number) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const slot = (minFromNow: number, mm: number): NowcastSlot => ({ minISO: localISO(NOW + minFromNow * 60000), mm });

describe("summarizeNowcast", () => {
  it("dry ahead → rainInMin null", () => {
    const s = summarizeNowcast([slot(0, 0), slot(15, 0), slot(30, 0.05)], NOW);
    expect(s.rainInMin).toBeNull();
    expect(s.maxMm).toBeCloseTo(0.05);
  });

  it("rain in the third slot → ~30 min", () => {
    const s = summarizeNowcast([slot(0, 0), slot(15, 0.1), slot(30, 0.8), slot(45, 1.2)], NOW);
    expect(s.rainInMin).toBe(30);
    expect(s.maxMm).toBeCloseTo(1.2);
  });

  it("already raining (current slot wet) → 0 min", () => {
    const s = summarizeNowcast([slot(0, 0.6), slot(15, 0.9)], NOW);
    expect(s.rainInMin).toBe(0);
  });

  it("ignores a tiny trace below the wet threshold", () => {
    const s = summarizeNowcast([slot(0, 0.1), slot(15, 0.15)], NOW);
    expect(s.rainInMin).toBeNull();
  });
});
