import { describe, it, expect } from "vitest";
import { predictSeverity, PredictorFeatures } from "./trafficPredictor";

describe("predictSeverity", () => {
  it("normal daylight conditions → low or moderate severity", () => {
    const features: PredictorFeatures = {
      temperatureF: 80,
      humidityPercent: 50,
      precipitationIn: 0,
      windSpeedMph: 5,
      visibilityMi: 10,
      isNight: false,
      crossing: false,
      junction: false,
      railway: false,
      station: false,
      stop: false,
      trafficSignal: false,
    };
    const res = predictSeverity(features);
    expect(res.predictedSeverity).toBeLessThanOrEqual(2);
    expect(res.riskScore).toBeLessThanOrEqual(50);
  });

  it("high precipitation (rainy day) → increases severity risk", () => {
    const features: PredictorFeatures = {
      temperatureF: 82,
      humidityPercent: 90,
      precipitationIn: 0.25, // heavy rain
      windSpeedMph: 15,
      visibilityMi: 4, // reduced visibility
      isNight: false,
      crossing: false,
      junction: false,
      railway: false,
      station: false,
      stop: false,
      trafficSignal: false,
    };
    const res = predictSeverity(features);
    expect(res.riskScore).toBeGreaterThan(45);
    expect(res.featureImportance.weather).toBeGreaterThan(0.2);
  });

  it("railway crossing incident → triggers high severity rating", () => {
    const features: PredictorFeatures = {
      temperatureF: 85,
      humidityPercent: 60,
      precipitationIn: 0,
      windSpeedMph: 5,
      visibilityMi: 10,
      isNight: false,
      crossing: false,
      junction: false,
      railway: true, // railway crossing
      station: false,
      stop: false,
      trafficSignal: false,
    };
    const res = predictSeverity(features);
    expect(res.predictedSeverity).toBeGreaterThanOrEqual(3);
    expect(res.riskScore).toBeGreaterThanOrEqual(60);
    expect(res.featureImportance.roadStructure).toBeGreaterThan(0.3);
  });

  it("nighttime + bad weather + highway junction → extremely high risk score", () => {
    const features: PredictorFeatures = {
      temperatureF: 75,
      humidityPercent: 95,
      precipitationIn: 0.45,
      windSpeedMph: 22,
      visibilityMi: 1.5,
      isNight: true,
      crossing: false,
      junction: true,
      railway: false,
      station: false,
      stop: false,
      trafficSignal: false,
    };
    const res = predictSeverity(features);
    expect(res.predictedSeverity).toBeGreaterThanOrEqual(3);
    expect(res.riskScore).toBeGreaterThan(70);
  });
});
