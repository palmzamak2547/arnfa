"use client";

import Link from "next/link";
import { useLang } from "@/lib/i18n/useLang";

/**
 * WhyArnfah — the editorial "voices" section from the mockup, made HONEST (Iron Rule 0). The
 * mockup shipped fabricated user testimonials + a fake "as mentioned in Bangkok Post/Time Out"
 * press marquee; on the one app whose brand is "0 fabricated", we keep the DESIGN (3 accent
 * quote-cards + a marquee) but the content is real: the three product promises (no fake people)
 * and the REAL open-data sources the engine runs on (the honest credential), linking to /data.
 */
const REASONS = [
  { accent: "var(--arnfa-accent-sun)", th: "ฝนมาก็สลับที่ในร่มให้ก่อนคุณเปียก ห่างแค่เดินไม่กี่นาที", en: "When rain comes it swaps you indoors before you're caught — a short walk away.", subTh: "ทริปที่ฝนพังไม่ได้", subEn: "a trip the rain can't ruin" },
  { accent: "var(--arnfa-accent-indoor-warm)", th: "ทุกตัวเลขมีที่มา ไม่ชัวร์ก็บอกตรง ๆ ไม่กุเลขให้ดูมั่นใจ", en: "Every number has a source. When it's unsure it says so — it never invents one to look confident.", subTh: "0 ตัวเลขที่กุขึ้น", subEn: "0 fabricated numbers" },
  { accent: "var(--arnfa-success)", th: "พูดเหมือนเพื่อนที่รู้ฟ้า เป็นภาษาไทย ไม่ใช่หน้าจอแอปแข็ง ๆ", en: "It talks like a friend who knows the sky — in Thai — not a stiff app screen.", subTh: "ภาษาคน ไม่ใช่ภาษาแอป", subEn: "human, not an app" },
];
const SOURCES = ["Open-Meteo", "MET Norway", "Air4Thai", "OpenStreetMap", "BMA Open Data", "RainViewer"];

export function WhyArnfah() {
  const { en } = useLang();
  return (
    <section className="relative z-10 mx-auto w-full min-w-0 max-w-[1360px] px-4 py-[clamp(48px,7vw,92px)] sm:px-[clamp(16px,4vw,46px)]">
      <p className="mb-[clamp(26px,3vw,44px)] font-display text-[0.72rem] uppercase tracking-[0.24em] text-ink-faint">{en ? "V. Why Arnfah" : "๕. ทำไมต้องอ่านฟ้า"}</p>

      <div className="grid gap-[clamp(20px,2.5vw,34px)] sm:grid-cols-2 lg:grid-cols-3">
        {REASONS.map((r, i) => (
          <figure key={i} className="m-0 border-t-2 pt-5" style={{ borderColor: r.accent }}>
            <blockquote className="m-0 font-thai-serif text-[1.32rem] font-light leading-snug text-ink">{en ? r.en : r.th}</blockquote>
            <figcaption className="mt-4 font-thai text-[0.84rem] text-ink-faint">{en ? r.subEn : r.subTh}</figcaption>
          </figure>
        ))}
      </div>

      <div className="mt-[clamp(36px,4vw,56px)] border-t border-hairline pt-6">
        <p className="mb-4 text-center font-display text-[0.66rem] uppercase tracking-[0.22em] text-ink-faint">{en ? "Built on real open data" : "ทำงานบนข้อมูลเปิดจริง"}</p>
        <div className="af-marquee-mask overflow-hidden">
          <div className="af-marquee flex w-max items-center gap-[clamp(28px,5vw,60px)] opacity-70">
            {[...SOURCES, ...SOURCES].map((s, i) => (
              <span key={i} aria-hidden={i >= SOURCES.length} className="whitespace-nowrap font-display text-[1.15rem] font-medium text-ink">{s}</span>
            ))}
          </div>
        </div>
        <p className="mt-5 text-center">
          <Link href="/data" className="font-thai text-sm text-rain hover:underline">{en ? "See every source + its License →" : "ดูทุกแหล่งข้อมูล + License →"}</Link>
        </p>
      </div>
    </section>
  );
}
