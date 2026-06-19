import { describe, it, expect } from "vitest";
import { applyCrowdRows, type CrowdRow } from "./crowdApply";
import type { SeedDistrict, SeedPoi } from "@/lib/plan/buildPlan";

function poi(id: string, profile: Partial<SeedPoi["profile"]> = {}): SeedPoi {
  return {
    id, osmId: 1, name: id, nameTh: null, lat: 0, lng: 0, category: "cafe",
    openingHoursRaw: null, tags: {},
    profile: { outdoorness: 0.2, indoorness: 0.8, shade: 0.1, covered: 0.9, rainEnjoyment: 0.5, heatTolerance: 0.8, confidence: 0.5, ...profile },
  };
}
const district = (pois: SeedPoi[]): SeedDistrict => ({ district: "x", districtTh: "x", bbox: [0, 0, 0, 0], fetchedAt: "", count: pois.length, pois });
const row = (o: Partial<CrowdRow> & { poi_id: string }): CrowdRow => ({ n: 0, ok: 0, bad: 0, rain_ok: 0, rain_bad: 0, ...o });

describe("applyCrowdRows — the flywheel read-back", () => {
  it("no-ops with no rows", () => {
    const d = district([poi("a")]);
    expect(applyCrowdRows(d, null)).toBe(d);
    expect(applyCrowdRows(d, [])).toBe(d);
  });

  it("ignores POIs below the verdict threshold (n < 3)", () => {
    const d = district([poi("a")]);
    const out = applyCrowdRows(d, [row({ poi_id: "a", n: 2, ok: 2 })]);
    expect(out.pois[0].crowd).toBeUndefined();
  });

  it("raises confidence + attaches crowd for confirmed POIs", () => {
    const out = applyCrowdRows(district([poi("a", { confidence: 0.5 })]), [row({ poi_id: "a", n: 5, ok: 4, bad: 1 })]);
    expect(out.pois[0].crowd).toEqual({ n: 5, okRate: 0.8 });
    expect(out.pois[0].profile.confidence).toBeGreaterThan(0.5);
    expect(out.pois[0].profile.confidence).toBeLessThanOrEqual(0.95);
  });

  it("nudges rainEnjoyment toward what visitors reported in the rain", () => {
    const base = district([poi("a", { rainEnjoyment: 0.5 })]);
    const goodInRain = applyCrowdRows(base, [row({ poi_id: "a", n: 5, ok: 5, rain_ok: 4 })]);
    expect(goodInRain.pois[0].profile.rainEnjoyment).toBeGreaterThan(0.5);
    const badInRain = applyCrowdRows(base, [row({ poi_id: "a", n: 5, bad: 5, rain_bad: 4 })]);
    expect(badInRain.pois[0].profile.rainEnjoyment).toBeLessThan(0.5);
  });

  it("never mutates the input profile (pure)", () => {
    const p = poi("a", { confidence: 0.5 });
    applyCrowdRows(district([p]), [row({ poi_id: "a", n: 5, ok: 5 })]);
    expect(p.profile.confidence).toBe(0.5);
    expect(p.crowd).toBeUndefined();
  });
});
