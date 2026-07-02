import type { SeedPoi } from "@/lib/plan/buildPlan";
import type { TasteVector } from "@/lib/plan/buildPlan";

export interface RecommendationDetails {
  poiId: string;
  totalScore: number;
  usedMlModel: boolean;
  explanation: {
    matchesInterest: boolean;    // "ตรงกับความสนใจ"
    convenientTravel: boolean;   // "เดินทางสะดวก"
    weatherSuitable: boolean;    // "เหมาะกับอากาศ"
    // Percentage contributions for visual graphs
    scorePercentInterest: number;
    scorePercentConvenience: number;
    scorePercentWeather: number;
  };
}

/**
 * Recommends and scores an attraction. If ML is not available/enabled, 
 * it falls back to a hybrid weighted scoring logic.
 */
export function scorePoiForRecommender(params: {
  poi: SeedPoi;
  taste: TasteVector;
  distanceMeters: number;
  travelMinutes: number;
  weatherFitScore: number;
  isMlModelEnabled: boolean;
}): RecommendationDetails {
  const { poi, taste, distanceMeters, travelMinutes, weatherFitScore, isMlModelEnabled } = params;

  // Extract variables
  const tasteVal = taste[poi.category] ?? 0.4;
  const ratingVal = parseFloat(poi.tags.rating ?? "4.5") / 5.0; // scale to 0.0 - 1.0

  // 1. Calculate Component Utilities
  // Taste/Preference Utility (Interest)
  const interestUtility = 0.7 * tasteVal + 0.3 * ratingVal;

  // Convenience/Travel Utility
  const distanceScore = Math.max(0, 1.0 - distanceMeters / 5000); // 1.0 if close, 0.0 if >5km
  const timeScore = Math.max(0, 1.0 - travelMinutes / 60);
  const convenienceUtility = 0.6 * distanceScore + 0.4 * timeScore;

  // Weather Utility
  const weatherUtility = weatherFitScore;

  let totalScore = 0.0;

  if (isMlModelEnabled) {
    // 🧠 ML Mode: Simulated Neural Regression with Non-linear interactions
    // - High aversion to extreme mismatch: if interest is very low (<0.3), score drops steeply (non-linear)
    const interestGate = interestUtility < 0.3 ? 0.15 : 1.0;
    
    // - Weather suitability forms an interaction multiplier rather than a simple sum
    const weatherGate = weatherUtility < 0.4 ? 0.2 : 1.0;

    // - Travel distance has exponential decay rather than linear subtraction
    const distDecay = Math.exp(-distanceMeters / 2500);

    const rawMlScore = (
      0.50 * interestUtility + 
      0.30 * distDecay + 
      0.20 * weatherUtility
    ) * interestGate * weatherGate;

    totalScore = Math.min(1.0, Math.max(0.0, rawMlScore));
  } else {
    // ⚖️ Fallback Mode: Hybrid Weighted Linear scoring (Weighted Scorer)
    totalScore = (
      0.50 * interestUtility +
      0.35 * convenienceUtility +
      0.15 * weatherUtility
    );
  }

  // 2. Explainable AI (XAI) thresholds
  const matchesInterest = tasteVal >= 0.6;
  const convenientTravel = distanceMeters <= 1200; // convenient walk / short ride
  const weatherSuitable = weatherFitScore >= 0.75;

  // 3. Compute Percentage Contributions (re-weighted to 100%)
  const totalTerms = interestUtility + convenienceUtility + weatherUtility;
  const scorePercentInterest = Math.round((interestUtility / totalTerms) * 100) || 34;
  const scorePercentConvenience = Math.round((convenienceUtility / totalTerms) * 100) || 33;
  const scorePercentWeather = 100 - scorePercentInterest - scorePercentConvenience; // force sum to 100%

  return {
    poiId: poi.id,
    totalScore: Math.round(totalScore * 100),
    usedMlModel: isMlModelEnabled,
    explanation: {
      matchesInterest,
      convenientTravel,
      weatherSuitable,
      scorePercentInterest,
      scorePercentConvenience,
      scorePercentWeather,
    },
  };
}
