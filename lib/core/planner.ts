/**
 * planner.ts — time-dependent orienteering for Arnfa. Pure, no I/O.
 * Greedy + 2-opt. Spec: projects/arnfa/02-architecture.md § Planner
 */

export type Candidate = {
  id: string;
  baseScore: number;
  scoreAtSlot?: Record<number, number>;
  travelMin: Record<string, number>;
  stayMin: number;
  isOpenAt: (slotIndex: number) => 0 | 1;
};

export type PlannerInput = {
  candidates: Candidate[];
  budgetMin: number;
  startTravelMin: Record<string, number>;
  slotSizeMin: number;
};

export type Stop = {
  id: string;
  slotIndex: number;
  elapsedMin: number;
  scoreRealized: number;
};

export type PlannerOutput = {
  stops: Stop[];
  totalScore: number;
  totalMin: number;
};

function pickNext(
  remaining: Candidate[],
  fromId: string | null,
  elapsedMin: number,
  input: PlannerInput,
): { cand: Candidate; travelMin: number; slotIndex: number } | null {
  let best: { cand: Candidate; travelMin: number; slotIndex: number; score: number } | null = null;

  for (const cand of remaining) {
    const travelMin = fromId === null
      ? input.startTravelMin[cand.id] ?? Infinity
      : (cand.travelMin[fromId] ?? Infinity);

    const arrivalMin = elapsedMin + travelMin;
    const slotIndex = Math.floor(arrivalMin / input.slotSizeMin);
    if (cand.isOpenAt(slotIndex) === 0) continue;

    const endMin = arrivalMin + cand.stayMin;
    if (endMin > input.budgetMin) continue;

    const slotScore = cand.scoreAtSlot?.[slotIndex] ?? cand.baseScore;
    if (slotScore <= 0) continue;

    const composite = slotScore - travelMin * 0.001;
    if (best === null || composite > best.score) {
      best = { cand, travelMin, slotIndex, score: composite };
    }
  }

  return best;
}

export function planGreedy(input: PlannerInput): PlannerOutput {
  const remaining = [...input.candidates];
  const stops: Stop[] = [];
  let elapsedMin = 0;
  let fromId: string | null = null;
  let totalScore = 0;

  while (remaining.length > 0) {
    const pick = pickNext(remaining, fromId, elapsedMin, input);
    if (pick === null) break;

    const arrivalMin = elapsedMin + pick.travelMin;
    const slotScore = pick.cand.scoreAtSlot?.[pick.slotIndex] ?? pick.cand.baseScore;
    const leaveMin = arrivalMin + pick.cand.stayMin;

    stops.push({ id: pick.cand.id, slotIndex: pick.slotIndex, elapsedMin: leaveMin, scoreRealized: slotScore });
    totalScore += slotScore;
    elapsedMin = leaveMin;
    fromId = pick.cand.id;

    remaining.splice(remaining.indexOf(pick.cand), 1);
  }

  return { stops, totalScore, totalMin: elapsedMin };
}

export function twoOpt(plan: PlannerOutput, input: PlannerInput): PlannerOutput {
  if (plan.stops.length < 3) return plan;
  const candById = new Map(input.candidates.map((c) => [c.id, c]));

  const ids = plan.stops.map((s) => s.id);
  let improved = true;
  let iter = 0;
  while (improved && iter < 5) {
    improved = false;
    iter++;
    for (let i = 0; i < ids.length - 1; i++) {
      const swapped = [...ids];
      [swapped[i], swapped[i + 1]] = [swapped[i + 1], swapped[i]];
      const baseline = recomputeTravelOnly(ids, input, candById);
      const trial = recomputeTravelOnly(swapped, input, candById);
      if (trial !== null && baseline !== null && trial.totalTravel < baseline.totalTravel) {
        ids[i] = swapped[i];
        ids[i + 1] = swapped[i + 1];
        improved = true;
      }
    }
  }

  return rebuildFromOrder(ids, input, candById);
}

function recomputeTravelOnly(
  ids: string[],
  input: PlannerInput,
  candById: Map<string, Candidate>,
): { totalTravel: number } | null {
  let totalTravel = 0;
  let prevId: string | null = null;
  let elapsedMin = 0;
  for (const id of ids) {
    const cand = candById.get(id);
    if (!cand) return null;
    const travelMin = prevId === null
      ? input.startTravelMin[id] ?? Infinity
      : (cand.travelMin[prevId] ?? Infinity);
    if (!isFinite(travelMin)) return null;

    const arrivalMin = elapsedMin + travelMin;
    const slotIndex = Math.floor(arrivalMin / input.slotSizeMin);
    if (cand.isOpenAt(slotIndex) === 0) return null;

    totalTravel += travelMin;
    elapsedMin = arrivalMin + cand.stayMin;
    if (elapsedMin > input.budgetMin) return null;
    prevId = id;
  }
  return { totalTravel };
}

function rebuildFromOrder(
  ids: string[],
  input: PlannerInput,
  candById: Map<string, Candidate>,
): PlannerOutput {
  const stops: Stop[] = [];
  let elapsedMin = 0;
  let prevId: string | null = null;
  let totalScore = 0;

  for (const id of ids) {
    const cand = candById.get(id)!;
    const travelMin = prevId === null
      ? input.startTravelMin[id] ?? 0
      : (cand.travelMin[prevId] ?? 0);
    const arrivalMin = elapsedMin + travelMin;
    const slotIndex = Math.floor(arrivalMin / input.slotSizeMin);
    const slotScore = cand.scoreAtSlot?.[slotIndex] ?? cand.baseScore;
    const leaveMin = arrivalMin + cand.stayMin;
    stops.push({ id, slotIndex, elapsedMin: leaveMin, scoreRealized: slotScore });
    totalScore += slotScore;
    elapsedMin = leaveMin;
    prevId = id;
  }

  return { stops, totalScore, totalMin: elapsedMin };
}

export function planTrip(input: PlannerInput): PlannerOutput {
  return twoOpt(planGreedy(input), input);
}
