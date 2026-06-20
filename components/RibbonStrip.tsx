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
        <p className="mb-4 font-display text-xs uppercase tracking-[0.25em] text-ink-faint">
          {en ? "Arnfah — next six hours" : "อ่านฟ้า — ฟ้าหกชั่วโมงข้างหน้า"}
        </p>
        <ArnfaRibbon />
      </div>
    </section>
  );
}
