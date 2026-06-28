"use client";

import { useLang } from "@/lib/i18n/useLang";

/**
 * HowItWorks — "วิธีคิดของอ่านฟ้า" (§I): forecast → decision in three moves. Faithful to the
 * redesign mockup — a numbered three-step explainer with the brand's hand-drawn line glyphs
 * (read the real sky → match the place to the weather → swap when rain comes).
 */
const STEPS = [
  {
    n: "01",
    icon: (
      <svg width="36" height="36" viewBox="0 0 34 34" fill="none" stroke="#F2A65A" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle cx="17" cy="12" r="4.4" /><line x1="17" y1="3.4" x2="17" y2="5.6" /><line x1="7.8" y1="12" x2="10" y2="12" /><line x1="24" y1="12" x2="26.2" y2="12" /><line x1="10.6" y1="5.6" x2="12.1" y2="7.1" /><line x1="21.9" y1="16.9" x2="23.4" y2="18.4" /><line x1="10.6" y1="18.4" x2="12.1" y2="16.9" /><line x1="21.9" y1="7.1" x2="23.4" y2="5.6" />
        <path d="M5 29 h24" stroke="#1A1F2B" /><path d="M9 29 v-3.5 M14 29 v-6 M19 29 v-2.5 M24 29 v-4.5" stroke="#1A1F2B" />
      </svg>
    ),
    titleEn: "Read the real sky", titleTh: "อ่านฟ้าจริง",
    bodyEn: "Hour by hour, from open data — Open-Meteo, Air4Thai, the BMA. Not a daily average that hides the one wet hour that matters.",
    bodyTh: "ทีละชั่วโมง จากข้อมูลเปิด — Open-Meteo, Air4Thai, กทม. ไม่ใช่ค่าเฉลี่ยทั้งวันที่ซ่อนชั่วโมงฝนสำคัญไว้",
  },
  {
    n: "02",
    icon: (
      <svg width="36" height="36" viewBox="0 0 34 34" fill="none" stroke="#5B7FB8" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M17 30 c0 0 9 -8.6 9 -15.2 a9 9 0 1 0 -18 0 C8 21.4 17 30 17 30Z" /><circle cx="17" cy="14.6" r="3.1" stroke="#F2A65A" />
      </svg>
    ),
    titleEn: "Match the place to the weather", titleTh: "จับคู่ที่กับอากาศ",
    bodyEn: "Every spot keeps its own weather-fit profile. A riverside café shines in soft sun; a gallery is best in the rain — matched to the hour you'll actually arrive.",
    bodyTh: "แต่ละที่มีโปรไฟล์ความเข้ากับอากาศของตัวเอง คาเฟ่ริมน้ำดีตอนแดดอ่อน หอศิลป์ดีตอนฝน — จับคู่กับชั่วโมงที่คุณจะไปถึงจริง",
  },
  {
    n: "03",
    icon: (
      <svg width="36" height="36" viewBox="0 0 34 34" fill="none" stroke="#D9534A" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M6 13 h15 M21 13 l-4 -4 M21 13 l-4 4" /><path d="M28 21 h-15 M13 21 l4 -4 M13 21 l4 4" />
      </svg>
    ),
    titleEn: "Swap when rain comes", titleTh: "สลับเมื่อฝนมา",
    bodyEn: "If the sky turns mid-trip, Arnfah names somewhere better in the rain a short walk away — and tells you the moment to move.",
    bodyTh: "ถ้าฟ้าเปลี่ยนกลางทาง อ่านฟ้าจะบอกที่ที่ดีกว่าเมื่อฝนตก ห่างแค่เดินไม่กี่นาที — พร้อมบอกจังหวะที่ควรย้าย",
  },
];

export function HowItWorks() {
  const { en } = useLang();
  return (
    <section id="how" className="relative z-10 mx-auto max-w-[1360px] px-4 py-[clamp(48px,7vw,96px)] sm:px-[clamp(16px,4vw,46px)]">
      <div className="mb-[clamp(30px,4vw,54px)] flex flex-wrap items-baseline justify-between gap-3.5 border-t border-t-ink pt-3">
        <span className="font-display text-[0.72rem] uppercase tracking-[0.24em] text-ink-muted">{en ? "I. How Arnfah thinks" : "๑. วิธีคิดของอ่านฟ้า"}</span>
        <span className="font-display text-[0.9rem] italic text-ink-faint">{en ? "forecast → decision, in three moves" : "พยากรณ์ → การตัดสินใจ ในสามจังหวะ"}</span>
      </div>
      <div className="grid gap-[clamp(22px,3vw,46px)] sm:grid-cols-2 lg:grid-cols-3">
        {STEPS.map((s) => (
          <div key={s.n} className="af-lift flex flex-col gap-3.5 rounded-2xl border border-hairline bg-surface/40 p-5">
            <div className="flex items-center justify-between">
              <span className="font-thai-serif text-[2.6rem] font-light leading-none tabular-nums text-ink">{s.n}</span>
              {s.icon}
            </div>
            <h3 className="font-display text-[1.4rem] font-medium tracking-tight text-ink">{en ? s.titleEn : s.titleTh}</h3>
            <p className="font-thai leading-relaxed text-ink-muted">{en ? s.bodyEn : s.bodyTh}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
