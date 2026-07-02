import { describe, it, expect } from "vitest";
import { scorePoiForRecommender } from "./attractionRecommender";
import type { SeedPoi } from "@/lib/plan/buildPlan";

const mockPoi: SeedPoi = {
  id: "test-spot",
  osmId: 12345,
  name: "Test Spot",
  nameTh: "สถานที่ทดสอบ",
  lat: 13.7402,
  lng: 100.5700,
  category: "park",
  profile: {
    outdoorness: 0.9,
    indoorness: 0.1,
    shade: 0.4,
    covered: 0.1,
    rainEnjoyment: 0.1,
    heatTolerance: 0.5,
    confidence: 0.9,
  },
  openingHoursRaw: "08:00-18:00",
  tags: {
    rating: "4.8",
    price: "100",
  },
};

const taste = { park: 0.8 };

describe("Attraction Recommender Utility & XAI Tests", () => {
  it("Fallback Hybrid Mode - correctly computes weighted scores and XAI tags", () => {
    const result = scorePoiForRecommender({
      poi: mockPoi,
      taste,
      distanceMeters: 500, // very close
      travelMinutes: 6,
      weatherFitScore: 0.9, // perfect weather
      isMlModelEnabled: false, // fallback
    });

    expect(result.usedMlModel).toBe(false);
    expect(result.totalScore).toBeGreaterThan(50); // should be high
    expect(result.explanation.matchesInterest).toBe(true); // taste is 0.8 >= 0.6
    expect(result.explanation.convenientTravel).toBe(true); // 500m <= 1200m
    expect(result.explanation.weatherSuitable).toBe(true); // 0.9 >= 0.75

    const sum = 
      result.explanation.scorePercentInterest +
      result.explanation.scorePercentConvenience +
      result.explanation.scorePercentWeather;
    expect(sum).toBe(100);
  });

  it("ML Recommender Mode - triggers non-linear gating when conditions are mismatched", () => {
    // Case A: Ideal ML conditions
    const ideal = scorePoiForRecommender({
      poi: mockPoi,
      taste,
      distanceMeters: 500,
      travelMinutes: 6,
      weatherFitScore: 0.9,
      isMlModelEnabled: true,
    });

    // Case B: Poor weather ML conditions (should trigger non-linear weather fit gate penalty)
    const poorWeather = scorePoiForRecommender({
      poi: mockPoi,
      taste,
      distanceMeters: 500,
      travelMinutes: 6,
      weatherFitScore: 0.2, // severe weather mismatch
      isMlModelEnabled: true,
    });

    expect(ideal.usedMlModel).toBe(true);
    expect(poorWeather.usedMlModel).toBe(true);
    // Severe weather fit score (< 0.4) triggers a non-linear multiplier gate (x0.2), making its score drop steeply
    expect(poorWeather.totalScore).toBeLessThan(ideal.totalScore * 0.4);
  });
});
