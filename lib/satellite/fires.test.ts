import { describe, it, expect } from "vitest";
import { parseFirmsCsv, summarizeFires, haversineKm } from "./fires";

// A realistic VIIRS area-CSV sample (header order matches FIRMS NRT output).
const CSV = `latitude,longitude,bright_ti4,scan,track,acq_date,acq_time,satellite,instrument,confidence,version,bright_ti5,frp,daynight
18.812,98.951,330.1,0.5,0.5,2026-03-14,0712,N,VIIRS,n,2.0NRT,295.3,12.4,D
18.900,99.100,345.2,0.4,0.4,2026-03-14,0712,N,VIIRS,h,2.0NRT,300.1,40.9,D
19.500,99.900,320.0,0.6,0.6,2026-03-14,1930,N,VIIRS,l,2.0NRT,290.0,5.1,N`;

describe("parseFirmsCsv", () => {
  it("parses rows regardless of exact column layout", () => {
    const pts = parseFirmsCsv(CSV);
    expect(pts).toHaveLength(3);
    expect(pts[0]).toMatchObject({ lat: 18.812, lng: 98.951, acqDate: "2026-03-14", frp: 12.4, confidence: "n" });
  });
  it("returns [] for an empty or header-only body", () => {
    expect(parseFirmsCsv("")).toEqual([]);
    expect(parseFirmsCsv("latitude,longitude,frp")).toEqual([]);
  });
  it("skips rows with unparseable coordinates", () => {
    const pts = parseFirmsCsv("latitude,longitude,frp\nx,y,1\n13.0,100.0,2");
    expect(pts).toHaveLength(1);
  });
});

describe("haversineKm", () => {
  it("is ~0 for the same point and positive for distinct points", () => {
    expect(haversineKm(18.8, 98.9, 18.8, 98.9)).toBeCloseTo(0, 3);
    expect(haversineKm(18.8, 98.9, 19.5, 99.9)).toBeGreaterThan(50);
  });
});

describe("summarizeFires", () => {
  const pts = parseFirmsCsv(CSV);
  it("counts only fires inside the radius and reports the nearest + hottest", () => {
    // origin = Chiang Mai city; first two fires are close, the third ~100km+ away
    const s = summarizeFires(pts, 18.79, 98.98, 40);
    expect(s.count).toBe(2);
    expect(s.nearestKm).not.toBeNull();
    expect(s.nearestKm!).toBeLessThan(40);
    expect(s.maxFrp).toBe(40.9);
  });
  it("returns a null nearest when nothing is in range", () => {
    const s = summarizeFires(pts, 13.74, 100.57, 30); // Bangkok — far from all
    expect(s.count).toBe(0);
    expect(s.nearestKm).toBeNull();
  });
});
