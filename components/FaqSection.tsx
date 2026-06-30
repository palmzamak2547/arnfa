"use client";

import { useLang } from "@/lib/i18n/useLang";

/**
 * FaqSection — the editorial FAQ from the redesign (new on the home). Native <details> accordions
 * (no JS), bilingual via useLang. Content is honest: "free", "no forecast is perfect", all-77
 * provinces, TH/EN/中文 — nothing fabricated.
 */
const FAQ = [
  {
    qTh: "อ่านฟ้าใช้ฟรีไหม?",
    qEn: "Is Arnfah free?",
    aTh: "ฟรี — การอ่านฟ้าประจำวันและคำตัดสินวันนี้ใช้ได้ฟรี ล็อกอินเพื่อเก็บทริปได้ แต่ไม่ต้องมีบัญชีก็ใช้ได้",
    aEn: "Yes — the daily sky read and today's verdict are free. You can sign in to save trips, but you don't need an account to browse.",
  },
  {
    qTh: "พยากรณ์แม่นแค่ไหน?",
    qEn: "How accurate is the forecast?",
    aTh: "เราอ่านข้อมูลเปิดสด — Open-Meteo, MET Norway, Air4Thai — รายชั่วโมง ไม่มีพยากรณ์ไหนแม่น 100% ตอนฟ้าไม่ชัวร์เราบอกตรง ๆ และไม่กุตัวเลขเพื่อให้ดูมั่นใจ",
    aEn: "We read live open data — Open-Meteo, MET Norway, Air4Thai — hour by hour. No forecast is perfect, so when the sky is uncertain we say so. We never invent a number to look confident.",
  },
  {
    qTh: "ใช้นอกกรุงเทพฯ ได้ไหม?",
    qEn: "Does it work outside Bangkok?",
    aTh: "ได้ อ่านฟ้าครอบคลุมครบ 77 จังหวัดทั่วไทย — ทะเล ภูเขา ตลาด — แต่ละที่อ่านกับฟ้าท้องถิ่นของมันเอง",
    aEn: "Yes. Arnfah covers all 77 provinces nationwide — beaches, mountains, markets — each read against its own local sky.",
  },
  {
    qTh: "รองรับภาษาอะไรบ้าง?",
    qEn: "Which languages?",
    aTh: "ไทยและอังกฤษเต็มทุกหน้า สลับได้ทุกเมื่อด้วยปุ่มบนแถบด้านบน ภาษาไทยคือหัวใจของถ้อยคำ",
    aEn: "Thai and English throughout — switch any time with the toggle in the top bar. Thai is the heart of the writing.",
  },
];

export function FaqSection() {
  const { en } = useLang();
  return (
    <section id="faq" className="relative z-10 mx-auto max-w-[920px] px-4 py-[clamp(44px,7vw,88px)] sm:px-[clamp(16px,4vw,46px)]">
      <p className="mb-[clamp(18px,3vw,32px)] font-display text-[0.72rem] uppercase tracking-[0.24em] text-ink-faint">
        {en ? "VII. Questions" : "๗. คำถามที่พบบ่อย"}
      </p>
      <div className="border-t border-hairline">
        {FAQ.map((f) => (
          <details key={f.qEn} className="af-faq border-b border-hairline">
            <summary className="flex cursor-pointer items-center justify-between gap-5 py-5 font-display text-[clamp(1.05rem,1rem+0.4vw,1.3rem)] font-medium text-ink transition-colors hover:text-indoor-warm">
              <span className="font-thai-serif">{en ? f.qEn : f.qTh}</span>
              <span aria-hidden className="af-faq-plus flex-none text-2xl font-light leading-none text-ink-faint">+</span>
            </summary>
            <div className="max-w-[62ch] pb-6 font-thai leading-relaxed text-ink-muted">
              {en ? f.aEn : f.aTh}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
