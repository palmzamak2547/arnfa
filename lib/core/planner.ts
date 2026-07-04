/**
 * planner.ts — time-dependent orienteering for Arnfa. Pure, no I/O.
 * Beam Search + True 2-Opt with node insertion & wait time tolerance.
 * Spec: projects/arnfa/02-architecture.md § Planner
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

const MAX_WAIT_MIN = 30; // Max minutes to wait for a place to open

type BeamState = {
  visitedIds: Set<string>;
  stops: Stop[];
  elapsedMin: number;
  totalScore: number;
  fromId: string | null;
};

/**
 * Recomputes a complete plan from a sequence of candidate IDs,
 * factoring in travel times, wait times, and time limits.
 */
function recomputePlan(
  ids: string[],
  input: PlannerInput,
  candById: Map<string, Candidate>
): PlannerOutput | null {
  const stops: Stop[] = [];
  let elapsedMin = 0;
  let prevId: string | null = null;
  let totalScore = 0;

  for (const id of ids) {
    const cand = candById.get(id);
    if (!cand) return null;

    const travelMin = prevId === null
      ? input.startTravelMin[id] ?? Infinity
      : (cand.travelMin[prevId] ?? Infinity);
    if (!isFinite(travelMin)) return null;

    let arrivalMin = elapsedMin + travelMin;
    let slotIndex = Math.floor(arrivalMin / input.slotSizeMin);

    // Wait time tolerance check
    if (cand.isOpenAt(slotIndex) === 0) {
      const nextSlotStart = (slotIndex + 1) * input.slotSizeMin;
      const wait = nextSlotStart - arrivalMin;
      if (wait <= MAX_WAIT_MIN && cand.isOpenAt(slotIndex + 1) === 1) {
        arrivalMin = nextSlotStart;
        slotIndex++;
      } else {
        return null; // Cannot visit, wait too long or not opening next slot
      }
    }

    const slotScore = cand.scoreAtSlot?.[slotIndex] ?? cand.baseScore;
    if (slotScore <= 0) return null;

    const leaveMin = arrivalMin + cand.stayMin;
    if (leaveMin > input.budgetMin) return null; // Exceeds budget limit

    stops.push({ id, slotIndex, elapsedMin: leaveMin, scoreRealized: slotScore });
    totalScore += slotScore;
    elapsedMin = leaveMin;
    prevId = id;
  }

  return { stops, totalScore, totalMin: elapsedMin };
}

/**
 * Beam Search algorithm for orienteering.
 * Maintains top K partial routes instead of just 1, allowing it to look ahead.
 */
export function planBeamSearch(input: PlannerInput, beamWidth: number = 3): PlannerOutput {
  let beam: BeamState[] = [{
    visitedIds: new Set(),
    stops: [],
    elapsedMin: 0,
    totalScore: 0,
    fromId: null,
  }];

  let bestCompletePlan: BeamState = beam[0];

  while (beam.length > 0) {
    const nextBeam: BeamState[] = [];

    for (const state of beam) {
      let expanded = false;

      for (const cand of input.candidates) {
        if (state.visitedIds.has(cand.id)) continue;

        const travelMin = state.fromId === null
          ? input.startTravelMin[cand.id] ?? Infinity
          : (cand.travelMin[state.fromId] ?? Infinity);

        let arrivalMin = state.elapsedMin + travelMin;
        let slotIndex = Math.floor(arrivalMin / input.slotSizeMin);

        // Wait time tolerance
        if (cand.isOpenAt(slotIndex) === 0) {
          const nextSlotStart = (slotIndex + 1) * input.slotSizeMin;
          const wait = nextSlotStart - arrivalMin;
          if (wait <= MAX_WAIT_MIN && cand.isOpenAt(slotIndex + 1) === 1) {
            arrivalMin = nextSlotStart;
            slotIndex++;
          } else {
            continue;
          }
        }

        const endMin = arrivalMin + cand.stayMin;
        if (endMin > input.budgetMin) continue;

        const slotScore = cand.scoreAtSlot?.[slotIndex] ?? cand.baseScore;
        if (slotScore <= 0) continue;

        expanded = true;

        nextBeam.push({
          visitedIds: new Set([...state.visitedIds, cand.id]),
          stops: [...state.stops, { id: cand.id, slotIndex, elapsedMin: endMin, scoreRealized: slotScore }],
          elapsedMin: endMin,
          totalScore: state.totalScore + slotScore,
          fromId: cand.id,
        });
      }

      if (!expanded) {
        // If we cannot add any more stops to this route, check if it's the new best complete plan
        if (state.totalScore > bestCompletePlan.totalScore) {
          bestCompletePlan = state;
        }
      }
    }

    // Heuristic for partial paths: favor high scores but penalize time spent
    nextBeam.sort((a, b) => {
      const scoreA = a.totalScore - a.elapsedMin * 0.001;
      const scoreB = b.totalScore - b.elapsedMin * 0.001;
      return scoreB - scoreA;
    });

    // Prune down to beam width
    beam = nextBeam.slice(0, beamWidth);
  }

  // Final check on remaining beam states
  for (const state of beam) {
    if (state.totalScore > bestCompletePlan.totalScore) {
      bestCompletePlan = state;
    }
  }

  return {
    stops: bestCompletePlan.stops,
    totalScore: bestCompletePlan.totalScore,
    totalMin: bestCompletePlan.elapsedMin,
  };
}

/**
 * Optimizes an existing plan using True 2-Opt (Sub-tour reversal), Node Insertion, and Node Replacement.
 */
export function optimizePlan(plan: PlannerOutput, input: PlannerInput): PlannerOutput {
  if (plan.stops.length === 0) return plan;
  
  const candById = new Map(input.candidates.map((c) => [c.id, c]));
  let currentPlan = plan;
  let improved = true;
  let iter = 0;
  const MAX_ITER = 5;

  while (improved && iter < MAX_ITER) {
    improved = false;
    iter++;

    let currentIds = currentPlan.stops.map(s => s.id);
    const unvisited = input.candidates.filter(c => !currentIds.includes(c.id));

    // 1. True 2-Opt (Reverse Sub-tours)
    // Helps untangle crossed routes. We only accept if travel time reduces and total score is maintained.
    for (let i = 0; i < currentIds.length - 1; i++) {
      for (let j = i + 1; j < currentIds.length; j++) {
        // If adjacent swap, it's just swapping 2. If j > i + 1, it reverses > 2. Both are valid.
        const swapped = [...currentIds];
        const sub = swapped.slice(i, j + 1).reverse();
        swapped.splice(i, sub.length, ...sub);

        const trial = recomputePlan(swapped, input, candById);
        if (trial && trial.totalMin < currentPlan.totalMin && trial.totalScore >= currentPlan.totalScore) {
          currentPlan = trial;
          currentIds = currentPlan.stops.map(s => s.id);
          improved = true;
        }
      }
    }

    // 2. Node Insertion
    // Try squeezing in a missed high-score node into any valid position
    insertion_loop: for (const cand of unvisited) {
      for (let i = 0; i <= currentIds.length; i++) {
        const trialIds = [...currentIds];
        trialIds.splice(i, 0, cand.id);
        const trial = recomputePlan(trialIds, input, candById);
        if (trial && trial.totalScore > currentPlan.totalScore) {
          currentPlan = trial;
          currentIds = currentPlan.stops.map(s => s.id);
          improved = true;
          // Unvisited list has changed in spirit, but we can just break and re-evaluate in next iteration
          break insertion_loop;
        }
      }
    }

    // 3. Node Replacement
    // Try kicking out an existing node for a better unvisited one
    replacement_loop: for (let i = 0; i < currentIds.length; i++) {
      for (const cand of unvisited) {
        const trialIds = [...currentIds];
        trialIds[i] = cand.id;
        const trial = recomputePlan(trialIds, input, candById);
        if (trial && trial.totalScore > currentPlan.totalScore) {
          currentPlan = trial;
          currentIds = currentPlan.stops.map(s => s.id);
          improved = true;
          break replacement_loop;
        }
      }
    }
  }

  return currentPlan;
}

export function planTrip(input: PlannerInput): PlannerOutput {
  const initialPlan = planBeamSearch(input, 3);
  return optimizePlan(initialPlan, input);
}
