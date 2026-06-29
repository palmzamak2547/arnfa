"use client";

import { useLang } from "@/lib/i18n/useLang";

/**
 * Colophon — "§ ภาค ๕ · Colophon", the broadsheet's closing credits from the Arnfa brand book:
 * the four type voices, the "ink = meaning" colour legend (decoding the weather-semantic palette),
 * and the single "drift" motion note. Fully bilingual (TH/EN toggle); af-rise entrance reveals.
 */

const VOICES = [
  { sample: "อ่านฟ้า", font: "var(--font-thai-serif)", style: { fontWeight: 300, fontSize: "2.4rem" }, th: "พาดหัวไทย · Noto Serif Thai", en: "Thai display · Noto Serif Thai" },
  { sample: "Reads the sky", font: "var(--font-display)", style: { fontStyle: "italic", fontSize: "2.1rem" }, th: "พาดหัวลาติน · Newsreader", en: "Latin display · Newsreader" },
  { sample: "บอกฟ้า แล้วได้ทริปดี", font: "var(--font-thai)", style: { fontSize: "1.4rem" }, th: "เนื้อความไทย · Anuphan", en: "Thai body · Anuphan" },
  { sample: "Body & numerals 0123", font: "var(--font-sans)", style: { fontSize: "1.4rem" }, th: "UI ลาติน · Inter", en: "Latin UI · Inter", tabular: true },
];

const INK = [
  { v: "--arnfa-accent-sun", th: "แดด · ฟ้าเปิด", en: "Sun · clear", note: "#F2A65A · ไป / go" },
  { v: "--arnfa-accent-rain", th: "ฝน · รอ", en: "Rain · wait", note: "#5B7FB8 · ข้อมูล / info" },
  { v: "--arnfa-accent-indoor-warm", th: "เข้าร่ม · สลับ", en: "Indoors · swap", note: "#D9534A · เตือน / alert" },
  { v: "--arnfa-success", th: "เคลียร์ · ไปได้", en: "Clear · go", note: "#7BA68A · ผ่าน / pass" },
];

function Head({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-[22px] border-b border-hairline pb-2.5 font-display text-[0.74rem] uppercase tracking-[0.18em] text-ink-faint">{children}</h3>;
}

export function Colophon() {
  const { en } = useLang();
  return (
    <section id="colophon" className="relative z-10 mx-auto max-w-[1360px] px-4 py-[clamp(48px,7vw,92px)] sm:px-[clamp(16px,4vw,46px)]">
      <div className="af-rise mb-[clamp(30px,4vw,56px)] flex flex-wrap items-baseline justify-between gap-4 border-t border-ink pt-3">
        <span className="font-display text-[0.72rem] uppercase tracking-[0.24em] text-ink-muted">{en ? "VIII. Colophon" : "๘. ลายเซ็นฉบับ"}</span>
        <span className="font-display text-[0.86rem] italic text-ink-faint">{en ? "Type, ink & motion" : "ตัวพิมพ์ หมึก และจังหวะ"}</span>
      </div>

      <div className="grid items-start gap-[clamp(20px,3vw,40px)] [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))]">
        {/* THE VOICES */}
        <div className="af-rise">
          <Head>{en ? "Four voices · The voices" : "ตัวพิมพ์สี่เสียง — The voices"}</Head>
          {VOICES.map((v) => (
            <div key={v.sample} className="mb-5">
              <div className={v.tabular ? "tabular-nums leading-none text-ink" : "leading-none text-ink"} style={{ fontFamily: v.font, ...v.style }}>{v.sample}</div>
              <div className="mt-1 text-[0.74rem] text-ink-faint">{en ? v.en : v.th}</div>
            </div>
          ))}
        </div>

        {/* INK = MEANING */}
        <div className="af-rise" style={{ animationDelay: "100ms" }}>
          <Head>{en ? "Ink = meaning" : "หมึกที่มีความหมาย — Ink = meaning"}</Head>
          <div className="flex flex-col gap-3.5">
            {INK.map((k) => (
              <div key={k.v} className="flex items-center gap-3.5">
                <span className="h-[46px] w-[46px] flex-none rounded-lg shadow-sm" style={{ background: `var(${k.v})` }} />
                <span className="flex flex-col leading-[1.36]">
                  <span className="font-medium text-ink">{en ? k.en : k.th}</span>
                  <span className="tabular-nums text-[0.78rem] text-ink-faint">{k.note}</span>
                </span>
              </div>
            ))}
            <div className="mt-1 flex items-center gap-3.5 border-t border-hairline pt-3.5">
              <span className="h-[46px] w-[46px] flex-none rounded-lg border border-hairline bg-paper" />
              <span className="h-[46px] w-[46px] flex-none rounded-lg bg-ink" />
              <span className="text-[0.82rem] text-ink-faint">{en ? "Warm paper + deep navy ink" : "กระดาษอุ่น + หมึกน้ำเงินเข้ม"}<br /><span className="tabular-nums">#F4EFE6 · #1A1F2B</span></span>
            </div>
          </div>
        </div>

        {/* THE DRIFT */}
        <div className="af-rise" style={{ animationDelay: "200ms" }}>
          <Head>{en ? "One easing · The drift" : "จังหวะเดียว — The drift"}</Head>
          <p className="mb-[22px] text-[0.98rem] leading-[1.7] text-ink-muted">
            {en ? "Everything moves on one easing — soft, gliding, never bouncy. Like a drifting cloud, not a spring." : "ทุกการเคลื่อนไหวใช้อีสซิ่งเดียว — นุ่ม ลื่น ไม่เด้ง เหมือนเมฆลอย ไม่ใช่สปริง."}
          </p>
          <div className="relative mb-3.5 h-2 rounded-full bg-hairline">
            <span className="arnfa-travel absolute top-1/2 -mt-[9px] h-[18px] w-[18px] rounded-full bg-sun" style={{ boxShadow: "0 0 14px 2px rgba(242,166,90,.5)" }} />
          </div>
          <p className="font-sans tabular-nums text-[0.78rem] text-ink-faint">cubic-bezier(0.22, 1, 0.36, 1)</p>
          <div className="mt-6 flex flex-wrap gap-2.5">
            {[en ? "fast 320ms" : "เร็ว 320ms", en ? "base 700ms" : "ฐาน 700ms", en ? "slow 1200ms" : "ช้า 1200ms"].map((c) => (
              <span key={c} className="tabular-nums rounded-full border border-hairline px-3 py-1.5 text-[0.78rem] text-ink-muted">{c}</span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
