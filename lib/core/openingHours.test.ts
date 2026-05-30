import { describe, expect, it } from "vitest";
import { isOpenAtISO } from "./openingHours";

// Helpers — 2026-06-01 is a Monday, 2026-06-06 a Saturday, 2026-06-07 a Sunday.
const MON_10 = "2026-06-01T10:00";
const MON_23 = "2026-06-01T23:00";
const MON_01 = "2026-06-01T01:00";
const SAT_10 = "2026-06-06T10:00";
const SUN_10 = "2026-06-07T10:00";
const SUN_20 = "2026-06-07T20:00";

describe("isOpenAtISO", () => {
  it("null/empty → unknown", () => {
    expect(isOpenAtISO(null, MON_10)).toBe("unknown");
    expect(isOpenAtISO("", MON_10)).toBe("unknown");
    expect(isOpenAtISO(undefined, MON_10)).toBe("unknown");
  });

  it("24/7 → always open", () => {
    expect(isOpenAtISO("24/7", MON_01)).toBe("open");
    expect(isOpenAtISO("24/7", SUN_20)).toBe("open");
  });

  it("all-week single range", () => {
    expect(isOpenAtISO("Mo-Su 10:00-22:00", MON_10)).toBe("open");
    expect(isOpenAtISO("Mo-Su 10:00-22:00", MON_23)).toBe("closed");
  });

  it("range with no day token = every day", () => {
    expect(isOpenAtISO("09:00-18:00", SAT_10)).toBe("open");
    expect(isOpenAtISO("09:00-18:00", "2026-06-01T19:00")).toBe("closed");
  });

  it("weekday vs weekend split", () => {
    const oh = "Mo-Fr 08:00-17:00; Sa-Su 09:00-18:00";
    expect(isOpenAtISO(oh, MON_10)).toBe("open"); // Mon 10:00 within 08-17
    expect(isOpenAtISO(oh, "2026-06-01T17:30")).toBe("closed"); // Mon after 17
    expect(isOpenAtISO(oh, SAT_10)).toBe("open"); // Sat within 09-18
    expect(isOpenAtISO(oh, SUN_20)).toBe("closed"); // Sun after 18
  });

  it("split shifts (lunch close)", () => {
    const oh = "Mo-Su 11:00-14:00,17:00-22:00";
    expect(isOpenAtISO(oh, "2026-06-01T12:00")).toBe("open");
    expect(isOpenAtISO(oh, "2026-06-01T15:00")).toBe("closed"); // afternoon gap
    expect(isOpenAtISO(oh, "2026-06-01T18:00")).toBe("open");
  });

  it("overnight wrap (bar)", () => {
    const oh = "Tu-Su 18:00-02:00";
    expect(isOpenAtISO(oh, "2026-06-02T23:00")).toBe("open"); // Tue 23:00
    expect(isOpenAtISO(oh, "2026-06-02T01:00")).toBe("open"); // Tue 01:00 (wrap)
    expect(isOpenAtISO(oh, "2026-06-02T15:00")).toBe("closed"); // Tue afternoon
  });

  it("explicit closed day", () => {
    const oh = "Mo-Sa 10:00-20:00; Su off";
    expect(isOpenAtISO(oh, SUN_10)).toBe("closed");
    expect(isOpenAtISO(oh, MON_10)).toBe("open");
  });

  it("day list", () => {
    const oh = "Mo,We,Fr 10:00-20:00";
    expect(isOpenAtISO(oh, MON_10)).toBe("open"); // Mon
    expect(isOpenAtISO(oh, "2026-06-02T10:00")).toBe("closed"); // Tue not listed
    expect(isOpenAtISO(oh, "2026-06-03T10:00")).toBe("open"); // Wed
  });

  it("unparseable → unknown (never fabricates)", () => {
    expect(isOpenAtISO("by appointment", MON_10)).toBe("unknown");
    expect(isOpenAtISO("sunrise-sunset", MON_10)).toBe("unknown");
  });

  it("handles ISO with seconds + offset", () => {
    expect(isOpenAtISO("Mo-Su 10:00-22:00", "2026-06-01T10:00:00+07:00")).toBe("open");
  });
});
