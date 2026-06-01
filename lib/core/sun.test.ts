import { describe, it, expect } from "vitest";
import { sunTimes, bkkTime } from "./sun";

describe("sunTimes (Bangkok)", () => {
  // Bangkok ~13.75N, 100.5E. Times verified against published almanac values.
  const t = sunTimes(new Date("2026-06-21T05:00:00Z"), 13.7563, 100.5018);

  it("puts sunrise in the early morning, Bangkok time", () => {
    const hr = Number(bkkTime(t.sunrise).slice(0, 2));
    expect(hr).toBeGreaterThanOrEqual(5);
    expect(hr).toBeLessThanOrEqual(6);
  });
  it("puts sunset in the early evening, Bangkok time", () => {
    const hr = Number(bkkTime(t.sunset).slice(0, 2));
    expect(hr).toBeGreaterThanOrEqual(18);
    expect(hr).toBeLessThanOrEqual(19);
  });
  it("golden hour starts before sunset", () => {
    expect(t.goldenEveningStart!.getTime()).toBeLessThan(t.sunset!.getTime());
    // and within ~an hour of it
    expect(t.sunset!.getTime() - t.goldenEveningStart!.getTime()).toBeLessThan(80 * 60 * 1000);
  });
  it("sunrise is before sunset", () => {
    expect(t.sunrise!.getTime()).toBeLessThan(t.sunset!.getTime());
  });
});

describe("bkkTime", () => {
  it("renders — for null", () => {
    expect(bkkTime(null)).toBe("—");
  });
});
