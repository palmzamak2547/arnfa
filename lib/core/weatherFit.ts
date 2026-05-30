/**
 * weatherFit() — pure function, no I/O, no React. Heart of Arnfa's decision engine.
 * Spec: projects/arnfa/02-architecture.md § Core algorithm
 */

export type PoiProfile = {
  outdoorness: number;
  indoorness: number;
  shade: number;
  covered: number;
  rainEnjoyment: number;
  heatTolerance: number;
  confidence: number;
};

export type SlotForecast = {
  hourISO: string;
  rainProb: number;
  rainIntensity: number;
  heatIndex: number;
};

export type FitResult = {
  fit: number;
  exposure: number;
  rainRisk: number;
  heatRisk: number;
  indoorBoost: number;
  reason: string;
};

const clamp = (n: number, min = 0, max = 1) => Math.min(max, Math.max(min, n));

/**
 * fit = 1
 *     - exposure × rainRisk × (1 - rainEnjoyment)   // outdoor + rain = drop
 *     - exposure × heatRisk × (1 - heatTolerance)   // outdoor + heat = drop
 *     + indoorness × rainRisk × rainEnjoyment × 0.6 // indoor BETTER in rain
 */
export function weatherFit(p: PoiProfile, f: SlotForecast): FitResult {
  const exposure = p.outdoorness * (1 - p.shade * 0.5);
  const rainRisk = f.rainProb * f.rainIntensity;
  const heatRisk = f.heatIndex;
  const indoorBoost = p.indoorness * rainRisk * p.rainEnjoyment * 0.6;

  const fit = clamp(
    1
    - exposure * rainRisk * (1 - p.rainEnjoyment)
    - exposure * heatRisk * (1 - p.heatTolerance)
    + indoorBoost
  );

  return {
    fit,
    exposure,
    rainRisk,
    heatRisk,
    indoorBoost,
    reason: explainFit(p, f, { exposure, rainRisk, heatRisk, indoorBoost }),
  };
}

function explainFit(
  p: PoiProfile,
  f: SlotForecast,
  s: { exposure: number; rainRisk: number; heatRisk: number; indoorBoost: number },
): string {
  if (s.indoorBoost > 0.2) return `ในร่มแบบดีตอนฝน — น่าจะใช่ที่หลบฝน ${Math.round(f.rainProb * 100)}%`;
  if (s.exposure > 0.5 && s.rainRisk > 0.3) return `กลางแจ้ง × โอกาสฝน ${Math.round(f.rainProb * 100)}% — เสี่ยง`;
  if (s.exposure > 0.5 && s.heatRisk > 0.6) return `กลางแจ้ง × ร้อนจัด — ทนได้ถ้ามีร่ม/ลม`;
  if (p.indoorness > 0.6 && s.rainRisk < 0.2 && s.heatRisk < 0.4) return `ในร่ม แต่ฟ้าเปิด — ออกข้างนอกได้ก่อน`;
  if (p.outdoorness > 0.6 && s.rainRisk < 0.15 && s.heatRisk < 0.5) return `ฟ้าใส กลางแจ้งโอเค`;
  return `ฟ้าเป็นกลาง — ขึ้นกับ taste`;
}

export type ScoreInputs = {
  interest: number;
  fit: number;
  isOpenAt: 0 | 1;
  reachable: 0 | 1;
  proximityBoost: number;
  confidence: number;
};

export function finalScore(s: ScoreInputs): number {
  return s.interest * clamp(s.fit) * s.isOpenAt * s.reachable * s.proximityBoost * s.confidence;
}
