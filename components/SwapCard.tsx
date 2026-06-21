"use client";

import { motion, useReducedMotion } from "framer-motion";
import { SkyChip, type SkyState } from "./SkyChip";
import { useLang } from "@/lib/i18n/useLang";

/**
 * SwapCard — THE wow moment. Card warm-shifts paper → terracotta when rain forces
 * an outdoor→indoor swap. The COLOR is the explanation. Spec: 01-design-lock § Signature 1
 * Reduced-motion: color (info-carrying) stays; only the lift (y) is suppressed.
 */

export type SwapCardProps = {
  from: { name: string; skyState: SkyState; arrivalLabel: string; reason: string };
  to: { name: string; skyState: SkyState; arrivalLabel: string; walkMin: number; why: string };
  active: boolean;
  onAccept?: () => void;
  onDismiss?: () => void;
};

export function SwapCard({ from, to, active, onAccept, onDismiss }: SwapCardProps) {
  const reduce = useReducedMotion();
  const { en, lang } = useLang();
  const tx = (th: string, enS: string, zh: string) => (lang === "zh" ? zh : en ? enS : th);
  return (
    <motion.div
      initial={false}
      animate={{ backgroundColor: active ? "var(--arnfa-accent-indoor-warm)" : "var(--arnfa-surface)", y: reduce ? 0 : active ? -4 : 0 }}
      transition={{ backgroundColor: { duration: 1.2, ease: [0.22, 1, 0.36, 1] }, y: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } }}
      className="rounded-3xl border border-hairline p-6 sm:p-7 shadow-sm"
    >
      <div className="flex items-center justify-between mb-4">
        <span className="font-display text-xs uppercase tracking-[0.2em]" style={{ color: active ? "rgba(255,255,255,0.9)" : "var(--arnfa-ink-faint)" }}>
          {active ? tx("ฝนเข้าแล้ว — เปลี่ยนให้", "Rain's coming — swapped", "下雨了 — 已为你换") : tx("เผื่อทางไว้", "A backup, ready", "备选方案")}
        </span>
        <span className={active ? "rounded-full bg-white/95 px-1 py-0.5" : ""}>
          <SkyChip state={active ? to.skyState : from.skyState} arrivalLabel={active ? to.arrivalLabel : from.arrivalLabel} size="sm" />
        </span>
      </div>

      <p className="font-thai text-lg sm:text-xl leading-relaxed" style={{ color: active ? "#FFFFFF" : "var(--arnfa-ink)" }}>
        {active ? (
          <>
            <span className="line-through opacity-60">{from.name}</span>{" "}
            <span className="opacity-80">{from.reason}</span> {tx("— ไปนั่งจิบที่", "— sit it out at", "— 不如去")}{" "}
            <span className="font-semibold">{to.name}</span> {tx("แทนดีกว่า", "instead", "坐坐")}
          </>
        ) : (
          <>
            {tx("ตอนนี้ ", "", "现在 ")}<span className="font-semibold">{from.name}</span>{tx(" ยังโอเค — แต่ถ้าฝนมา Arnfah มี ", " is fine right now — but if rain rolls in, Arnfah already has ", " 还不错 — 但下雨的话，Arnfah 已备好 ")}<span className="font-semibold">{to.name}</span>{tx(" เผื่อไว้แล้ว", " on standby", "")}
          </>
        )}
      </p>

      {active && (
        <p className="font-thai text-sm mt-3" style={{ color: "rgba(255,255,255,0.82)" }}>
          {tx(`เดินราว ${to.walkMin} นาที — ${to.why}`, `~${to.walkMin} min on foot — ${to.why}`, `步行约 ${to.walkMin} 分钟 — ${to.why}`)}
        </p>
      )}

      <div className="flex gap-3 mt-6">
        <button type="button" onClick={onAccept} className="font-thai inline-flex h-10 items-center rounded-full px-6 text-sm font-medium transition-colors duration-[var(--dur-base)]"
          style={active ? { background: "#FFFFFF", color: "var(--arnfa-accent-indoor-warm)" } : { background: "var(--arnfa-ink)", color: "var(--arnfa-paper)" }}>
          {active ? tx("ไปที่นั่น", "Take me there", "去那里") : tx("เห็นด้วย", "Sounds good", "好")}
        </button>
        <button type="button" onClick={onDismiss} className="font-thai inline-flex h-10 items-center rounded-full border px-6 text-sm font-medium transition-colors duration-[var(--dur-base)]"
          style={active ? { borderColor: "rgba(255,255,255,0.4)", color: "#FFFFFF" } : { borderColor: "var(--arnfa-hairline)", color: "var(--arnfa-ink)" }}>
          {tx("อยู่ต่อ", "Stay", "留下")}
        </button>
      </div>
    </motion.div>
  );
}
