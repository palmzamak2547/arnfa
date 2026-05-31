import { describe, it, expect } from "vitest";
import { nearestShelter } from "./shelter";
import type { SeedPoi } from "@/lib/plan/buildPlan";

function poi(id: string, lat: number, lng: number, indoorness: number, covered = indoorness): SeedPoi {
  return {
    id, osmId: 1, name: id, nameTh: null, lat, lng, category: "cafe",
    profile: { outdoorness: 1 - indoorness, indoorness, shade: 0.3, covered, rainEnjoyment: 0.5, heatTolerance: 0.5, confidence: 0.7 },
    openingHoursRaw: null, tags: {},
  };
}

const here = { lat: 13.74, lng: 100.57 };

describe("nearestShelter", () => {
  it("returns null when there are no POIs", () => {
    expect(nearestShelter([], here.lat, here.lng)).toBeNull();
  });

  it("prefers the nearest COVERED venue over a closer open one", () => {
    const pois = [
      poi("open-park", 13.7401, 100.5701, 0.05), // very close but not covered
      poi("indoor-cafe", 13.7410, 100.5710, 0.9), // a bit further, covered
    ];
    const s = nearestShelter(pois, here.lat, here.lng)!;
    expect(s.poi.id).toBe("indoor-cafe");
    expect(s.covered).toBe(true);
    expect(s.walkMin).toBeGreaterThanOrEqual(0);
  });

  it("among covered venues, picks the closest", () => {
    const pois = [
      poi("mall-far", 13.7600, 100.5900, 0.95),
      poi("cafe-near", 13.7405, 100.5705, 0.85),
    ];
    expect(nearestShelter(pois, here.lat, here.lng)!.poi.id).toBe("cafe-near");
  });

  it("falls back to nearest overall (covered=false) when nothing is indoor", () => {
    const pois = [poi("park-a", 13.7402, 100.5702, 0.05), poi("park-b", 13.7500, 100.5800, 0.05)];
    const s = nearestShelter(pois, here.lat, here.lng)!;
    expect(s.poi.id).toBe("park-a");
    expect(s.covered).toBe(false);
  });
});
