import { describe, it, expect } from "vitest";
import { selectTravelMode } from "./travelModeChoice";

describe("Travel Mode Choice MNL Model tests", () => {
  it("Standard Traveler - short distance, good weather -> Walk recommended", () => {
    const result = selectTravelMode({
      distanceMeters: 400,
      rainProb: 0.0,
      trafficRiskScore: 10,
      travelerProfile: "standard",
    });
    expect(result.recommendedMode).toBe("walk");
    expect(result.probabilities.walk).toBeGreaterThan(result.probabilities.transit);
    expect(result.probabilities.walk).toBeGreaterThan(result.probabilities.taxi);
    expect(result.reason.en).toContain("Walking");
  });

  it("Standard Traveler - long distance -> Transit or Taxi recommended", () => {
    const result = selectTravelMode({
      distanceMeters: 5000,
      rainProb: 0.0,
      trafficRiskScore: 10,
      travelerProfile: "standard",
    });
    expect(result.recommendedMode).not.toBe("walk");
  });

  it("Standard Traveler - short distance, heavy rain -> Transit or Taxi recommended to avoid rain walk", () => {
    const result = selectTravelMode({
      distanceMeters: 500,
      rainProb: 0.8,
      trafficRiskScore: 15,
      travelerProfile: "standard",
    });
    // Should choose transit or taxi to avoid rain
    expect(result.recommendedMode).not.toBe("walk");
    expect(result.reason.en.toLowerCase()).toContain("rain");
  });

  it("Senior Traveler - short distance -> Taxi recommended (aversion to walk effort)", () => {
    const result = selectTravelMode({
      distanceMeters: 400,
      rainProb: 0.0,
      trafficRiskScore: 10,
      travelerProfile: "senior",
    });
    expect(result.recommendedMode).toBe("taxi");
    expect(result.reason.en.toLowerCase()).toContain("senior");
  });

  it("Commuter - medium distance, high traffic risk -> Transit recommended to save time", () => {
    const result = selectTravelMode({
      distanceMeters: 2500,
      rainProb: 0.1,
      trafficRiskScore: 80,
      travelerProfile: "commuter",
    });
    // Commuters are sensitive to sitting in taxi traffic; should choose transit
    expect(result.recommendedMode).toBe("transit");
    expect(result.probabilities.transit).toBeGreaterThan(result.probabilities.taxi);
  });
});
