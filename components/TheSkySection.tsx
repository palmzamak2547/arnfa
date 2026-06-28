"use client";

import { SkyChip, type SkyState } from "@/components/SkyChip";
import { useLang } from "@/lib/i18n/useLang";

/**
 * TheSkySection — "§ ภาค ๑ · How to read the sky", from the Arnfa brand book. The editorial
 * explainer of the core idea — each place has its own weather-fit profile — beside a column of
 * SkyChip states. Fully bilingual: follows the TH/EN toggle so nothing is left untranslated.
 */

const ROWS: { state: SkyState; th: string; en: string }[] = [
  { state: "clear", th: "ออกได้ทุกที่ — ตลาด ริมน้ำ สวน", en: "Anywhere — markets, riverside, parks" },
  { state: "partly", th: "ดีสุดสำหรับเดินเล่นกลางแจ้ง", en: "Best for a stroll outdoors" },
  { state: "cloudy", th: "แดดไม่แรง — เหมาะคาเฟ่ ถ่ายรูป", en: "Soft light — cafés, photos" },
  { state: "rain", th: "สลับเป็นในร่ม — หอศิลป์ คาเฟ่ที่ดีขึ้นเมื่อฝนตก", en: "Switch indoors — galleries, rain-friendly cafés" },
];

export function TheSkySection() {
  const { en } = useLang();
  return (
    <section id="sky" className="relative z-10 mx-auto max-w-[1360px] px-4 py-[clamp(48px,7vw,92px)] sm:px-[clamp(16px,4vw,46px)]">
      <div className="af-rise mb-[clamp(28px,4vw,52px)] flex flex-wrap items-baseline justify-between gap-4 border-t pt-3" style={{ borderColor: "var(--arnfa-ink)" }}>
        <span className="font-display text-[0.72rem] uppercase tracking-[0.24em] text-ink-muted">{en ? "II. How to read the sky" : "๒. อ่านฟ้าให้เป็น"}</span>
        <span className="font-display text-[0.86rem] italic text-ink-faint">{en ? "A field guide to the sky" : "คู่มืออ่านฟ้า"}</span>
      </div>

      <div className="grid items-start gap-[clamp(28px,5vw,72px)] md:grid-cols-2">
        <div className="af-rise">
          <h2 className="font-thai-serif font-light text-ink" style={{ fontSize: "clamp(1.9rem, 1.2rem + 2.6vw, 3.2rem)", lineHeight: 1.28, letterSpacing: "-0.02em" }}>
            {en ? (<>Every place keeps its own <em className="font-display" style={{ fontStyle: "italic" }}>profile</em> of which sky suits it best.</>)
                : (<>แต่ละสถานที่ มี<em className="font-display" style={{ fontStyle: "italic" }}>โปรไฟล์</em>ความเข้ากับอากาศ ของตัวเอง.</>)}
          </h2>
          <p className="mt-[22px] max-w-[44ch] text-ink-muted" style={{ fontSize: "1.04rem", lineHeight: 1.7 }}>
            {en
              ? <>A riverside café shines in soft sun, a gallery in the rain, a night market under a clear sky — Arnfa matches the place to the sky at <span className="font-medium text-ink">the hour you'll actually arrive</span>, not the daily average.</>
              : <>คาเฟ่ริมน้ำดีตอนแดดอ่อน หอศิลป์ดีตอนฝน ตลาดกลางคืนดีตอนฟ้าเปิด — อ่านฟ้าจับคู่ &ldquo;ที่&rdquo; กับ &ldquo;ฟ้า&rdquo; ใน <span className="font-medium text-ink">ชั่วโมงที่คุณจะไปถึงจริง</span> ไม่ใช่ค่าเฉลี่ยทั้งวัน.</>}
          </p>
        </div>

        <div className="af-rise border-t border-hairline" style={{ animationDelay: "120ms" }}>
          {ROWS.map((r) => (
            <div key={r.state} className="flex items-center gap-[14px] border-b border-hairline py-4 sm:gap-[18px]">
              <span className="w-[128px] flex-none sm:w-[150px]"><SkyChip state={r.state} arrivalLabel="" size="sm" /></span>
              <span className="min-w-0 text-[0.96rem] text-ink-muted">{en ? r.en : r.th}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
