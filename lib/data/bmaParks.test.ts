import { describe, it, expect } from "vitest";
import { parseBmaParks } from "./bmaParks";

// Mirrors the real public_park.csv schema (incl. a row with an empty tel + a multi-unit
// area string), plus two rows that MUST be dropped: out-of-bounds coords and no name.
const CSV = `id_park,park_name,location,tel,open_close,dcode,dname,serviceuse,area,lat,lng
1,สวนลุมพินี,แขวงลุมพินี เขตปทุมวัน,0 2252 7006,เวลาเปิด 05.00 -21.00 น.,1007,ปทุมวัน,1654473,360 ไร่,13.73131802,100.5414322
2,สวนบางแคภิรมย์,ซอย บ้านคลองขวาง,,เวลาเปิด 05.00 -21.00 น.,1040,บางแค,192750,67 ไร่ 3 งาน 72 ตร.ว.,13.68175579,100.3853439
3,Out Of Bounds,somewhere,,,9999,นอกเขต,0,5 ไร่,0,0
4,,no name row,,,1,เขต,0,1 ไร่,13.7,100.5`;

describe("parseBmaParks — official BMA parks", () => {
  it("parses valid rows (name, district, hours, area, coords)", () => {
    const parks = parseBmaParks(CSV);
    expect(parks.length).toBe(2); // the out-of-bounds + no-name rows are dropped
    const lumpini = parks[0];
    expect(lumpini.name).toBe("สวนลุมพินี");
    expect(lumpini.district).toBe("ปทุมวัน");
    expect(lumpini.areaRai).toBe(360);
    expect(lumpini.lat).toBeCloseTo(13.7313, 3);
    expect(lumpini.lng).toBeCloseTo(100.5414, 3);
    expect(lumpini.hours).toContain("05.00");
  });

  it("drops out-of-bounds coordinates + nameless rows (never fabricates)", () => {
    const parks = parseBmaParks(CSV);
    expect(parks.every((p) => p.lat > 13.4 && p.lat < 14 && p.lng > 100.2 && p.lng < 100.95)).toBe(true);
    expect(parks.every((p) => p.name.length > 0)).toBe(true);
  });

  it("returns [] on empty or header-only input", () => {
    expect(parseBmaParks("")).toEqual([]);
    expect(parseBmaParks("id_park,park_name,lat,lng")).toEqual([]);
  });
});
