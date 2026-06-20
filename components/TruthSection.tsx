import Link from "next/link";
import { DATA_SOURCES } from "@/lib/data/sources";

/**
 * TruthSection — "ความจริง · THE IRON RULE". The brand's honesty value (Iron Rule 0: Arnfa
 * never fabricates a number) made into a striking dark, inverted editorial section: a giant
 * orange "0" = zero fabricated numbers, the manifesto, and a numbered SOURCES colophon drawn
 * from the real source registry. From the Arnfa advanced brand design (the "ความจริง · Truth"
 * section). Replaces the plain provenance block on the home page; /data holds the full catalog.
 */

const TH_NUM = ["๑", "๒", "๓", "๔", "๕", "๖", "๗", "๘"];

// The headline four — pulled from the real registry so the names/roles stay single-source-of-truth.
const COLOPHON = [
  { key: "open-meteo", th: "ฝน อุณหภูมิ ลม รายชั่วโมง", en: "rain, temp, wind — hourly" },
  { key: "air4thai", th: "ฝุ่น PM2.5 รายพื้นที่ (กรมควบคุมมลพิษ)", en: "PM2.5 by area (PCD)" },
  { key: "osm", th: "สถานที่ 20,000+ จุดทั่วไทย", en: "20,000+ places nationwide" },
  { key: "bma-parks", th: "สวน · ที่หลบร้อน · ฝุ่นในเมือง (กทม.)", en: "parks · refuges · city dust (BMA)" },
];

export function TruthSection() {
  const sources = COLOPHON.map((c) => ({ ...c, src: DATA_SOURCES.find((s) => s.key === c.key) })).filter((c) => c.src);

  return (
    <section className="relative isolate overflow-hidden bg-ink text-paper">
      {/* a barely-there warm aura top-left, echoing the sun on a dark sky */}
      <div aria-hidden className="pointer-events-none absolute -left-32 -top-24 h-96 w-96 rounded-full opacity-[0.07] blur-3xl" style={{ background: "var(--arnfa-accent-sun)" }} />

      <div className="arnfa-grid section-major">
        <div className="col-content">
          {/* eyebrow row */}
          <div className="mb-12 flex items-baseline justify-between gap-4 border-b border-paper/15 pb-5">
            <p className="font-display text-xs uppercase tracking-[0.25em] text-paper/50">ภาค ๓ · The Iron Rule</p>
            <p className="font-thai-serif text-sm italic text-paper/50">ทุกการตัดสินใจ มีที่มา</p>
          </div>

          <div className="grid gap-12 md:grid-cols-12 md:gap-10">
            {/* LEFT — the zero + manifesto */}
            <div className="md:col-span-5">
              <p className="font-display text-xs uppercase tracking-[0.25em] text-paper/45 mb-5">Fabricated numbers</p>
              <div aria-hidden className="mb-6 h-24 w-24 rounded-full border-[11px]" style={{ borderColor: "var(--arnfa-accent-sun)" }} />
              <h2 className="font-thai-serif text-5xl font-light leading-[1.05] text-paper mb-6">
                ตัวเลขที่<em className="italic" style={{ color: "var(--arnfa-accent-sun)" }}>กุขึ้น</em>
              </h2>
              <p className="font-thai fs-lead leading-relaxed text-paper/70 max-w-[42ch]">
                อ่านฟ้าไม่เดาฟ้าให้. ถ้าดึงข้อมูลไม่ได้ มันบอกตรง ๆ ว่า{" "}
                <em className="text-paper/90">&ldquo;ดูฟ้าตอนนี้ไม่ได้ — เดี๋ยวลองใหม่นะ&rdquo;</em>{" "}
                ไม่ปั้นตัวเลขมากลบความว่าง.
              </p>
            </div>

            {/* RIGHT — the sources colophon */}
            <div className="md:col-span-6 md:col-start-7">
              <p className="font-display text-xs uppercase tracking-[0.25em] text-paper/45 mb-2">ที่มาของทุกตัวเลข · Sources</p>
              <ul>
                {sources.map((s, i) => (
                  <li key={s.key} className="flex items-baseline gap-4 border-b border-paper/12 py-4">
                    <span className="font-thai-serif text-lg shrink-0 w-5" style={{ color: "var(--arnfa-accent-sun)" }}>{TH_NUM[i]}</span>
                    <a href={s.src!.url} target="_blank" rel="noopener noreferrer"
                      className="font-display text-base font-semibold text-paper hover:text-[var(--arnfa-accent-sun)] transition-colors w-40 shrink-0">
                      {s.src!.name}
                    </a>
                    <span className="font-thai text-sm text-paper/55 leading-snug">{s.th}</span>
                  </li>
                ))}
              </ul>
              <Link href="/data" className="group mt-6 inline-flex items-center gap-3 font-thai text-sm" style={{ color: "var(--arnfa-accent-sun)" }}>
                ดูข้อมูลดิบทั้งหมด
                <span aria-hidden className="transition-transform group-hover:translate-x-1">→</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
