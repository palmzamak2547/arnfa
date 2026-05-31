"use client";

import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { clsx } from "clsx";
import { TASTE_CARDS, vectorFromAnswers, saveTaste, type TasteAnswers } from "@/lib/plan/taste";
import type { TasteVector } from "@/lib/plan/buildPlan";

/**
 * TasteQuiz — 5-card this-or-that that seeds the taste vector (cold-start + the
 * Hooked "investment" beat). Skippable. On finish, saves to localStorage and
 * calls onDone with the vector so the plan re-ranks immediately.
 *
 * Reduced-motion: no card slide; instant swap (content carries the meaning).
 */
export function TasteQuiz({
  onDone,
  onSkip,
}: {
  onDone: (v: TasteVector) => void;
  onSkip: () => void;
}) {
  const reduce = useReducedMotion();
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<TasteAnswers>({});
  const card = TASTE_CARDS[i];
  const progress = Math.round((i / TASTE_CARDS.length) * 100);

  function pick(side: "a" | "b") {
    const next = { ...answers, [card.id]: side };
    setAnswers(next);
    if (i + 1 < TASTE_CARDS.length) {
      setI(i + 1);
    } else {
      const v = vectorFromAnswers(next);
      saveTaste(v);
      onDone(v);
    }
  }

  return (
    <div className="rounded-3xl border border-hairline bg-surface/80 backdrop-blur-sm p-6 sm:p-8">
      <div className="flex items-center justify-between mb-6">
        <p className="font-display text-xs uppercase tracking-[0.22em] text-ink-faint">
          รู้จักคุณสักนิด — {i + 1}/{TASTE_CARDS.length}
        </p>
        <button type="button" onClick={onSkip} className="font-thai text-sm text-ink-faint hover:text-ink-muted min-h-[44px] px-2">
          ข้ามไปก่อน
        </button>
      </div>

      {/* progress hairline */}
      <div className="h-1 w-full rounded-full bg-[var(--arnfa-hairline)] mb-7 overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-ink"
          initial={false}
          animate={{ width: `${progress}%` }}
          transition={{ duration: reduce ? 0 : 0.5, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={card.id}
          initial={reduce ? false : { opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, x: -24 }}
          transition={{ duration: reduce ? 0.1 : 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          <h3 className="font-thai-serif text-2xl sm:text-3xl font-light text-ink leading-snug mb-6">
            {card.question}
          </h3>
          <div className="grid sm:grid-cols-2 gap-3">
            {(["a", "b"] as const).map((side) => (
              <button
                key={side}
                type="button"
                onClick={() => pick(side)}
                className={clsx(
                  "font-thai text-left rounded-2xl border border-hairline bg-paper/60 p-5 transition-all duration-[var(--dur-fast)]",
                  "hover:border-ink/30 hover:bg-surface hover:-translate-y-0.5 min-h-[44px]",
                )}
              >
                <span className="text-base text-ink">{card[side].label}</span>
              </button>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
