import { describe, it, expect } from "vitest";
import { scoreDays, pickBestWorst } from "./dayScores";
import type { HourlyForecast } from "@/lib/weather/types";

function fc(now: Date, days: { offset: number; rainProb: number }[]): HourlyForecast[] {
  const out: HourlyForecast[] = [];
  for (const d of days) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + d.offset);
    for (let h = 8; h <= 18; h++) {
      const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}T${String(h).padStart(2, "0")}:00`;
      out.push({ hourISO: iso, tempC: 32, apparentTempC: 34, rainProb: d.rainProb, rainIntensity: 0, heatIndex: 0, cloudCover: 0.3, uvIndex: 5, windSpeedKmh: 5, windDirectionDeg: 0, humidity: 0.6, weatherCode: 0, provider: "open-meteo", fetchedAt: "" });
    }
  }
  return out;
}

describe("scoreDays / pickBestWorst — the 'when to go' axis", () => {
  it("scores each day and picks the driest best + wettest worst", () => {
    const now = new Date(2026, 5, 19, 10, 0, 0);
    const scores = scoreDays(fc(now, [{ offset: 0, rainProb: 0.05 }, { offset: 1, rainProb: 0.7 }, { offset: 2, rainProb: 0.12 }]), now);
    expect(scores.map((s) => s.offset)).toEqual([0, 1, 2]);
    const { best, worst } = pickBestWorst(scores);
    expect(best?.offset).toBe(0);
    expect(worst?.offset).toBe(1);
  });

  it("returns no best/worst when the days are basically equal (don't nag)", () => {
    const now = new Date(2026, 5, 19, 10, 0, 0);
    const { best } = pickBestWorst(scoreDays(fc(now, [{ offset: 0, rainProb: 0.1 }, { offset: 1, rainProb: 0.11 }]), now));
    expect(best).toBeNull();
  });
});
