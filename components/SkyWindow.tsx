"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { dayVerdict, type DayVerdict, type VerdictKind } from "@/lib/core/verdict";
import type { HourlyForecast } from "@/lib/weather/types";

/**
 * SkyWindow — THE daily-ritual hook (UX research feature #1).
 *
 * Open Arnfa → instantly see today's one-line verdict ("go now / wait / stay in"),
 * computed from the REAL Bangkok forecast. Variable reward (the sky changes daily),
 * honest (Iron Rule 0: cites provider + window). The thing people open every day.
 *
 * Spec: projects/arnfa/01-design-lock.md + UX research.
 */

const BKK = { lat: 13.7563, lng: 100.5018 };

const KIND_STYLE: Record<VerdictKind, { accent: string; tint: string; kicker: string }> = {
  go:   { accent: "var(--arnfa-success)",            tint: "rgba(123,166,138,0.10)", kicker: "ฟ้าวันนี้" },
  wait: { accent: "var(--arnfa-accent-rain)",        tint: "rgba(91,127,184,0.10)",  kicker: "ฟ้าวันนี้" },
  stay: { accent: "var(--arnfa-accent-indoor-warm)", tint: "rgba(217,83,74,0.09)",   kicker: "ฟ้าวันนี้" },
};

export function SkyWindow() {
  const reduce = useReducedMotion();
  const [hours, setHours] = useState<HourlyForecast[] | null>(null);
  const [provider, setProvider] = useState("");
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/forecast?lat=${BKK.lat}&lng=${BKK.lng}&hours=18`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((d) => { if (!cancelled) { setHours(d.hours); setProvider(d.providerUsed ?? ""); setState("ok"); } })
      .catch(() => { if (!cancelled) setState("error"); });
    return () => { cancelled = true; };
  }, []);

  const verdict: DayVerdict | null = useMemo(() => {
    if (!hours) return null;
    const nowHour = new Date().getHours();
    const idx = hours.findIndex((f) => new Date(f.hourISO).getHours() === nowHour);
    return dayVerdict(hours, idx >= 0 ? idx : 0);
  }, [hours]);

  const style = verdict ? KIND_STYLE[verdict.kind] : KIND_STYLE.go;

  return (
    <section className="relative z-10 px-6 sm:px-12 lg:px-20 -mt-20 sm:-mt-28">
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto max-w-3xl rounded-[2rem] border border-hairline bg-surface/85 p-7 sm:p-9 shadow-[0_20px_60px_-30px_rgba(26,31,43,0.35)] backdrop-blur-md"
        style={{ background: `linear-gradient(180deg, ${style.tint}, var(--arnfa-surface) 60%)` }}
      >
        <div className="flex items-center gap-2 mb-5">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: style.accent }} />
          <span className="font-display text-xs uppercase tracking-[0.28em] text-ink-faint">
            {style.kicker}
          </span>
          {state === "ok" && provider && (
            <span className="font-thai ml-auto text-xs text-ink-faint">
              ฟ้าจาก {provider} · {new Date().getHours()}:00
            </span>
          )}
        </div>

        {state === "loading" && (
          <div className="font-thai text-ink-faint py-6 animate-pulse">กำลังอ่านฟ้ากรุงเทพ…</div>
        )}

        {state === "error" && (
          <p className="font-thai text-ink-muted py-4">
            ดูฟ้าตอนนี้ไม่ได้ — เดี๋ยวลองใหม่นะ. (เราไม่เดาฟ้าให้)
          </p>
        )}

        {verdict && state === "ok" && (
          <>
            <h2
              className="font-thai-serif text-4xl sm:text-6xl font-light leading-[1.02] tracking-tight"
              style={{ color: verdict.kind === "stay" ? style.accent : "var(--arnfa-ink)" }}
            >
              <span>{verdict.headline}</span>
            </h2>
            <p className="font-thai mt-4 text-lg sm:text-xl text-ink-muted leading-relaxed">
              {verdict.reason}
            </p>

            {/* honest goodness meter — the sky window, visualized */}
            <WindowMeter verdict={verdict} accent={style.accent} reduce={!!reduce} />

            <div className="mt-7 flex flex-wrap items-center gap-4">
              <Link
                href="/plan"
                className="font-thai inline-flex h-11 items-center rounded-full px-7 text-sm font-medium text-paper transition-transform duration-[var(--dur-base)] ease-[var(--ease-drift)] hover:-translate-y-0.5"
                style={{ background: "var(--arnfa-ink)" }}
              >
                {verdict.kind === "stay" ? "หาที่ในร่มให้หน่อย" : "วางแผนทริปเลย"}
              </Link>
              <span className="font-thai text-sm text-ink-faint">
                {verdict.windowLabel ? `ช่วงดีสุด ${verdict.windowLabel}` : "อิงพยากรณ์จริง ไม่เดาให้"}
              </span>
            </div>
          </>
        )}
      </motion.div>
    </section>
  );
}

/** A slim bar showing now-goodness vs best-goodness — the "window" made visible. */
function WindowMeter({ verdict, accent, reduce }: { verdict: DayVerdict; accent: string; reduce: boolean }) {
  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-2 font-thai text-xs text-ink-faint">
        <span>ตอนนี้</span>
        <span>ช่วงดีสุด</span>
      </div>
      <div className="relative h-2 w-full rounded-full bg-[var(--arnfa-hairline)] overflow-hidden">
        <motion.div
          initial={reduce ? false : { width: 0 }}
          animate={{ width: `${Math.round(verdict.bestGoodness * 100)}%` }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-y-0 left-0 rounded-full opacity-30"
          style={{ background: accent }}
        />
        <motion.div
          initial={reduce ? false : { width: 0 }}
          animate={{ width: `${Math.round(verdict.nowGoodness * 100)}%` }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ background: accent }}
        />
      </div>
    </div>
  );
}
