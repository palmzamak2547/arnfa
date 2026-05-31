import { describe, it, expect } from "vitest";
import { gibsDate, gibsTileUrl, gibsLayer, GIBS_LAYERS } from "./gibs";

describe("gibsDate", () => {
  it("returns yesterday in UTC, zero-padded YYYY-MM-DD", () => {
    expect(gibsDate(new Date("2026-03-15T08:00:00Z"))).toBe("2026-03-14");
  });
  it("rolls back across a month boundary", () => {
    expect(gibsDate(new Date("2026-03-01T00:30:00Z"))).toBe("2026-02-28");
  });
  it("rolls back across a year boundary", () => {
    expect(gibsDate(new Date("2026-01-01T02:00:00Z"))).toBe("2025-12-31");
  });
  it("honours a custom lag (AOD needs D-2)", () => {
    expect(gibsDate(new Date("2026-03-15T08:00:00Z"), 2)).toBe("2026-03-13");
  });
});

describe("gibsTileUrl", () => {
  it("builds a MapLibre {z}/{y}/{x} template with the layer id, date and ext", () => {
    const url = gibsTileUrl(gibsLayer("truecolor"), "2026-03-14");
    expect(url).toContain("MODIS_Terra_CorrectedReflectance_TrueColor");
    expect(url).toContain("/2026-03-14/");
    expect(url).toContain("GoogleMapsCompatible_Level9");
    expect(url).toContain("{z}/{y}/{x}.jpg");
    expect(url.startsWith("https://gibs.earthdata.nasa.gov/")).toBe(true);
  });
  it("uses png for the aerosol layer", () => {
    expect(gibsTileUrl(gibsLayer("aerosol"), "2026-03-14")).toContain("{z}/{y}/{x}.png");
  });
});

describe("GIBS_LAYERS", () => {
  it("exposes truecolor + aerosol with sane native zooms", () => {
    expect(GIBS_LAYERS.map((l) => l.key).sort()).toEqual(["aerosol", "truecolor"]);
    for (const l of GIBS_LAYERS) expect(l.maxNativeZoom).toBeGreaterThan(0);
  });
});
