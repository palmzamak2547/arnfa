/**
 * advisory.ts — "วันนี้ออกไป ควรเตรียมตัวยังไง"
 *
 * Turns the day's REAL forecast window (+ optional real Air4Thai PM2.5) into three
 * honest, deterministic outputs:
 *   - outfit:  one OOTD sentence (temp + humidity + wind + sun + rain)
 *   - packing: a checklist of things worth carrying (umbrella, sunscreen, …)
 *   - safety:  health/environment flags (PM2.5, heat index, heavy rain)
 *
 * Pure + rule-based — no model, no fabrication. Every trigger reads a real number
 * from the forecast or the air reading; if a signal is missing we simply omit it.
 * Spec lineage: ClimaTrip feature set #3 (OOTD/packing) + #4 (health & safety).
 */

import type { HourlyForecast } from "@/lib/weather/types";

export type AirInput = { pm25: number | null; level: string } | null;

export type PackItem = { id: string; th: string; en: string };
export type SafetyFlag = { level: "info" | "warn" | "danger"; th: string; en: string };
export type Advisory = {
  outfit: { th: string; en: string };
  packing: PackItem[];
  safety: SafetyFlag[];
  /** 0–1 suggested penalty on outdoor places (fed to the planner). */
  outdoorPenalty: number;
};

const UNHEALTHY_AIR = new Set(["unhealthy", "very-unhealthy"]);

/** Reduce the plan window to the daytime stats that drive advice. */
function summarize(window: HourlyForecast[]) {
  // Look at daylight hours within the window (06:00–19:00) when present.
  const day = window.filter((f) => { const h = new Date(f.hourISO).getHours(); return h >= 6 && h < 19; });
  const hours = day.length ? day : window;
  if (!hours.length) return null;
  const max = (sel: (f: HourlyForecast) => number) => hours.reduce((a, f) => Math.max(a, sel(f)), -Infinity);
  const min = (sel: (f: HourlyForecast) => number) => hours.reduce((a, f) => Math.min(a, sel(f)), Infinity);
  const avg = (sel: (f: HourlyForecast) => number) => hours.reduce((a, f) => a + sel(f), 0) / hours.length;
  return {
    maxApparent: max((f) => f.apparentTempC),
    minTemp: min((f) => f.tempC),
    maxRainProb: max((f) => f.rainProb),
    maxRainIntensity: max((f) => f.rainIntensity),
    maxUv: max((f) => f.uvIndex),
    maxWind: max((f) => f.windSpeedKmh),
    avgHumidity: avg((f) => f.humidity),
    maxHeatIndex: max((f) => f.heatIndex),
  };
}

export function dayAdvisory(window: HourlyForecast[], air: AirInput = null): Advisory | null {
  const s = summarize(window);
  if (!s) return null;

  // ----- OUTFIT (one honest sentence) -----
  const outTh: string[] = [];
  const outEn: string[] = [];
  if (s.maxApparent >= 36) { outTh.push("ร้อนจัด ใส่เสื้อบางระบายอากาศ"); outEn.push("very hot — light, breathable layers"); }
  else if (s.maxApparent >= 32) { outTh.push("อากาศร้อน เสื้อผ้าโปร่งสบาย"); outEn.push("hot — light clothing"); }
  else if (s.minTemp <= 24) { outTh.push("ช่วงเช้า/เย็นเย็นนิด พกเสื้อคลุมบาง"); outEn.push("cooler edges — bring a light layer"); }
  else { outTh.push("อากาศกำลังดี แต่งตัวสบายๆ"); outEn.push("pleasant — dress comfortably"); }
  if (s.avgHumidity >= 0.8) { outTh.push("ความชื้นสูง เลือกผ้าแห้งไว"); outEn.push("humid — quick-dry fabric"); }
  if (s.maxWind >= 30) { outTh.push("ลมแรง เสื้อคลุมกันลมช่วยได้"); outEn.push("windy — a windbreaker helps"); }
  if (s.maxRainProb >= 0.5) { outTh.push("มีลุ้นฝน เลี่ยงรองเท้าผ้าใบเปียกง่าย"); outEn.push("rain likely — skip soak-prone shoes"); }
  else if (s.maxUv >= 8) { outTh.push("แดดจัด เสื้อแขนยาว/หมวกกันแดด"); outEn.push("strong sun — long sleeves or a hat"); }

  // ----- PACKING -----
  const packing: PackItem[] = [];
  if (s.maxRainProb >= 0.4 || s.maxRainIntensity >= 0.3) packing.push({ id: "umbrella", th: "ร่ม / เสื้อกันฝน", en: "umbrella / rain shell" });
  if (s.maxUv >= 6) packing.push({ id: "sunscreen", th: "ครีมกันแดด", en: "sunscreen" });
  if (s.maxUv >= 8) packing.push({ id: "shades", th: "แว่นกันแดด + หมวก", en: "sunglasses + hat" });
  if (s.maxHeatIndex >= 0.6 || s.maxApparent >= 34) packing.push({ id: "water", th: "น้ำดื่มเย็นๆ", en: "cold water" });
  if (s.maxWind >= 30 || s.minTemp <= 23) packing.push({ id: "layer", th: "เสื้อคลุมบาง", en: "light layer" });
  if (air && air.pm25 != null && UNHEALTHY_AIR.has(air.level)) packing.push({ id: "mask", th: "หน้ากากกันฝุ่น PM2.5", en: "PM2.5 mask" });
  // mosquitoes love warm + humid + just-rained conditions
  if (s.avgHumidity >= 0.78 && s.maxRainProb >= 0.5) packing.push({ id: "repellent", th: "สเปรย์กันยุง", en: "mosquito spray" });

  // ----- SAFETY (real thresholds, never fabricated) -----
  const safety: SafetyFlag[] = [];
  let outdoorPenalty = 0;
  if (air && air.pm25 != null) {
    if (air.level === "very-unhealthy") { safety.push({ level: "danger", th: `ฝุ่น PM2.5 อันตราย (${Math.round(air.pm25)}) — เน้นในร่มวันนี้`, en: `PM2.5 hazardous (${Math.round(air.pm25)}) — stay indoors today` }); outdoorPenalty = Math.max(outdoorPenalty, 0.85); }
    else if (air.level === "unhealthy") { safety.push({ level: "danger", th: `ฝุ่น PM2.5 สูง (${Math.round(air.pm25)}) — ลดกิจกรรมกลางแจ้ง`, en: `PM2.5 high (${Math.round(air.pm25)}) — limit outdoor time` }); outdoorPenalty = Math.max(outdoorPenalty, 0.6); }
    else if (air.level === "warn") { safety.push({ level: "warn", th: `ฝุ่น PM2.5 เริ่มมีผล (${Math.round(air.pm25)}) — กลุ่มเสี่ยงระวัง`, en: `PM2.5 elevated (${Math.round(air.pm25)}) — sensitive groups take care` }); outdoorPenalty = Math.max(outdoorPenalty, 0.3); }
  }
  if (s.maxHeatIndex >= 0.85 || s.maxApparent >= 40) { safety.push({ level: "danger", th: "ดัชนีความร้อนสูงช่วงกลางวัน — เลี่ยงกลางแจ้งตอนเที่ยง", en: "dangerous heat index midday — avoid the noon sun" }); outdoorPenalty = Math.min(0.85, Math.max(outdoorPenalty, 0.45)); }
  else if (s.maxHeatIndex >= 0.6) { safety.push({ level: "warn", th: "บ่ายร้อนระวังเพลีย — จิบน้ำบ่อยๆ", en: "hot afternoon — hydrate often" }); }
  if (s.maxRainIntensity >= 0.6) { safety.push({ level: "warn", th: "ฝนหนักเป็นช่วง — เผื่อเวลาเดินทาง", en: "heavy rain spells — pad your travel time" }); }

  return { outfit: { th: outTh.join(" · "), en: outEn.join(" · ") }, packing, safety, outdoorPenalty };
}
