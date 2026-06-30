import { describe, it, expect } from "vitest";
import { parseCamRead, assessFlood, type CamRead } from "./vlm";

describe("parseCamRead", () => {
  it("parses clean JSON + keeps valid enums", () => {
    const r = parseCamRead('{"sky":"overcast","road":"dry","flooding":"none","traffic":"light","time_of_day":"night","confidence":0.8}');
    expect(r).toEqual({ sky: "overcast", road: "dry", flooding: "none", traffic: "light", timeOfDay: "night", confidence: 0.8 });
  });
  it("handles ```json fences + stray prose, clamps confidence to [0,1]", () => {
    const r = parseCamRead('Here you go:\n```json\n{"sky":"clear","road":"wet","flooding":"none","traffic":"jam","time_of_day":"day","confidence":1.5}\n```');
    expect(r?.sky).toBe("clear");
    expect(r?.confidence).toBe(1);
  });
  it("falls unknown values back to 'unsure' (never trusts free text)", () => {
    const r = parseCamRead('{"sky":"sunny","road":"x","flooding":"y","traffic":"z","time_of_day":"q","confidence":"bad"}');
    expect(r).toEqual({ sky: "unsure", road: "unsure", flooding: "unsure", traffic: "unsure", timeOfDay: "unsure", confidence: 0 });
  });
  it("returns null on a truncated/degenerate reply (the 'สสสส…' truncation bug)", () => {
    expect(parseCamRead('{"sky":"clear","note":"สสสสสสสสสสสสสสสสสสสส')).toBeNull();
    expect(parseCamRead("no json here at all")).toBeNull();
  });
});

const base: CamRead = { sky: "clear", road: "dry", flooding: "none", traffic: "light", timeOfDay: "day", confidence: 0.9 };

describe("assessFlood — the honesty gate (never asserts on the model alone)", () => {
  it("no flood claim → none", () => {
    expect(assessFlood(base, true).level).toBe("none");
  });
  it("NIGHT + flood claim → suppressed to none, nightCapped", () => {
    const v = assessFlood({ ...base, flooding: "street_flood", timeOfDay: "night" }, true);
    expect(v.level).toBe("none");
    expect(v.nightCapped).toBe(true);
  });
  it("daytime + flood claim + REAL rain → likely (corroborated)", () => {
    const v = assessFlood({ ...base, flooding: "street_flood" }, true);
    expect(v.level).toBe("likely");
    expect(v.rainCorroborated).toBe(true);
  });
  it("daytime + flood claim + NO rain → only 'possible' (maybe a reflection)", () => {
    expect(assessFlood({ ...base, road: "flooded" }, false).level).toBe("possible");
  });
  it("standing_water (not just 'flooded'/'street_flood') also triggers the flood path", () => {
    expect(assessFlood({ ...base, road: "standing_water" }, true).level).toBe("likely");
  });
  it("unknown rain (null) + daytime claim → 'possible', not asserted", () => {
    expect(assessFlood({ ...base, flooding: "street_flood" }, null).level).toBe("possible");
  });
});
