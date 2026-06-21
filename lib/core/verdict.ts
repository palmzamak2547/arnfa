/**
 * dayVerdict() — the "Sky Window" daily verdict. Pure, no I/O.
 *
 * The single most addictive loop (per UX research): open Arnfa → instantly get
 * today's one-line "go now / wait / stay in" call, computed from the REAL
 * forecast. Variable reward (the sky changes daily), honest (Iron Rule 0: cites
 * the actual window), works for user #1 on day #1 (no social graph).
 *
 * Spec: projects/arnfa/02-architecture.md + UX research (sessions log).
 */

import type { HourlyForecast } from "@/lib/weather/types";

export type VerdictKind = "go" | "wait" | "stay";

export type DayVerdict = {
  kind: VerdictKind;
  /** Short Thai headline, e.g. "ออกได้เลย" */
  headline: string;
  /** English headline (for the TH/EN toggle) */
  headlineEn: string;
  /** 中文 headline (for tourist mode) */
  headlineZh: string;
  /** One-line Thai reason naming the real window/condition */
  reason: string;
  /** English reason */
  reasonEn: string;
  /** 中文 reason */
  reasonZh: string;
  /** Label of the best window, e.g. "15:00–18:00" (empty for stay) */
  windowLabel: string;
  /** ISO of the best hour to be outside (for chip/scroll), null if none */
  bestHourISO: string | null;
  /** 0-1 goodness right now */
  nowGoodness: number;
  /** 0-1 goodness of the best window hour */
  bestGoodness: number;
};

/** Daytime-only outdoor goodness for one hour. 0 at night. */
export function outdoorGoodness(f: HourlyForecast): number {
  const h = new Date(f.hourISO).getHours();
  if (h < 6 || h >= 19) return 0; // night — no outdoor window
  const rainRisk = f.rainProb * Math.max(0.3, f.rainIntensity); // even light rain dents a plan
  const g = 1 - rainRisk - 0.55 * f.heatIndex;
  return Math.max(0, Math.min(1, g));
}

const hourLabel = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

/**
 * Compute the verdict from a forecast, looking at the next `lookahead` hours
 * starting at `nowIndex`.
 */
export function dayVerdict(hours: HourlyForecast[], nowIndex = 0, lookahead = 9): DayVerdict {
  const slice = hours.slice(nowIndex, nowIndex + lookahead);
  if (slice.length === 0) {
    return { kind: "stay", headline: "ยังอ่านฟ้าไม่ได้", headlineEn: "Can't read the sky yet", headlineZh: "暂时无法读取天气", reason: "ลองใหม่อีกครั้งนะ", reasonEn: "Try again in a moment", reasonZh: "请稍后再试", windowLabel: "", bestHourISO: null, nowGoodness: 0, bestGoodness: 0 };
  }

  const goodness = slice.map(outdoorGoodness);
  const nowGoodness = goodness[0];

  // Find the best contiguous daytime window (peak hour).
  let bestIdx = 0;
  for (let i = 1; i < goodness.length; i++) if (goodness[i] > goodness[bestIdx]) bestIdx = i;
  const bestGoodness = goodness[bestIdx];

  // Expand the window around the peak (hours within 0.12 of peak, contiguous).
  let lo = bestIdx, hi = bestIdx;
  while (lo > 0 && goodness[lo - 1] >= bestGoodness - 0.12 && goodness[lo - 1] > 0.45) lo--;
  while (hi < goodness.length - 1 && goodness[hi + 1] >= bestGoodness - 0.12 && goodness[hi + 1] > 0.45) hi++;
  const windowLabel = bestGoodness > 0.45 ? `${hourLabel(slice[lo].hourISO)}–${endLabel(slice, hi)}` : "";

  const f0 = slice[0];
  const isNight = new Date(f0.hourISO).getHours() < 6 || new Date(f0.hourISO).getHours() >= 19;

  // GO — right now is good.
  if (nowGoodness >= 0.6) {
    return {
      kind: "go",
      headline: "ออกได้เลย",
      headlineEn: "Step out now",
      headlineZh: "现在就出发",
      reason: windowLabel
        ? `ฟ้ากำลังเป็นใจ — ดีไปถึงราว ${endLabel(slice, hi)}`
        : "ฟ้ากำลังเป็นใจ ออกไปข้างนอกได้",
      reasonEn: windowLabel
        ? `The sky's on your side — good until about ${endLabel(slice, hi)}`
        : "The sky's on your side — head out",
      reasonZh: windowLabel
        ? `天气正好 — 大约到 ${endLabel(slice, hi)} 都不错`
        : "天气正好，适合出门",
      windowLabel,
      bestHourISO: slice[bestIdx].hourISO,
      nowGoodness,
      bestGoodness,
    };
  }

  // WAIT — a clearly-better window is coming later today.
  if (bestGoodness >= 0.58 && bestIdx > 0 && bestGoodness - nowGoodness > 0.12) {
    const why = reasonNow(f0, isNight);
    return {
      kind: "wait",
      headline: `รอถึง ${hourLabel(slice[bestIdx].hourISO)}`,
      headlineEn: `Wait until ${hourLabel(slice[bestIdx].hourISO)}`,
      headlineZh: `等到 ${hourLabel(slice[bestIdx].hourISO)}`,
      reason: `${why} — ช่วงดีสุดคือ ${windowLabel}`,
      reasonEn: `${reasonNowEn(f0, isNight)} — best window is ${windowLabel}`,
      reasonZh: `${reasonNowZh(f0, isNight)} — 最佳时段是 ${windowLabel}`,
      windowLabel,
      bestHourISO: slice[bestIdx].hourISO,
      nowGoodness,
      bestGoodness,
    };
  }

  // STAY — no good outdoor window in range.
  return {
    kind: "stay",
    headline: "วันนี้เก็บไว้ในร่ม",
    headlineEn: "An indoor day",
    headlineZh: "今天适合室内",
    reason: stayReason(slice),
    reasonEn: stayReasonEn(slice),
    reasonZh: stayReasonZh(slice),
    windowLabel: "",
    bestHourISO: null,
    nowGoodness,
    bestGoodness,
  };
}

function endLabel(slice: HourlyForecast[], hi: number): string {
  // end of the window = start of the hour AFTER the last good hour
  const endIso = slice[Math.min(hi + 1, slice.length - 1)].hourISO;
  return hourLabel(endIso);
}

function reasonNow(f: HourlyForecast, isNight: boolean): string {
  if (isNight) return "ตอนนี้กลางคืน";
  if (f.rainProb * f.rainIntensity > 0.25) return `ตอนนี้ฝนแถวนี้ ${Math.round(f.rainProb * 100)}%`;
  if (f.heatIndex > 0.6) return "ตอนนี้ร้อนจัด";
  return "ตอนนี้ฟ้ายังไม่เปิดเต็มที่";
}

function stayReason(slice: HourlyForecast[]): string {
  const maxRain = Math.max(...slice.map((f) => f.rainProb * f.rainIntensity));
  const maxHeat = Math.max(...slice.map((f) => f.heatIndex));
  if (maxRain > 0.3) return "ฝนคุมโซนเกือบทั้งช่วง — คาเฟ่/ในร่มคุ้มกว่า";
  if (maxHeat > 0.7) return "ร้อนจัดเกือบทั้งวัน — ในร่มที่มีแอร์สบายกว่า";
  return "ฟ้าไม่ค่อยเป็นใจ — กิจกรรมในร่มน่าจะดีกว่า";
}

function reasonNowEn(f: HourlyForecast, isNight: boolean): string {
  if (isNight) return "It's night now";
  if (f.rainProb * f.rainIntensity > 0.25) return `rain around now ~${Math.round(f.rainProb * 100)}%`;
  if (f.heatIndex > 0.6) return "it's scorching right now";
  return "the sky isn't fully open yet";
}

function stayReasonEn(slice: HourlyForecast[]): string {
  const maxRain = Math.max(...slice.map((f) => f.rainProb * f.rainIntensity));
  const maxHeat = Math.max(...slice.map((f) => f.heatIndex));
  if (maxRain > 0.3) return "rain covers most of the window — a café or indoors is the better call";
  if (maxHeat > 0.7) return "scorching most of the day — somewhere with AC is comfier";
  return "the sky isn't cooperating — indoors is the better bet today";
}

function reasonNowZh(f: HourlyForecast, isNight: boolean): string {
  if (isNight) return "现在是夜晚";
  if (f.rainProb * f.rainIntensity > 0.25) return `现在这一带有雨 ~${Math.round(f.rainProb * 100)}%`;
  if (f.heatIndex > 0.6) return "现在很热";
  return "天还没完全放晴";
}

function stayReasonZh(slice: HourlyForecast[]): string {
  const maxRain = Math.max(...slice.map((f) => f.rainProb * f.rainIntensity));
  const maxHeat = Math.max(...slice.map((f) => f.heatIndex));
  if (maxRain > 0.3) return "大部分时段有雨 — 咖啡馆或室内更合适";
  if (maxHeat > 0.7) return "整天偏热 — 有空调的室内更舒适";
  return "天气不太给力 — 室内活动更合适";
}
