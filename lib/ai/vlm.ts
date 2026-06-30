/**
 * vlm.ts — NVIDIA NIM VISION client. Reads ONE still frame from a real traffic/street camera
 * and returns a STRUCTURED, honest read (sky / road / flooding / traffic / time-of-day). This is
 * Arnfa's 3rd ground-truth layer (next to forecast + Air4Thai) — and the ONLY one that can see
 * STREET-LEVEL flooding, the gap GloFAS (river-basin) structurally cannot fill.
 *
 * Same OpenAI-compatible endpoint + keys as the text NIM (lib/ai/nim.ts) — just an image part.
 * Dormant-until-key. Iron Rule 0: the model reports only what's visible and says "unsure" rather
 * than guessing; we never trust its self-confidence (zero-shot VLMs are badly calibrated) — the
 * /api/cam-read route gates the flood flag on real rain + daytime, not on this number.
 */

import { nimKeys, extractJson } from "./nim";

const VLM_URL = "https://integrate.api.nvidia.com/v1/chat/completions";
// 11b is fast (~2s, verified) + free; 90b is the slower accuracy fallback (only fires if 11b
// 429s/errors). No response_format — the hosted VLM may reject it; a strict prompt + extractJson
// is what I verified works on real frames.
const VLM_MODELS = ["meta/llama-3.2-11b-vision-instruct", "meta/llama-3.2-90b-vision-instruct"];

export type CamRead = {
  sky: "clear" | "cloudy" | "overcast" | "raining" | "unsure";
  road: "dry" | "wet" | "standing_water" | "flooded" | "unsure";
  flooding: "none" | "minor" | "street_flood" | "unsure";
  traffic: "light" | "moderate" | "heavy" | "jam" | "unsure";
  timeOfDay: "day" | "dusk_dawn" | "night" | "unsure";
  confidence: number; // 0..1 — the model's OWN (untrusted) certainty
};

const ENUMS = {
  sky: ["clear", "cloudy", "overcast", "raining", "unsure"],
  road: ["dry", "wet", "standing_water", "flooded", "unsure"],
  flooding: ["none", "minor", "street_flood", "unsure"],
  traffic: ["light", "moderate", "heavy", "jam", "unsure"],
  time_of_day: ["day", "dusk_dawn", "night", "unsure"],
} as const;

// One concise user message (verified to return clean JSON from 11b + 90b on real frames). NO free
// text field: a Thai `note_th` made the model degenerate into a repeated character ("สสสส…") that
// ran to max_tokens and truncated the JSON. The bounded enums carry all the meaning + can't blow up.
const VLM_PROMPT =
  'Reading ONE still frame from a Thai public street/traffic camera. Reply with ONLY compact JSON, no prose:\n' +
  '{"sky":"clear|cloudy|overcast|raining|unsure","road":"dry|wet|standing_water|flooded|unsure",' +
  '"flooding":"none|minor|street_flood|unsure","traffic":"light|moderate|heavy|jam|unsure",' +
  '"time_of_day":"day|dusk_dawn|night|unsure","confidence":0.0-1.0}\n' +
  'Only state what you can actually SEE; use "unsure" if not clear. Judge flooding ONLY from visible ' +
  'water covering the road (reflections/shadows are NOT flooding). Do not read plates or describe people.';

export function vlmConfigured(): boolean {
  return nimKeys().length > 0;
}

function pick<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  return typeof v === "string" && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
}

/** Parse + clamp the model's reply into a typed, enum-safe CamRead (never trusts free text). */
export function parseCamRead(raw: string): CamRead | null {
  const j = extractJson<Record<string, unknown>>(raw);
  if (!j) return null;
  let conf = Number(j.confidence);
  if (!Number.isFinite(conf)) conf = 0;
  conf = Math.max(0, Math.min(1, conf));
  return {
    sky: pick(j.sky, ENUMS.sky, "unsure"),
    road: pick(j.road, ENUMS.road, "unsure"),
    flooding: pick(j.flooding, ENUMS.flooding, "unsure"),
    traffic: pick(j.traffic, ENUMS.traffic, "unsure"),
    timeOfDay: pick(j.time_of_day, ENUMS.time_of_day, "unsure"),
    confidence: conf,
  };
}

export type FloodVerdict = {
  level: "none" | "possible" | "likely";
  th: string;
  en: string;
  nightCapped: boolean;
  rainCorroborated: boolean | null;
};

/**
 * Honest flood verdict from the raw read + REAL context — never asserts on the model alone
 * (zero-shot VLMs are over-confident + miscall wet-vs-flood / night constantly):
 *   · no flood claim → "none"
 *   · night → don't assert (the camera can't be read reliably in the dark)
 *   · daytime + corroborating real rain → "likely" (still hedged: "go verify")
 *   · daytime + NO rain → "possible" — most likely a reflection/shadow, never asserted
 */
export function assessFlood(read: CamRead, hadRain: boolean | null): FloodVerdict {
  const night = read.timeOfDay === "night";
  const claimsFlood = read.flooding === "street_flood" || read.road === "flooded" || read.road === "standing_water";
  if (!claimsFlood) return { level: "none", th: "", en: "", nightCapped: night, rainCorroborated: hadRain };
  if (night) return { level: "none", th: "กล้องกลางคืน ประเมินน้ำท่วมจากภาพไม่ได้", en: "Night camera — can't assess flooding from the image", nightCapped: true, rainCorroborated: hadRain };
  if (hadRain === true) return { level: "likely", th: "ภาพกล้องดูเหมือนมีน้ำขังบนถนน และมีฝนแถวนี้ — ช่วยเช็คจากกล้องสด", en: "Looks like standing water on the road, and it's been raining nearby — please verify on the live camera", nightCapped: false, rainCorroborated: true };
  return { level: "possible", th: "ภาพดูคล้ายมีน้ำบนถนน แต่ไม่มีฝนแถวนี้ — อาจเป็นแสงสะท้อน ลองดูจากกล้องสด", en: "Image looks like water on the road, but no rain nearby — may be a reflection; check the live camera", nightCapped: false, rainCorroborated: hadRain };
}

/** Read one frame (a data:image/jpeg;base64 URL). Tries 11b then 90b, each across all keys, under
 *  a deadline budget. Returns the raw model text (parse with parseCamRead) or null on exhaustion. */
export async function vlmRead(dataUrl: string, opts: { deadlineMs?: number } = {}): Promise<string | null> {
  const keys = nimKeys();
  if (!keys.length) return null;
  const deadline = opts.deadlineMs ?? Date.now() + 22000;
  const body = (model: string) =>
    JSON.stringify({
      model,
      messages: [
        { role: "user", content: [
          { type: "text", text: VLM_PROMPT },
          { type: "image_url", image_url: { url: dataUrl } },
        ] },
      ],
      max_tokens: 120, // the JSON is tiny; a tight cap + the penalty kill any repetition loop
      temperature: 0.2,
      frequency_penalty: 0.5,
    });
  for (const model of VLM_MODELS) {
    for (const key of keys) {
      const remaining = deadline - Date.now();
      // VLMs need more headroom than text; the 90b can take ~18s, so don't even start if we can't finish
      if (remaining <= 2500) return null;
      try {
        const r = await fetch(VLM_URL, {
          method: "POST",
          headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
          body: body(model),
          signal: AbortSignal.timeout(Math.min(model.includes("90b") ? 24000 : 10000, remaining)),
        });
        if (r.status === 429) continue; // rate-limited → next key
        if (!r.ok) break;               // other model error → next model
        const j = await r.json();
        const c: string | undefined = j?.choices?.[0]?.message?.content;
        if (c && c.trim()) return c.trim();
      } catch {
        /* timeout / network → next key */
      }
    }
  }
  return null;
}
