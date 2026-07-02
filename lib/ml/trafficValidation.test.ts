import { describe, it, expect } from "vitest";
import { predictSeverity, PredictorFeatures } from "./trafficPredictor";

describe("ML Model Statistical Validation (1,000 Scenarios Monte Carlo)", () => {
  it("verifies accuracy and consistency across random scenario distributions", () => {
    let clearCasesCount = 0;
    let clearCasesCorrect = 0;

    let wetCasesCount = 0;
    let wetCasesRiskSum = 0;

    let dryCasesCount = 0;
    let dryCasesRiskSum = 0;

    let visibilityCasesCount = 0;
    let visibilityCasesRiskSum = 0;

    let normalVisibilityCount = 0;
    let normalVisibilityRiskSum = 0;

    let railwayCount = 0;
    let railwayCorrect = 0;

    let compositeExtremeCount = 0;
    let compositeExtremeCorrect = 0;

    // Run 1,000 random test scenario vectors
    for (let i = 0; i < 1000; i++) {
      const isNight = Math.random() > 0.4;
      const precipitationIn = Math.random() > 0.7 ? Math.random() * 0.5 : 0;
      
      // Visibility drops in rain/night
      let visibilityMi = 10;
      if (precipitationIn > 0.1) {
        visibilityMi = 1.0 + Math.random() * 3.0; // low visibility in heavy rain
      } else if (Math.random() > 0.8) {
        visibilityMi = 3.0 + Math.random() * 4.0; // mist/fog
      }

      const features: PredictorFeatures = {
        temperatureF: 70 + Math.random() * 30, // 70 to 100 F
        humidityPercent: 40 + Math.random() * 60, // 40 to 100%
        precipitationIn,
        windSpeedMph: Math.random() * 25, // 0 to 25 mph
        visibilityMi,
        isNight,
        crossing: Math.random() > 0.9,
        junction: Math.random() > 0.85,
        railway: Math.random() > 0.98,
        station: Math.random() > 0.95,
        stop: Math.random() > 0.92,
        trafficSignal: Math.random() > 0.8,
      };

      const result = predictSeverity(features);

      // 1. Clear weather baseline test
      if (
        features.precipitationIn === 0 &&
        features.visibilityMi === 10 &&
        !features.junction &&
        !features.railway &&
        !features.crossing &&
        !features.isNight
      ) {
        clearCasesCount++;
        // Should predict Low (1) or Moderate (2) severity
        if (result.predictedSeverity <= 2) {
          clearCasesCorrect++;
        }
      }

      // 2. Wet surface vs dry surface risk comparison
      if (features.precipitationIn > 0.1) {
        wetCasesCount++;
        wetCasesRiskSum += result.riskScore;
      } else if (features.precipitationIn === 0) {
        dryCasesCount++;
        dryCasesRiskSum += result.riskScore;
      }

      // 3. Low visibility risk comparison
      if (features.visibilityMi < 3) {
        visibilityCasesCount++;
        visibilityCasesRiskSum += result.riskScore;
      } else if (features.visibilityMi === 10) {
        normalVisibilityCount++;
        normalVisibilityRiskSum += result.riskScore;
      }

      // 4. Railway crossing hazard test
      if (features.railway) {
        railwayCount++;
        // Must predict Severe (3) or Extreme (4)
        if (result.predictedSeverity >= 3) {
          railwayCorrect++;
        }
      }

      // 5. Composite extreme hazard test (Night + Heavy Rain + Low Visibility + Junction)
      if (features.isNight && features.precipitationIn > 0.2 && features.visibilityMi < 3 && features.junction) {
        compositeExtremeCount++;
        if (result.predictedSeverity >= 3 && result.riskScore >= 70) {
          compositeExtremeCorrect++;
        }
      }
    }

    // Assert Condition 1: Clear baseline is always classified as Low/Moderate (100% correct)
    if (clearCasesCount > 0) {
      const clearAccuracy = clearCasesCorrect / clearCasesCount;
      expect(clearAccuracy).toBe(1.0);
    }

    // Assert Condition 2: Wet road conditions carry a higher risk index than dry roads
    if (wetCasesCount > 0 && dryCasesCount > 0) {
      const avgWetRisk = wetCasesRiskSum / wetCasesCount;
      const avgDryRisk = dryCasesRiskSum / dryCasesCount;
      expect(avgWetRisk).toBeGreaterThan(avgDryRisk + 10); // at least 10 points higher
    }

    // Assert Condition 3: Low visibility increases average risk score
    if (visibilityCasesCount > 0 && normalVisibilityCount > 0) {
      const avgLowVisRisk = visibilityCasesRiskSum / visibilityCasesCount;
      const avgNormVisRisk = normalVisibilityRiskSum / normalVisibilityCount;
      expect(avgLowVisRisk).toBeGreaterThan(avgNormVisRisk + 10);
    }

    // Assert Condition 4: Railway crossings are classified as Severe/Extreme (100% correct)
    if (railwayCount > 0) {
      const railwayAccuracy = railwayCorrect / railwayCount;
      expect(railwayAccuracy).toBe(1.0);
    }

    // Assert Condition 5: Composite extreme hazards trigger severe/extreme risk scores (100% correct)
    if (compositeExtremeCount > 0) {
      const compositeAccuracy = compositeExtremeCorrect / compositeExtremeCount;
      expect(compositeAccuracy).toBe(1.0);
    }

    console.log("Monte Carlo ML Model Validation Results:");
    console.log(`- Clear weather baseline correct rate: ${(clearCasesCorrect / (clearCasesCount || 1) * 100).toFixed(1)}% (${clearCasesCorrect}/${clearCasesCount})`);
    console.log(`- Railway crossing hazard correct rate: ${(railwayCorrect / (railwayCount || 1) * 100).toFixed(1)}% (${railwayCorrect}/${railwayCount})`);
    console.log(`- Composite extreme hazard correct rate: ${(compositeExtremeCorrect / (compositeExtremeCount || 1) * 100).toFixed(1)}% (${compositeExtremeCorrect}/${compositeExtremeCount})`);
    console.log(`- Avg Dry Risk: ${(dryCasesRiskSum / (dryCasesCount || 1)).toFixed(1)} vs Avg Wet Risk: ${(wetCasesRiskSum / (wetCasesCount || 1)).toFixed(1)}`);
    console.log(`- Avg Normal Vis Risk: ${(normalVisibilityRiskSum / (normalVisibilityCount || 1)).toFixed(1)} vs Avg Low Vis Risk: ${(visibilityCasesRiskSum / (visibilityCasesCount || 1)).toFixed(1)}`);
  });
});
