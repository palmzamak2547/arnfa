/**
 * taste.ts — the user's taste vector (cold-start quiz + persistence).
 *
 * Cold-start problem: a fresh user has no history, so every plan is generic.
 * A 5-card "this or that" quiz seeds a per-category affinity vector; it's stored
 * in localStorage and fed into buildPlan's `interest`. Psychology: the small
 * investment (answering) makes tomorrow's plan visibly more "you" (Hooked model
 * investment phase) — and it's skippable so it never blocks the magic.
 *
 * Pure data + helpers; the quiz UI lives in components/TasteQuiz.tsx.
 */

import type { TasteVector } from "./buildPlan";
import { NEUTRAL_TASTE } from "./buildPlan";

export const TASTE_STORAGE_KEY = "arnfa.taste.v1";

/** One this-or-that card: choosing a side nudges those categories up. */
export type TasteCard = {
  id: string;
  question: string;
  a: { label: string; emoji?: string; boosts: Partial<Record<string, number>> };
  b: { label: string; emoji?: string; boosts: Partial<Record<string, number>> };
};

/**
 * 5 cards. Each side boosts 1-2 categories. We deliberately phrase them as vibes,
 * not data ("เช้าวันหยุด อยากตื่นไป…") so it feels like a friend, not a form.
 * NO emoji weather per design rule; the small lifestyle emojis here are fine.
 */
export const TASTE_CARDS: TasteCard[] = [
  {
    id: "morning",
    question: "เช้าวันหยุด อยากเริ่มที่ไหน?",
    a: { label: "คาเฟ่เงียบๆ จิบกาแฟ", boosts: { cafe: 0.3, library: 0.1 } },
    b: { label: "สวนเดินรับลม", boosts: { park: 0.3, garden: 0.2 } },
  },
  {
    id: "afternoon",
    question: "บ่ายๆ ชอบแบบไหนมากกว่า?",
    a: { label: "เดินตลาด ของกินเพียบ", boosts: { market: 0.3, restaurant: 0.15 } },
    b: { label: "ดูงานอาร์ต เดินแกลเลอรี", boosts: { gallery: 0.3, museum: 0.2 } },
  },
  {
    id: "view",
    question: "ถ้าฟ้าสวย อยากไป…?",
    a: { label: "จุดชมวิว เห็นเมือง", boosts: { viewpoint: 0.35 } },
    b: { label: "ร้านมีหลังคา นั่งสบาย", boosts: { cafe: 0.2, restaurant: 0.15 } },
  },
  {
    id: "evening",
    question: "เย็นนี้อยากปิดท้ายยังไง?",
    a: { label: "บาร์ชิลๆ มีดนตรี", boosts: { bar: 0.3 } },
    b: { label: "ห้างเย็นๆ เดินเล่น", boosts: { mall: 0.25 } },
  },
  {
    id: "rain",
    question: "ฝนตกกะทันหัน คุณ…?",
    a: { label: "หาคาเฟ่ดูฝานผ่านหน้าต่าง", boosts: { cafe: 0.25, library: 0.15 } },
    b: { label: "เข้าห้าง/พิพิธภัณฑ์ไปเลย", boosts: { mall: 0.2, museum: 0.2 } },
  },
];

export type TasteAnswers = Record<string, "a" | "b">;

/** Fold answers into a taste vector starting from neutral. */
export function vectorFromAnswers(answers: TasteAnswers): TasteVector {
  const v: TasteVector = { ...NEUTRAL_TASTE };
  for (const card of TASTE_CARDS) {
    const pick = answers[card.id];
    if (!pick) continue;
    const boosts = card[pick].boosts;
    for (const [cat, amt] of Object.entries(boosts)) {
      v[cat] = clamp01((v[cat] ?? 0.4) + (amt ?? 0));
    }
  }
  return v;
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/** Load the saved taste vector, or null if the user never did the quiz. */
export function loadTaste(): TasteVector | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(TASTE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") return parsed as TasteVector;
  } catch {
    /* ignore */
  }
  return null;
}

export function saveTaste(v: TasteVector) {
  try {
    localStorage.setItem(TASTE_STORAGE_KEY, JSON.stringify(v));
  } catch {
    /* ignore */
  }
}

export function clearTaste() {
  try {
    localStorage.removeItem(TASTE_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
