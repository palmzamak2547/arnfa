import { describe, expect, it } from "vitest";
import { encodePlanState, decodePlanState, DEFAULT_PLAN_STATE } from "./shareState";

const KNOWN = ["thonglor", "ari", "silom", "siam", "ekkamai", "phranakhon"];

describe("plan share state", () => {
  it("round-trips a plan", () => {
    const s = { district: "silom", budgetMin: 420, rain: true, day: 3 };
    expect(decodePlanState(encodePlanState(s), KNOWN)).toEqual(s);
  });

  it("omits rain and day=0 when default", () => {
    expect(encodePlanState({ district: "ari", budgetMin: 150, rain: false, day: 0 })).toBe("y=ari&t=150");
  });

  it("day offset parses + validates range", () => {
    expect(decodePlanState("y=siam&t=420&d=5", KNOWN).day).toBe(5);
    expect(decodePlanState("y=siam&t=420&d=99", KNOWN).day).toBe(0);
  });

  it("falls back on unknown district", () => {
    expect(decodePlanState("y=hogwarts&t=240", KNOWN).district).toBe(DEFAULT_PLAN_STATE.district);
  });

  it("falls back on invalid budget", () => {
    expect(decodePlanState("y=ari&t=999", KNOWN).budgetMin).toBe(DEFAULT_PLAN_STATE.budgetMin);
  });

  it("empty query = defaults", () => {
    expect(decodePlanState("", KNOWN)).toEqual(DEFAULT_PLAN_STATE);
  });

  it("rain flag parses", () => {
    expect(decodePlanState("y=siam&t=420&r=1", KNOWN).rain).toBe(true);
    expect(decodePlanState("y=siam&t=420", KNOWN).rain).toBe(false);
  });
});
