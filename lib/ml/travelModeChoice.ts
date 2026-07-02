/**
 * travelModeChoice.ts — Travel Mode Choice recommender based on Multinomial Logit (MNL).
 * 
 * Inspired by the prediction-behavioural-analysis-ml-travel-mode-choice papers.
 * Evaluates the utility of Walking, Public Transit, and Taxi/Driving based on
 * distance, weather, traffic, and user demographic profiles.
 */

export type TravelerProfile = "standard" | "senior" | "commuter";

export interface ModeChoiceInput {
  distanceMeters: number;      // distance of the leg in meters
  rainProb: number;            // probability of rain (0.0 to 1.0)
  trafficRiskScore: number;    // traffic hazard risk score (0 to 100)
  travelerProfile: TravelerProfile;
}

export type TravelMode = "walk" | "transit" | "taxi";

export interface ModeChoiceResult {
  recommendedMode: TravelMode;
  probabilities: {
    walk: number;
    transit: number;
    taxi: number;
  };
  estimatedMinutes: {
    walk: number;
    transit: number;
    taxi: number;
  };
  reason: {
    th: string;
    en: string;
  };
}

/**
 * Recommends the best travel mode using a Multinomial Logit (MNL) model
 * with coefficients calibrated for different traveler profiles.
 */
export function selectTravelMode(input: ModeChoiceInput): ModeChoiceResult {
  const { distanceMeters, rainProb, trafficRiskScore, travelerProfile } = input;

  // 1. Estimate travel times for each mode (in minutes)
  // Walking speed: 4.8 km/h = 80 meters/min
  const walkMinutes = distanceMeters / 80;

  // Transit speed: 24 km/h = 400 meters/min. Access walk = 8 mins. Wait = 5 mins.
  const transitMinutes = 8 + (distanceMeters / 400) + 5;

  // Taxi speed: 18 km/h = 300 meters/min. Wait = 5 mins.
  // High traffic risk score scales up travel time (due to congestion delays).
  const trafficDelayFactor = 1.0 + (trafficRiskScore / 100) * 0.8; // up to 1.8x slower
  const taxiMinutes = 5 + (distanceMeters / (300 / trafficDelayFactor));

  const estimatedMinutes = {
    walk: Math.round(walkMinutes * 10) / 10,
    transit: Math.round(transitMinutes * 10) / 10,
    taxi: Math.round(taxiMinutes * 10) / 10,
  };

  // 2. MNL Model Coefficients by Traveler Profile
  // ASC = Alternative Specific Constant (base preference)
  // beta_time = time sensitivity (utility penalty per minute)
  let asc = { walk: 0.0, transit: -0.5, taxi: -1.2 };
  let betaTime = { walk: -0.06, transit: -0.04, taxi: -0.03 };
  let betaRainWalk = -3.5;       // high penalty for walking in rain
  let betaTrafficTaxi = -0.04;    // penalty for taking taxi in traffic congestion

  if (travelerProfile === "senior") {
    // Seniors: highly sensitive to walking physical effort, value taxi comfort
    asc = { walk: -1.0, transit: 0.0, taxi: 1.5 };
    betaTime = { walk: -0.22, transit: -0.06, taxi: -0.02 };
    betaRainWalk = -5.0; // extremely high aversion to wet walking
  } else if (travelerProfile === "commuter") {
    // Commuters: highly time-sensitive, want to avoid traffic delays
    asc = { walk: 0.5, transit: 0.8, taxi: -0.5 };
    betaTime = { walk: -0.08, transit: -0.05, taxi: -0.12 }; // high penalty for sitting in taxi traffic
    betaTrafficTaxi = -0.09;
  }

  // 3. Compute Utilities (V)
  // Walk utility
  const vWalk = asc.walk + (betaTime.walk * walkMinutes) + (betaRainWalk * rainProb);
  
  // Transit utility (access walking also incurs rain penalty)
  const transitAccessRainPenalty = (8 / walkMinutes) * betaRainWalk * rainProb; // portion of walk time affected
  const vTransit = asc.transit + (betaTime.transit * transitMinutes) + (Number.isFinite(transitAccessRainPenalty) ? transitAccessRainPenalty : 0);

  // Taxi utility
  const vTaxi = asc.taxi + (betaTime.taxi * taxiMinutes) + (betaTrafficTaxi * trafficRiskScore);

  // 4. Calculate Probabilities using Softmax (Logit)
  const expWalk = Math.exp(vWalk);
  const expTransit = Math.exp(vTransit);
  const expTaxi = Math.exp(vTaxi);
  const sumExp = expWalk + expTransit + expTaxi;

  const probabilities = {
    walk: expWalk / sumExp,
    transit: expTransit / sumExp,
    taxi: expTaxi / sumExp,
  };

  // 5. Select recommended mode (argmax of probabilities)
  let recommendedMode: TravelMode = "walk";
  let maxProb = 0;
  for (const m of ["walk", "transit", "taxi"] as const) {
    if (probabilities[m] > maxProb) {
      maxProb = probabilities[m];
      recommendedMode = m;
    }
  }

  // Double check constraints (e.g. if distance is too long, walk is impossible)
  if (distanceMeters > 2000 && recommendedMode === "walk") {
    recommendedMode = probabilities.transit > probabilities.taxi ? "transit" : "taxi";
  }

  // 6. Generate explanatory reason
  let reasonTh = "";
  let reasonEn = "";

  if (recommendedMode === "walk") {
    reasonTh = `แนะนำเดินเท้า 🚶 เนื่องจากระยะทางใกล้ (${distanceMeters} ม.) และสภาพอากาศเอื้ออำนวย`;
    reasonEn = `Walking 🚶 recommended due to short distance (${distanceMeters}m) and fair weather.`;
  } else if (recommendedMode === "transit") {
    if (rainProb > 0.3) {
      reasonTh = `แนะนำรถไฟฟ้า/ขนส่งสาธารณะ 🚇 เพื่อหลบเลี่ยงฝนตก (${Math.round(rainProb * 100)}%)`;
      reasonEn = `Transit 🚇 recommended to dodge the rain (${Math.round(rainProb * 100)}% chance).`;
    } else {
      reasonTh = `แนะนำรถไฟฟ้า/ขนส่งสาธารณะ 🚇 ช่วยประหยัดเวลาและหลีกเลี่ยงความเสี่ยงจราจร`;
      reasonEn = `Transit 🚇 recommended to save time and bypass road traffic risk.`;
    }
  } else {
    // taxi
    if (travelerProfile === "senior") {
      reasonTh = `แนะนำแท็กซี่/รถยนต์ 🚖 เพื่อความสะดวกสบายและความปลอดภัยของผู้สูงอายุ`;
      reasonEn = `Taxi/Drive 🚖 recommended for senior comfort and safety.`;
    } else if (rainProb > 0.4) {
      reasonTh = `แนะนำแท็กซี่/รถยนต์ 🚖 ช่วยอำนวยความสะดวกสูงสุดท่ามกลางฝนตกหนัก`;
      reasonEn = `Taxi/Drive 🚖 recommended for maximum convenience in heavy rain.`;
    } else {
      reasonTh = `แนะนำแท็กซี่/รถยนต์ 🚖 เดินทางสะดวกสบายและประหยัดเวลากว่า`;
      reasonEn = `Taxi/Drive 🚖 recommended for convenient and faster travel.`;
    }
  }

  return {
    recommendedMode,
    probabilities,
    estimatedMinutes,
    reason: { th: reasonTh, en: reasonEn },
  };
}
