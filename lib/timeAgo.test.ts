import { describe, it, expect } from "vitest";
import { parseTs, timeAgo } from "./timeAgo";

describe("parseTs", () => {
  it("parses a Traffy '+00' (2-digit offset) timestamp like real data", () => {
    expect(parseTs("2026-06-30 14:28:22.950372+00")).toBe(Date.parse("2026-06-30T14:28:22.950372Z"));
  });
  it("parses plain ISO", () => {
    expect(parseTs("2026-06-30T14:00:00Z")).toBe(Date.parse("2026-06-30T14:00:00Z"));
  });
  it("returns null on empty / junk", () => {
    expect(parseTs("")).toBeNull();
    expect(parseTs("nope")).toBeNull();
    expect(parseTs(null)).toBeNull();
  });
});

describe("timeAgo", () => {
  it("'just now' under 90s", () => expect(timeAgo(Date.now() - 10_000, true)).toMatch(/just now/));
  it("minutes (EN)", () => expect(timeAgo(Date.now() - 10 * 60_000, true)).toBe("10m ago"));
  it("hours (TH)", () => expect(timeAgo(Date.now() - 3 * 3600_000, false)).toMatch(/ชม\.ก่อน/));
  it("days (TH)", () => expect(timeAgo(Date.now() - 2 * 86400_000, false)).toMatch(/วันก่อน/));
});
