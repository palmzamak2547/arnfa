import { describe, it, expect } from "vitest";
import { scoreDay, heatPenalty, rankAreas, type DaySample } from "./rank";

const clear: DaySample = { rainProbMean: 0.05, rainProbMax: 0.1, cloudMean: 0.15, apparentMaxC: 31 };
const rainy: DaySample = { rainProbMean: 0.8, rainProbMax: 0.95, cloudMean: 0.9, apparentMaxC: 30 };
const scorching: DaySample = { rainProbMean: 0.05, rainProbMax: 0.1, cloudMean: 0.1, apparentMaxC: 43 };

describe("heatPenalty", () => {
  it("is 0 at a pleasant 32°, ~1 at a brutal 44°", () => {
    expect(heatPenalty(31)).toBe(0);
    expect(heatPenalty(44)).toBe(1);
    expect(heatPenalty(38)).toBeCloseTo(0.5, 1);
  });
});

describe("scoreDay", () => {
  it("rates a dry, bright, mild day highly", () => {
    expect(scoreDay(clear)).toBeGreaterThan(0.8);
  });
  it("rates a wet, overcast day poorly — cool weather must NOT rescue it", () => {
    expect(scoreDay(rainy)).toBeLessThan(0.3);
  });
  it("docks a clear-but-scorching day below a clear-mild one", () => {
    expect(scoreDay(scorching)).toBeLessThan(scoreDay(clear));
  });
  it("a single wet peak drags an otherwise-okay day down", () => {
    const calm: DaySample = { rainProbMean: 0.2, rainProbMax: 0.25, cloudMean: 0.4, apparentMaxC: 33 };
    const spiky: DaySample = { rainProbMean: 0.2, rainProbMax: 0.9, cloudMean: 0.4, apparentMaxC: 33 };
    expect(scoreDay(spiky)).toBeLessThan(scoreDay(calm));
  });
});

describe("rankAreas", () => {
  it("sorts clearest-first and attaches a verdict", () => {
    const ranked = rankAreas([
      { key: "rainy", sample: rainy },
      { key: "clear", sample: clear },
      { key: "hot", sample: scorching },
    ]);
    expect(ranked[0].key).toBe("clear");
    expect(ranked[ranked.length - 1].key).toBe("rainy");
    expect(ranked[0].verdict).toBe("clearish");
    expect(typeof ranked[0].score).toBe("number");
  });
});
