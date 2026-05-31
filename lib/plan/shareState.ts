/**
 * shareState.ts — encode/decode a plan's inputs in the URL.
 *
 * The viral unit: a shared link reproduces the EXACT plan (district + time budget
 * + whether the rain-swap was triggered). Pure, tiny, URLSearchParams-based — no
 * server state, no DB. A friend who opens the link sees the same day-plan you did.
 *
 * We encode only the *inputs* (deterministic) not the computed stops, so the plan
 * always re-derives from live forecast + seed data — honest + always fresh.
 */

export type PlanState = {
  district: string;
  budgetMin: number;
  rain: boolean;
};

export const DEFAULT_PLAN_STATE: PlanState = {
  district: "thonglor",
  budgetMin: 240,
  rain: false,
};

const VALID_BUDGETS = [150, 240, 420];

export function encodePlanState(s: PlanState): string {
  const p = new URLSearchParams();
  p.set("y", s.district);          // y = ย่าน (district)
  p.set("t", String(s.budgetMin)); // t = time budget
  if (s.rain) p.set("r", "1");     // r = rain-swap engaged
  return p.toString();
}

/** Decode from a query string, validating against known values (never trust URL). */
export function decodePlanState(
  query: string,
  knownDistricts: string[],
): PlanState {
  const p = new URLSearchParams(query);
  const district = p.get("y") ?? "";
  const budget = parseInt(p.get("t") ?? "", 10);
  return {
    district: knownDistricts.includes(district) ? district : DEFAULT_PLAN_STATE.district,
    budgetMin: VALID_BUDGETS.includes(budget) ? budget : DEFAULT_PLAN_STATE.budgetMin,
    rain: p.get("r") === "1",
  };
}
