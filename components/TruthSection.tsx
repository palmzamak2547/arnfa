"use client";

import Link from "next/link";
import { DATA_SOURCES } from "@/lib/data/sources";
import { useLang } from "@/lib/i18n/useLang";

/**
 * TruthSection — "ความจริง · THE IRON RULE". The brand's honesty value (Iron Rule 0: Arnfa
 * never fabricates a number) made into a striking dark, inverted editorial section: a giant
 * orange "0" = zero fabricated numbers, the manifesto, and a numbered SOURCES colophon drawn
 * from the real source registry. Fully bilingual — follows the TH/EN toggle.
 */

const TH_NUM = ["๑", "๒", "๓", "๔", "๕", "๖", "๗", "๘"];

const COLOPHON = [
  { key: "open-meteo", th: "ฝน อุณหภูมิ ลม รายชั่วโมง", en: "rain, temp, wind — hourly" },
  { key: "air4thai", th: "ฝุ่น PM2.5 รายพื้นที่ (กรมควบคุมมลพิษ)", en: "PM2.5 by area (Thai PCD)" },
  { key: "osm", th: "สถานที่ 20,000+ จุดทั่วไทย", en: "20,000+ places nationwide" },
  { key: "bma-parks", th: "สวน ที่หลบร้อน ฝุ่นในเมือง (กทม.)", en: "parks, refuges, city dust (BMA)" },
];

export function TruthSection() {
  const { en } = useLang();
  const sources = COLOPHON.map((c) => ({ ...c, src: DATA_SOURCES.find((s) => s.key === c.key) })).filter((c) => c.src);

  return (
    <section className="relative isolate z-10 overflow-hidden bg-ink text-paper">
      <div aria-hidden className="pointer-events-none absolute -left-32 -top-24 h-96 w-96 rounded-full bg-sun opacity-[0.07] blur-3xl" />

      <div className="arnfa-grid section-major">
        <div className="col-content">
          <div className="af-rise mb-12 flex items-baseline justify-between gap-4 border-b border-paper/15 pb-5">
            <p className="font-display text-xs uppercase tracking-[0.25em] text-paper/50">{en ? "VI. The Iron Rule" : "๖. กฎเหล็ก"}</p>
            <p className="font-thai-serif text-sm italic text-paper/50">{en ? "Every call has a source" : "ทุกการตัดสินใจ มีที่มา"}</p>
          </div>

          <div className="grid gap-12 md:grid-cols-12 md:gap-10">
            <div className="af-rise md:col-span-5">
              <p className="font-display text-xs uppercase tracking-[0.25em] text-paper/45 mb-5">{en ? "Fabricated numbers" : "ตัวเลขที่กุขึ้น"}</p>
              <div aria-hidden className="mb-6 h-24 w-24 rounded-full border-[11px] border-sun" />
              <h2 className="font-thai-serif text-5xl font-light leading-[1.05] text-paper mb-6">
                {en
                  ? (<>Numbers we <em className="italic text-sun">made up</em></>)
                  : (<>ตัวเลขที่<em className="italic text-sun">กุขึ้น</em></>)}
              </h2>
              <p className="font-thai fs-lead leading-relaxed text-paper/70 max-w-[42ch]">
                {en
                  ? (<>Arnfah never guesses the sky. If the data isn't there it says so — <em className="text-paper/90">&ldquo;can't read the sky right now — try again&rdquo;</em> — instead of inventing a number to fill the gap.</>)
                  : (<>อ่านฟ้าไม่เดาฟ้าให้. ถ้าดึงข้อมูลไม่ได้ มันบอกตรง ๆ ว่า <em className="text-paper/90">&ldquo;ดูฟ้าตอนนี้ไม่ได้ — เดี๋ยวลองใหม่นะ&rdquo;</em> ไม่ปั้นตัวเลขมากลบความว่าง.</>)}
              </p>
            </div>

            <div className="af-rise md:col-span-6 md:col-start-7" style={{ animationDelay: "120ms" }}>
              <p className="font-display text-xs uppercase tracking-[0.25em] text-paper/45 mb-2">{en ? "Where every number comes from — Sources" : "ที่มาของทุกตัวเลข — Sources"}</p>
              <ul>
                {sources.map((s, i) => (
                  <li key={s.key} className="flex items-baseline gap-4 border-b border-paper/12 py-4">
                    <span className="font-thai-serif text-lg shrink-0 w-5 text-sun">{TH_NUM[i]}</span>
                    <a href={s.src!.url} target="_blank" rel="noopener noreferrer"
                      className="font-display text-base font-semibold text-paper hover:text-sun transition-colors w-40 shrink-0">
                      {s.src!.name}
                    </a>
                    <span className="font-thai text-sm text-paper/55 leading-snug">{en ? s.en : s.th}</span>
                  </li>
                ))}
              </ul>
              <Link href="/data" className="group mt-6 inline-flex items-center gap-3 font-thai text-sm text-sun">
                {en ? "See all the raw data" : "ดูข้อมูลดิบทั้งหมด"}
                <span aria-hidden className="transition-transform group-hover:translate-x-1">→</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
