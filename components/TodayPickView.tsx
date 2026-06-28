"use client";

import Link from "next/link";
import { Reveal } from "@/components/motion/Reveal";
import { useLang } from "@/lib/i18n/useLang";

/** TodayPickView — the bilingual presentation of the home's REAL "clearest today" pick.
 *  TodayPick (server) fetches the ranking via ISR and passes it here so this can follow the
 *  TH/EN toggle (the old all-Thai server section never translated). Iron Rule 0: no top → honest
 *  concept copy, never a fabricated pick. */

export type TopArea = { key: string; en: string; th: string; tempC: number; rainProb: number; verdict: string };

const VERDICT_PROSE: Record<string, { th: string; en: string }> = {
  clearish: { th: "ฟ้าโปร่ง เหมาะกับกลางแจ้ง", en: "Clear skies — good for the outdoors" },
  ok: { th: "ฟ้ากำลังดี ออกได้สบาย", en: "The sky's nice — easy to be out" },
  closing: { th: "ฟ้าเริ่มปิด เผื่อแผนในร่มไว้", en: "Sky's closing in — keep an indoor plan ready" },
  poor: { th: "ฟ้าปิด ฝนเยอะ วันนี้เน้นในร่ม", en: "Overcast and wet — lean indoors today" },
};

export function TodayPickView({ top }: { top: TopArea | null }) {
  const { en } = useLang();
  return (
    <section className="relative z-10 arnfa-grid section-major">
      <Reveal className="col-content col-left-7">
        <p className="mb-6 font-display text-xs uppercase tracking-[0.25em] text-ink-faint">
          {en ? "III. Clearest today" : "๓. วันนี้ฟ้าโปร่งสุด"}
        </p>

        {top ? (
          <>
            <h2 className="mb-6 text-balance font-thai-serif fs-h2 font-light leading-[1.08] text-ink">
              {en
                ? (<>This afternoon, head to <span className="font-display italic text-sun">{top.en}</span> — the clearest sky in Thailand.</>)
                : (<>บ่ายนี้ไป <span className="font-display italic text-sun">{top.en}</span> — {top.th} ฟ้าเปิดสุดในไทย</>)}
            </h2>
            <p className="mb-7 max-w-[52ch] font-thai fs-lead leading-relaxed text-ink-muted">
              {top.tempC}° · {en ? `avg rain ${top.rainProb}% midday (08:00–18:00). ` : `ฝนเฉลี่ย ${top.rainProb}% ช่วงกลางวัน (08:00–18:00). `}
              {VERDICT_PROSE[top.verdict] ? (en ? VERDICT_PROSE[top.verdict].en : VERDICT_PROSE[top.verdict].th) : ""}
            </p>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              <Link href={`/plan?y=${top.key}`} className="inline-flex h-11 items-center rounded-full bg-ink px-7 font-thai text-base font-medium text-paper transition-colors hover:bg-ink-muted">
                {en ? `Plan a trip in ${top.en} →` : `วางแผนทริปที่ ${top.th} →`}
              </Link>
              <Link href="/where" className="font-thai text-sm text-rain hover:underline">
                {en ? "See the nationwide sky ranking" : "ดูอันดับฟ้าทั่วไทย"}
              </Link>
            </div>
            <p className="mt-6 font-thai text-[0.7rem] text-ink-faint">
              {en ? "Ranked from the real Open-Meteo forecast, updated ~30 min, sorted by sky (dust not yet included)" : "จัดอันดับจากพยากรณ์จริง Open-Meteo อัปเดตทุก ~30 นาที เรียงตามฟ้า (ยังไม่รวมฝุ่น)"}
            </p>
          </>
        ) : (
          <>
            <h2 className="mb-6 text-balance font-thai-serif fs-h2 font-light leading-[1.08] text-ink">
              {en
                ? (<>Every Bangkok afternoon is different — Arnfah reads the sky <span className="font-display italic text-sun">at the moment you'll arrive</span>.</>)
                : (<>ทุกบ่ายฟ้ากรุงเทพไม่เหมือนกัน — Arnfah อ่านฟ้า <span className="font-display italic text-sun">ณ เวลาที่คุณจะไปถึง</span>.</>)}
            </h2>
            <p className="mb-7 max-w-[52ch] font-thai fs-lead leading-relaxed text-ink-muted">
              {en ? "Pick an area and a time and we'll plan the day — when rain comes, it swaps to an indoor place that's better in the rain." : "เลือกย่านกับเวลา แล้วเราจัดทริปให้ — ฝนมาช่วงไหน สลับเป็นที่ในร่มที่ “ดีขึ้นเพราะฝน” ให้ตรงนั้น."}
            </p>
            <Link href="/where" className="inline-flex h-11 items-center rounded-full bg-ink px-7 font-thai text-base font-medium text-paper transition-colors hover:bg-ink-muted">
              {en ? "Where to go today →" : "ไปไหนดีวันนี้ →"}
            </Link>
          </>
        )}
      </Reveal>
    </section>
  );
}
