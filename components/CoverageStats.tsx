"use client";

import { useLang } from "@/lib/i18n/useLang";
import { DISTRICTS } from "@/lib/poi/registry.generated";
import { ACTIVE_SOURCE_COUNT } from "@/lib/data/sources";

/**
 * CoverageStats — the editorial "one loud honest number" (teardown move #11): the real POI
 * count rendered huge, with the supporting coverage figures. Every number is DERIVED from the
 * live registry / source list (never hardcoded, so it can't drift) — Iron Rule 0.
 */
const TOTAL_POIS = DISTRICTS.reduce((a, d) => a + d.count, 0);
const AREA_COUNT = DISTRICTS.length;

export function CoverageStats() {
  const { en } = useLang();
  const stats = [
    { n: AREA_COUNT, th: "พื้นที่", en: "areas" },
    { n: 77, th: "จังหวัด", en: "provinces" },
    { n: ACTIVE_SOURCE_COUNT, th: "แหล่งข้อมูลเปิด", en: "open-data sources" },
  ];

  return (
    <section className="relative z-10 mx-auto max-w-[1360px] border-t border-hairline px-4 py-[clamp(40px,6vw,80px)] sm:px-[clamp(16px,4vw,46px)]">
      <div className="grid items-end gap-x-12 gap-y-9 md:grid-cols-[1.45fr_1fr]">
        <div>
          <p className="mb-3 font-display text-[0.72rem] uppercase tracking-[0.24em] text-ink-faint">
            {en ? "IV. Coverage" : "๔. พื้นที่ครอบคลุม"}
          </p>
          <h2 className="font-thai-serif fs-h2 font-light leading-[1.12] tracking-tight text-ink">
            {en ? (
              <>The whole country — <em className="not-italic text-sun">not just Bangkok.</em></>
            ) : (
              <>ทั้งประเทศ — <em className="not-italic text-sun">ไม่ใช่แค่กรุงเทพฯ</em></>
            )}
          </h2>
          {/* the one loud number */}
          <div className="mt-6 flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <span className="font-thai-serif font-light leading-[0.9] tabular-nums text-ink" style={{ fontSize: "clamp(3rem, 1.5rem + 6vw, 5.6rem)" }}>
              {TOTAL_POIS.toLocaleString("en-US")}<span className="text-sun">+</span>
            </span>
            <span className="max-w-[15ch] font-thai text-sm leading-snug text-ink-muted">
              {en ? "real places, each read against its own live sky" : "สถานที่จริง อ่านกับฟ้าของมันเอง"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-5 border-t border-hairline pt-6 md:border-t-0 md:pt-0">
          {stats.map((s) => (
            <div key={s.en}>
              <div className="font-thai-serif font-light leading-none tabular-nums text-ink" style={{ fontSize: "clamp(1.8rem, 1.2rem + 2vw, 2.8rem)" }}>
                {s.n.toLocaleString("en-US")}
              </div>
              <div className="mt-1.5 font-thai text-xs text-ink-muted">{en ? s.en : s.th}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
