import { describe, it, expect } from "vitest";
import { hopEstimate, hopLabel } from "./transit";

describe("hopEstimate", () => {
  it("calls a short hop a walk", () => {
    const h = hopEstimate(13.7314, 100.578, 13.7327, 100.5849); // ~750 m in Thonglor
    expect(h.mode).toBe("walk");
    expect(h.km).toBeLessThan(1.5);
    expect(h.min).toBeGreaterThan(0);
  });
  it("calls a long hop a ride", () => {
    const h = hopEstimate(13.74, 100.53, 13.92, 100.6); // ~20 km
    expect(h.mode).toBe("ride");
    expect(h.km).toBeGreaterThan(1.5);
  });
});

describe("hopLabel", () => {
  it("formats metres under 1 km, km above, and marks the mode", () => {
    expect(hopLabel({ km: 0.35, min: 5, mode: "walk" }, false)).toContain("เดิน ~5 นาที");
    expect(hopLabel({ km: 0.35, min: 5, mode: "walk" }, false)).toContain("350 ม.");
    expect(hopLabel({ km: 3.2, min: 11, mode: "ride" }, true)).toContain("by car");
    expect(hopLabel({ km: 3.2, min: 11, mode: "ride" }, true)).toContain("3.2 km");
  });
});
