import { describe, expect, it } from "vitest";
import { planGreedy, planTrip, type Candidate, type PlannerInput } from "./planner";

const alwaysOpen = (() => 1) as Candidate["isOpenAt"];

function mkCand(id: string, baseScore: number, stayMin: number, travels: Record<string, number>): Candidate {
  return { id, baseScore, stayMin, travelMin: travels, isOpenAt: alwaysOpen };
}

describe("planGreedy", () => {
  it("picks highest-scoring reachable first", () => {
    const cafe = mkCand("cafe", 0.9, 60, { park: 10, market: 15 });
    const park = mkCand("park", 0.6, 90, { cafe: 10, market: 8 });
    const market = mkCand("market", 0.4, 30, { cafe: 15, park: 8 });
    const input: PlannerInput = { candidates: [cafe, park, market], budgetMin: 300, startTravelMin: { cafe: 5, park: 5, market: 5 }, slotSizeMin: 60 };
    expect(planGreedy(input).stops[0].id).toBe("cafe");
  });

  it("stops when budget exhausted", () => {
    const a = mkCand("a", 0.9, 200, { b: 30 });
    const b = mkCand("b", 0.9, 200, { a: 30 });
    const input: PlannerInput = { candidates: [a, b], budgetMin: 240, startTravelMin: { a: 5, b: 5 }, slotSizeMin: 60 };
    expect(planGreedy(input).stops.length).toBe(1);
  });

  it("respects per-slot scoring (rain swap pattern)", () => {
    const park = mkCand("park", 0.5, 60, { cafe: 10 });
    park.scoreAtSlot = { 0: 0.9, 1: 0.9, 2: 0.7, 3: 0.0, 4: 0.0 };
    const cafe = mkCand("cafe", 0.5, 60, { park: 10 });
    cafe.scoreAtSlot = { 0: 0.5, 1: 0.55, 2: 0.6, 3: 0.85, 4: 0.85 };
    const input: PlannerInput = { candidates: [park, cafe], budgetMin: 240, startTravelMin: { park: 0, cafe: 5 }, slotSizeMin: 60 };
    expect(planGreedy(input).stops.map((s) => s.id)).toEqual(["park", "cafe"]);
  });

  it("skips candidates closed at arrival", () => {
    const open: Candidate = { id: "open", baseScore: 0.5, stayMin: 30, travelMin: { closed: 10 }, isOpenAt: () => 1 };
    const closed: Candidate = { id: "closed", baseScore: 0.95, stayMin: 30, travelMin: { open: 10 }, isOpenAt: () => 0 };
    const input: PlannerInput = { candidates: [open, closed], budgetMin: 240, startTravelMin: { open: 5, closed: 5 }, slotSizeMin: 60 };
    expect(planGreedy(input).stops.find((s) => s.id === "closed")).toBeUndefined();
  });
});

describe("planTrip (greedy + 2-opt)", () => {
  it("stays under budget", () => {
    const cands: Candidate[] = [
      mkCand("a", 0.8, 45, { b: 10, c: 20, d: 15 }),
      mkCand("b", 0.7, 60, { a: 10, c: 8, d: 25 }),
      mkCand("c", 0.6, 30, { a: 20, b: 8, d: 12 }),
      mkCand("d", 0.5, 40, { a: 15, b: 25, c: 12 }),
    ];
    const input: PlannerInput = { candidates: cands, budgetMin: 300, startTravelMin: { a: 5, b: 8, c: 10, d: 12 }, slotSizeMin: 60 };
    const plan = planTrip(input);
    expect(plan.totalMin).toBeLessThanOrEqual(input.budgetMin);
    expect(plan.stops.length).toBeGreaterThan(0);
  });
});
