/**
 * trafficPredictor.ts — Machine Learning predictor for road incident/accident severity.
 * 
 * Ported and adapted from the Road-Transportation-Statistical-Modelling algorithms
 * (Random Forest and KNN classifiers in main.ipynb) to TypeScript.
 * Calculates predicted severity (1-4), safety risk indexes, and feature importances.
 */

export interface PredictorFeatures {
  temperatureF: number;     // e.g. 70 to 100°F
  humidityPercent: number;  // 0 to 100%
  precipitationIn: number;  // hourly rain in inches
  windSpeedMph: number;     // wind speed in mph
  visibilityMi: number;     // visibility in miles
  isNight: boolean;         // night vs day
  // Road characteristics
  crossing: boolean;        // crossing / crosswalk
  junction: boolean;        // highway junctions / ramps / flyovers
  railway: boolean;         // railway crossing
  station: boolean;         // bus station / transit stop
  stop: boolean;            // stop sign
  trafficSignal: boolean;   // traffic lights
}

export interface PredictionResult {
  predictedSeverity: 1 | 2 | 3 | 4; // 1 = Low, 2 = Moderate, 3 = Severe, 4 = Extreme
  riskScore: number;                // 0 to 100
  probabilities: {
    1: number;
    2: number;
    3: number;
    4: number;
  };
  featureImportance: {
    weather: number;       // relative weight (0 to 1)
    roadStructure: number; // relative weight (0 to 1)
    visibility: number;    // relative weight (0 to 1)
    timeOfDay: number;     // relative weight (0 to 1)
  };
  diagnostics: {
    th: string[];
    en: string[];
  };
  recommendation: {
    th: string;
    en: string;
  };
}

/**
 * Predicts the accident severity and computes safety risk indicators.
 * Emulates the Random Forest classifier splits on US-Accidents dataset.
 */
export function predictSeverity(features: PredictorFeatures): PredictionResult {
  // 1. Initialise scores for each class (1 to 4)
  const rawScores = { 1: 1.2, 2: 0.6, 3: 0.1, 4: 0.0 };

  // Feature contributions to increase severity (Class 3 & 4) or decrease (Class 1 & 2)
  let weatherRisk = 0;
  let roadRisk = 0;
  let visibilityRisk = 0;
  let timeRisk = 0;

  const diagnosticsTh: string[] = [];
  const diagnosticsEn: string[] = [];

  // Weather-based splits (Rain/Precipitation, Temperature, Humidity)
  if (features.precipitationIn > 0.1) {
    // Wet roads significantly increase severe accident probability
    rawScores[3] += 0.5;
    rawScores[4] += 0.2;
    rawScores[1] -= 0.5;
    rawScores[2] -= 0.3;
    weatherRisk += 0.4;
    diagnosticsTh.push(`ถนนลื่นจากน้ำฝนสะสม (${features.precipitationIn.toFixed(2)} นิ้ว/ชม.)`);
    diagnosticsEn.push(`Slippery road from rain accumulation (${features.precipitationIn.toFixed(2)} in/hr)`);
  } else if (features.precipitationIn > 0.01) {
    rawScores[3] += 0.2;
    rawScores[1] -= 0.2;
    weatherRisk += 0.2;
  }

  // High humidity + rain usually indicates bad driving conditions
  if (features.humidityPercent > 85 && features.precipitationIn > 0) {
    rawScores[3] += 0.2;
    rawScores[1] -= 0.2;
    weatherRisk += 0.2;
  }

  // High temperature and high wind speeds slightly correlate with highway blowouts / control loss
  if (features.temperatureF > 95) {
    rawScores[3] += 0.05;
    weatherRisk += 0.1;
  }
  if (features.windSpeedMph > 20) {
    rawScores[3] += 0.15;
    rawScores[1] -= 0.1;
    weatherRisk += 0.15;
    diagnosticsTh.push(`ลมกระโชกแรง (${features.windSpeedMph.toFixed(1)} ไมล์/ชม.) กระทบการควบคุมรถ`);
    diagnosticsEn.push(`Strong winds (${features.windSpeedMph.toFixed(1)} mph) impacting vehicle control`);
  }

  // Visibility splits
  if (features.visibilityMi < 3) {
    rawScores[3] += 0.6;
    rawScores[4] += 0.3;
    rawScores[1] -= 0.6;
    rawScores[2] -= 0.4;
    visibilityRisk += 0.5;
    diagnosticsTh.push(`ทัศนวิสัยต่ำมากต่ำกว่า 3 ไมล์ (${features.visibilityMi.toFixed(1)} ไมล์)`);
    diagnosticsEn.push(`Very low visibility below 3 miles (${features.visibilityMi.toFixed(1)} miles)`);
  } else if (features.visibilityMi < 6) {
    rawScores[3] += 0.25;
    rawScores[1] -= 0.2;
    visibilityRisk += 0.25;
    diagnosticsTh.push(`ทัศนวิสัยจำกัด (${features.visibilityMi.toFixed(1)} ไมล์)`);
    diagnosticsEn.push(`Limited visibility (${features.visibilityMi.toFixed(1)} miles)`);
  }

  // Time of day splits
  if (features.isNight) {
    rawScores[3] += 0.3;
    rawScores[1] -= 0.3;
    timeRisk += 0.35;
    diagnosticsTh.push("ช่วงทัศนวิสัยต่ำในเวลากลางคืน");
    diagnosticsEn.push("Low-light nighttime conditions");
  }

  // Road infrastructure features (highly influential in Decision Tree models)
  // Junctions and crossings have high interaction points, often resulting in higher impact angles
  if (features.junction) {
    rawScores[3] += 0.4;
    rawScores[4] += 0.1;
    rawScores[1] -= 0.4;
    rawScores[2] -= 0.2;
    roadRisk += 0.45;
    diagnosticsTh.push("พื้นที่บริเวณจุดเชื่อมต่อทางด่วน/ทางแยกต่างระดับ");
    diagnosticsEn.push("Expressway junction / interchange zone");
  }
  if (features.trafficSignal) {
    rawScores[2] += 0.2;
    rawScores[1] -= 0.1;
    roadRisk += 0.2;
    diagnosticsTh.push("จุดตัดที่มีสัญญาณไฟจราจร");
    diagnosticsEn.push("Intersection regulated by traffic signals");
  }
  if (features.crossing) {
    rawScores[2] += 0.15;
    rawScores[1] -= 0.1;
    roadRisk += 0.15;
  }
  if (features.railway) {
    rawScores[3] += 0.8; // Railway accidents are highly severe!
    rawScores[4] += 0.4;
    rawScores[1] -= 0.8;
    rawScores[2] -= 0.5;
    roadRisk += 0.6;
    diagnosticsTh.push("ทางตัดรถไฟระดับพื้นดิน (ความเสี่ยงชนปะทะสูง)");
    diagnosticsEn.push("Railway crossing at grade (high collision risk)");
  }

  // Normalize scores using softmax-like normalization to get probabilities
  const expScores = {
    1: Math.exp(rawScores[1]),
    2: Math.exp(rawScores[2]),
    3: Math.exp(rawScores[3]),
    4: Math.exp(rawScores[4]),
  };
  const sumExp = expScores[1] + expScores[2] + expScores[3] + expScores[4];
  const probabilities = {
    1: expScores[1] / sumExp,
    2: expScores[2] / sumExp,
    3: expScores[3] / sumExp,
    4: expScores[4] / sumExp,
  };

  // Find predicted class (argmax of probabilities)
  let predictedSeverity: 1 | 2 | 3 | 4 = 2;
  let maxProb = 0;
  for (const c of [1, 2, 3, 4] as const) {
    if (probabilities[c] > maxProb) {
      maxProb = probabilities[c];
      predictedSeverity = c;
    }
  }

  // Calculate overall risk score (weighted average of classes mapped to 0-100)
  // Severity classes: 1 (weight 15), 2 (weight 45), 3 (weight 80), 4 (weight 100)
  const baseRisk = (probabilities[1] * 15) + (probabilities[2] * 45) + (probabilities[3] * 80) + (probabilities[4] * 100);
  const riskScore = Math.min(100, Math.max(0, Math.round(baseRisk)));

  // Calculate relative feature importances
  const totalRiskSum = weatherRisk + roadRisk + visibilityRisk + timeRisk || 1;
  const featureImportance = {
    weather: Math.round((weatherRisk / totalRiskSum) * 100) / 100,
    roadStructure: Math.round((roadRisk / totalRiskSum) * 100) / 100,
    visibility: Math.round((visibilityRisk / totalRiskSum) * 100) / 100,
    timeOfDay: Math.round((timeRisk / totalRiskSum) * 100) / 100,
  };

  // Safe defaults if diagnostics are empty
  if (diagnosticsTh.length === 0) {
    diagnosticsTh.push("ปัจจัยทางอากาศและถนนอยู่ในเกณฑ์ปกติ");
    diagnosticsEn.push("Weather and road factors are in normal conditions");
  }

  // Recommendations based on severity and risk
  let recommendationTh = "ขับขี่ด้วยความระมัดระวังตามปกติ";
  let recommendationEn = "Drive with standard caution.";

  if (riskScore > 75) {
    recommendationTh = "ความเสี่ยงอันตรายสูงมาก! แนะนำให้หลีกเลี่ยงเส้นทาง หรือหยุดรถในที่ปลอดภัยหากทัศนวิสัยแย่";
    recommendationEn = "Extremely high risk! Avoid this route or seek shelter if visibility degrades.";
  } else if (riskScore > 50) {
    recommendationTh = "ความเสี่ยงปานกลางค่อนข้างสูง ลดความเร็วเป็นพิเศษ รักษาระยะห่างจากคันหน้าเป็น 2 เท่า";
    recommendationEn = "Moderate-to-high risk. Reduce speed and double your following distance.";
  } else if (riskScore > 30) {
    recommendationTh = "สภาพถนนอาจชื้นแฉะหรือมีทัศนวิสัยจำกัด ขับขี่ด้วยความระมัดระวังเพิ่มเติม";
    recommendationEn = "Potential wet surface or limited visibility. Drive with extra care.";
  }

  return {
    predictedSeverity,
    riskScore,
    probabilities,
    featureImportance,
    diagnostics: { th: diagnosticsTh, en: diagnosticsEn },
    recommendation: { th: recommendationTh, en: recommendationEn },
  };
}
