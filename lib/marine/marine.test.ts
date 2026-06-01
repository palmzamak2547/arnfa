import { describe, it, expect } from "vitest";
import { swimVerdict, isCoastal, seaDistanceKm } from "./marine";

describe("swimVerdict", () => {
  it("maps wave height to a swim level", () => {
    expect(swimVerdict(0.3)).toBe("calm");
    expect(swimVerdict(0.8)).toBe("gentle");
    expect(swimVerdict(1.24)).toBe("moderate"); // Patong today
    expect(swimVerdict(2.0)).toBe("rough");
    expect(swimVerdict(3.0)).toBe("high");
  });
});

describe("isCoastal", () => {
  it("knows beaches from inland", () => {
    expect(isCoastal("patong")).toBe(true);
    expect(isCoastal("ko-samui")).toBe(true);
    expect(isCoastal("nimman")).toBe(false); // Chiang Mai
    expect(isCoastal("khon-kaen")).toBe(false);
  });
});

describe("seaDistanceKm", () => {
  it("is small when the marine cell is near the centroid", () => {
    expect(seaDistanceKm(7.89, 98.3, 7.875, 98.375)).toBeLessThan(15);
  });
});
