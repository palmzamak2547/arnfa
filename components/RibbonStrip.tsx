"use client";

import { useLang } from "@/lib/i18n/useLang";
import { ArnfaRibbon } from "@/components/ArnfaRibbon";

/** RibbonStrip — the "alive weather strip" with a bilingual eyebrow (the label was a
 *  hard-coded Thai literal in the server home, so it never followed the TH/EN toggle). */
export function RibbonStrip() {
  const { en } = useLang();
  return (
    <section className="relative z-10 arnfa-grid section-minor border-b border-hairline">
      <div className="col-content">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
          <p className="font-display text-xs uppercase tracking-[0.25em] text-ink-faint">
            {en ? "Arnfah — next six hours" : "อ่านฟ้า — ฟ้าหกชั่วโมงข้างหน้า"}
          </p>
          <p className="hidden font-display text-[0.82rem] italic text-ink-faint sm:block">
            {en ? "the afternoon, hour by hour" : "บ่ายนี้ ทีละชั่วโมง"}
          </p>
        </div>
        <ArnfaRibbon />
      </div>
    </section>
  );
}
