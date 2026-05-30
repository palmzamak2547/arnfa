"use client";

import { useTranslation } from "react-i18next";
import { NumberTicker } from "./motion/NumberTicker";
import { Reveal } from "./motion/Reveal";

/**
 * DataSources — "ทุกการตัดสินใจ มีที่มา" provenance ledger.
 *
 * Per credibility research: 2025-26 premium products treat data PROVENANCE as a
 * feature (Perplexity-style), not a logo-soup wall. Arnfa's edge is honesty
 * (Iron Rule 0: never fabricate weather) — so we make the real, authoritative
 * sources a TRUST FEATURE. This is also the BDI Hackathon judge-facing
 * differentiator: open data + Thai-government data (Air4Thai/PCD) + reproducibility.
 *
 * Spec: projects/arnfa/01-design-lock.md + credibility research (session log).
 */

type Source = {
  group: string;
  groupEn: string;
  items: { name: string; role: string; roleEn: string; href: string }[];
};

const SOURCES: Source[] = [
  {
    group: "พยากรณ์อากาศ",
    groupEn: "Forecast",
    items: [
      { name: "Open-Meteo", role: "พยากรณ์รายชั่วโมง", roleEn: "Hourly forecast", href: "https://open-meteo.com" },
      { name: "MET Norway", role: "สำรองชั้นที่ 2", roleEn: "Fallback L2", href: "https://api.met.no" },
    ],
  },
  {
    group: "สถานที่",
    groupEn: "Places",
    items: [
      { name: "OpenStreetMap", role: "ข้อมูลสถานที่ + แท็ก", roleEn: "POI + structured tags", href: "https://www.openstreetmap.org" },
    ],
  },
  {
    group: "คุณภาพอากาศ",
    groupEn: "Air quality",
    items: [
      { name: "Air4Thai", role: "PM2.5 · กรมควบคุมมลพิษ", roleEn: "PM2.5 · Thai PCD", href: "http://air4thai.pcd.go.th" },
    ],
  },
  {
    group: "แผนที่ + เรดาร์",
    groupEn: "Map + radar",
    items: [
      { name: "OpenFreeMap", role: "แผนที่ฐาน", roleEn: "Basemap", href: "https://openfreemap.org" },
      { name: "RainViewer", role: "เรดาร์ฝน", roleEn: "Rain radar", href: "https://www.rainviewer.com" },
    ],
  },
];

export function DataSources() {
  const { i18n } = useTranslation();
  const en = i18n.language === "en";

  return (
    <section className="border-t border-hairline bg-surface/40 px-6 py-24 sm:px-12 lg:px-20">
      <div className="mx-auto max-w-6xl">
        <p className="font-display text-xs uppercase tracking-[0.25em] text-ink-faint mb-6">
          {en ? "Provenance" : "ที่มาของข้อมูล"}
        </p>
        <h2 className="font-thai-serif text-3xl sm:text-5xl font-light text-ink leading-tight mb-5 max-w-3xl">
          {en ? "We read the sky from real data — never guessed." : "เราอ่านฟ้าจากข้อมูลจริง ไม่เคยเดา"}
        </h2>
        <p className="font-thai text-lg text-ink-muted leading-relaxed max-w-2xl mb-12">
          {en
            ? "Every Arnfa recommendation traces to verifiable open sources. We never fabricate a forecast — if the data isn't there, we say so."
            : "ทุกคำแนะนำของอ่านฟ้ามาจากแหล่งข้อมูลเปิดที่ตรวจสอบได้ — เราไม่กุตัวเลขพยากรณ์อากาศ. ถ้าไม่มีข้อมูล เราจะบอกตรงๆ."}
        </p>

        <div className="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {SOURCES.map((s) => (
            <div key={s.group}>
              <h3 className="font-display text-xs uppercase tracking-[0.18em] text-ink-faint mb-4 pb-3 border-b border-hairline">
                {en ? s.groupEn : s.group}
              </h3>
              <ul className="space-y-4">
                {s.items.map((it) => (
                  <li key={it.name}>
                    <a
                      href={it.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group block"
                    >
                      <div className="flex items-center gap-2">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-success" />
                        <span className="font-sans font-medium text-ink group-hover:text-ink-muted transition-colors">
                          {it.name}
                        </span>
                      </div>
                      <p className="font-thai text-sm text-ink-faint mt-0.5 ml-3.5">
                        {en ? it.roleEn : it.role}
                      </p>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Honest credibility stat band — NumberTickers count up on scroll. */}
        <Reveal className="mt-14 grid grid-cols-2 gap-y-8 sm:grid-cols-4 border-t border-hairline pt-10">
          {[
            { n: 428, suffix: "", th: "สถานที่จริง", en: "real places" },
            { n: 6, suffix: "", th: "แหล่งข้อมูลเปิด", en: "open sources" },
            { n: 24, suffix: "ชม.", enSuffix: "h", th: "พยากรณ์ล่วงหน้า", en: "forecast ahead" },
            { n: 0, suffix: "", th: "ตัวเลขที่กุขึ้น", en: "fabricated numbers" },
          ].map((s) => (
            <div key={s.en}>
              <div className="font-display text-4xl sm:text-5xl text-ink tabular-nums">
                <NumberTicker value={s.n} suffix={en ? (s.enSuffix ?? s.suffix) : s.suffix} />
              </div>
              <p className="font-thai text-sm text-ink-faint mt-1">{en ? s.en : s.th}</p>
            </div>
          ))}
        </Reveal>

        <div className="mt-12 flex flex-wrap items-center gap-x-6 gap-y-2">
          <a
            href="/api/forecast?lat=13.7563&lng=100.5018&hours=6"
            target="_blank"
            rel="noopener noreferrer"
            className="font-thai text-sm text-rain hover:underline"
          >
            {en ? "View raw data →" : "ดูข้อมูลดิบ →"}
          </a>
          <span className="font-thai text-sm text-ink-faint">
            {en ? "Open data, reproducible, built for Bangkok" : "ข้อมูลเปิด ตรวจสอบซ้ำได้ ทำเพื่อกรุงเทพ"}
          </span>
        </div>
      </div>
    </section>
  );
}
