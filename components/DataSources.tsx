"use client";

import Link from "next/link";
import { useLang } from "@/lib/i18n/useLang";
import { NumberTicker } from "./motion/NumberTicker";
import { Reveal } from "./motion/Reveal";
import { DISTRICTS } from "@/lib/poi/registry.generated";
import { DATA_SOURCES, KIND_LABEL, KIND_ORDER, ACTIVE_SOURCE_COUNT, THAI_GOV_COUNT, type DataKind } from "@/lib/data/sources";

// Live, never-fabricated coverage — read straight from the seeded registry + the data-source
// registry, so the "0 fabricated numbers" claim stays literally true and the counts can't drift.
const TOTAL_POIS = DISTRICTS.reduce((a, d) => a + d.count, 0);
const AREA_COUNT = DISTRICTS.length;

/**
 * DataSources — "ทุกการตัดสินใจ มีที่มา" provenance ledger, derived from lib/data/sources.
 * The BDI "FACT not estimation / cite source + License" differentiator: open data,
 * Thai-government data flagged, each tracing to a verifiable link.
 */
export function DataSources() {
  const { en } = useLang();
  const grouped = KIND_ORDER
    .map((k) => ({ kind: k as DataKind, items: DATA_SOURCES.filter((s) => s.kind === k) }))
    .filter((g) => g.items.length);

  return (
    <section className="border-t border-hairline bg-surface/40 px-6 py-24 sm:px-12 lg:px-20">
      <div className="mx-auto max-w-6xl">
        <p className="font-display text-xs uppercase tracking-[0.25em] text-ink-faint mb-6">{en ? "Provenance" : "ที่มาของข้อมูล"}</p>
        <h2 className="font-thai-serif text-3xl sm:text-5xl font-light text-ink leading-tight mb-5 max-w-3xl">
          {en ? "We read the sky from real data — never guessed." : "เราอ่านฟ้าจากข้อมูลจริง ไม่เคยเดา"}
        </h2>
        <p className="font-thai text-lg text-ink-muted leading-relaxed max-w-2xl mb-12">
          {en
            ? "Every Arnfa recommendation traces to verifiable open sources — including official Thai-government data. We never fabricate a forecast; if the data isn't there, we say so."
            : "ทุกคำแนะนำของอ่านฟ้ามาจากแหล่งข้อมูลเปิดที่ตรวจสอบได้ รวมถึงข้อมูลทางการของรัฐไทย เราไม่กุตัวเลขพยากรณ์ ถ้าไม่มีข้อมูล เราบอกตรงๆ"}
        </p>

        <div className="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {grouped.map((g) => (
            <div key={g.kind}>
              <h3 className="font-display text-xs uppercase tracking-[0.18em] text-ink-faint mb-4 pb-3 border-b border-hairline">{en ? KIND_LABEL[g.kind].en : KIND_LABEL[g.kind].th}</h3>
              <ul className="space-y-4">
                {g.items.map((it) => (
                  <li key={it.key}>
                    <a href={it.url} target="_blank" rel="noopener noreferrer" className="group block">
                      <div className="flex items-center gap-2">
                        <span className={`inline-block h-1.5 w-1.5 rounded-full ${it.dormant ? "bg-ink-faint" : it.thaiGov ? "bg-rain" : "bg-success"}`} />
                        <span className="font-sans font-medium text-ink group-hover:text-ink-muted transition-colors">{it.name}</span>
                        {it.thaiGov && <span className="font-thai text-[0.6rem] rounded-full bg-rain/10 px-1.5 py-0.5 text-rain">{en ? "Thai gov" : "ทางการ"}</span>}
                      </div>
                      <p className="font-thai text-sm text-ink-faint mt-0.5 ml-3.5">{en ? it.roleEn : it.role}</p>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <Reveal className="mt-14 grid grid-cols-2 gap-y-8 sm:grid-cols-4 border-t border-hairline pt-10">
          {[
            { n: TOTAL_POIS, th: "สถานที่จริง", en: "real places" },
            { n: ACTIVE_SOURCE_COUNT, th: "แหล่งข้อมูลเปิด", en: "open sources" },
            { n: THAI_GOV_COUNT, th: "ข้อมูลทางการรัฐไทย", en: "Thai-gov sources" },
            { n: 0, th: "ตัวเลขที่กุขึ้น", en: "fabricated numbers" },
          ].map((s) => (
            <div key={s.en}>
              <div className="font-display text-4xl sm:text-5xl text-ink tabular-nums"><NumberTicker value={s.n} /></div>
              <p className="font-thai text-sm text-ink-faint mt-1">{en ? s.en : s.th}</p>
            </div>
          ))}
        </Reveal>

        <div className="mt-12 flex flex-wrap items-center gap-x-6 gap-y-2">
          <Link href="/data" className="font-thai text-sm font-medium text-rain hover:underline">{en ? "All data sources + licenses →" : "ดูแหล่งข้อมูล + สัญญาอนุญาตทั้งหมด →"}</Link>
          <a href="/api/forecast?lat=13.7563&lng=100.5018&hours=6" target="_blank" rel="noopener noreferrer" className="font-thai text-sm text-rain hover:underline">{en ? "View raw data →" : "ดูข้อมูลดิบ →"}</a>
          <span className="font-thai text-sm text-ink-faint">{en ? "Open, reproducible, built for Thailand" : "ข้อมูลเปิด ตรวจสอบซ้ำได้ ทำเพื่อคนไทย"}</span>
        </div>
      </div>
    </section>
  );
}
