"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Masthead } from "@/components/Masthead";
import { SiteFooter } from "@/components/SiteFooter";
import { useLang } from "@/lib/i18n/useLang";
import { dayVerdict } from "@/lib/core/verdict";
import { scoreDays, pickBestWorst } from "@/lib/core/dayScores";
import { availableDays } from "@/lib/plan/days";
import { bkkNow } from "@/lib/bkkNow";
import { AIR_LABEL_TH, AIR_COLOR, type AirLevel } from "@/lib/air/air4thai";
import type { HourlyForecast } from "@/lib/weather/types";

/**
 * /signals — "กรุงเทพฯ ตอนนี้ / Bangkok, right now": Arnfah's decision pipeline made visible as
 * the BDI keynote's own framework — UNDERSTAND → PREDICT → ACT — running on REAL live signals.
 * UNDERSTAND = the city's three signals (sky · PM2.5 · citizen feedback); PREDICT = rain nowcast +
 * the week's clearest day; ACT = today's verdict + where to go. Every value is live; each degrades
 * to "—" on its own if a source is down (Iron Rule 0 — never fabricated). This is the pitch frame
 * made into a product surface: "Arnfah doesn't show weather — it turns the city's signals into a
 * decision."
 */
const BKK = { lat: 13.7563, lng: 100.5018 };
const hhmm = (iso: string) => { const d = new Date(iso); return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };

type Forecast = HourlyForecast[];
type Air = { pm25: number | null; level: AirLevel } | null;
type Nowcast = { rainInMin: number | null; maxMm: number } | null;
type TopArea = { th: string; en: string; tempC: number; rainProb: number } | null;

export default function SignalsPage() {
  const { en, lang } = useLang();
  const [hours, setHours] = useState<Forecast | null>(null);
  const [air, setAir] = useState<Air>(null);
  const [nowcast, setNowcast] = useState<Nowcast>(null);
  const [reports, setReports] = useState<number | null>(null);
  const [topArea, setTopArea] = useState<TopArea>(null);

  useEffect(() => {
    let c = false;
    const f = `lat=${BKK.lat}&lng=${BKK.lng}`;
    fetch(`/api/forecast?${f}&hours=180`).then((r) => (r.ok ? r.json() : Promise.reject())).then((d) => { if (!c) setHours(d.hours ?? []); }).catch(() => {});
    fetch(`/api/air?${f}`).then((r) => (r.ok ? r.json() : Promise.reject())).then((d) => { if (!c) setAir(d); }).catch(() => {});
    fetch(`/api/nowcast?${f}`).then((r) => (r.ok ? r.json() : Promise.reject())).then((d) => { if (!c) setNowcast(d); }).catch(() => {});
    fetch(`/api/city-reports?${f}&n=8`).then((r) => (r.ok ? r.json() : Promise.reject())).then((d) => { if (!c) setReports((d.reports ?? []).length); }).catch(() => {});
    fetch(`/api/where?day=0`).then((r) => (r.ok ? r.json() : Promise.reject())).then((d) => { if (!c) { const a = d.areas?.[0]; setTopArea(a ? { th: a.th, en: a.en, tempC: a.tempC, rainProb: a.rainProb } : null); } }).catch(() => {});
    return () => { c = true; };
  }, []);

  // derive
  const now = hours && hours.length ? hours[nearestIdx(hours)] : null;
  const verdict = hours && hours.length ? dayVerdict(hours, nearestIdx(hours)) : null;
  const days = hours && hours.length ? availableDays(hours, bkkNow()) : [];
  const best = (() => {
    if (!hours || !hours.length || days.length < 2) return null;
    const bw = pickBestWorst(scoreDays(hours, bkkNow()));
    if (!bw.best) return null;
    const d = days.find((x) => x.offset === bw.best!.offset);
    return d ? { th: d.th, en: d.en } : null;
  })();

  return (
    <main className="relative z-10 min-h-screen">
      <Masthead />
      <section className="arnfa-grid section-minor">
        <div className="col-content">
          <p className="mb-3 font-display text-xs uppercase tracking-[0.25em] text-ink-faint">{en ? "Bangkok · live city signals" : "กรุงเทพฯ · สัญญาณเมืองสด"}</p>
          <h1 className="mb-4 text-balance font-thai-serif fs-h2 font-light text-ink">{en ? "Bangkok, right now" : "กรุงเทพฯ ตอนนี้"}</h1>
          <p className="max-w-[56ch] font-thai fs-lead leading-relaxed text-ink-muted">
            {en
              ? "Arnfah doesn't just show weather — it turns the city's live signals into a decision. Here's the pipeline, running now."
              : "อ่านฟ้าไม่ได้แค่บอกอากาศ — แต่เปลี่ยนสัญญาณสดของเมืองให้เป็น “การตัดสินใจ” นี่คือกระบวนการที่กำลังทำงานอยู่ตอนนี้"}
          </p>
          <div className="mt-5"><BangkokClock en={en} /></div>
        </div>
      </section>

      {/* UNDERSTAND */}
      <Stage n="๑" word={en ? "Understand" : "เข้าใจ"} q={en ? "What is happening?" : "ตอนนี้เกิดอะไรขึ้น?"}>
        <Signal label={en ? "Sky" : "ท้องฟ้า"} src="Open-Meteo">
          {now ? <>{Math.round(now.tempC)}° · <span className="text-rain">{Math.round(now.rainProb * 100)}%</span> <span className="text-ink-faint text-sm">{en ? "rain" : "ฝน"}</span></> : "—"}
        </Signal>
        <Signal label="PM2.5" src="Air4Thai">
          {air && air.pm25 != null ? <>{air.pm25} <span className="text-sm" style={{ color: AIR_COLOR[air.level] }}>{AIR_LABEL_TH[air.level]}</span></> : "—"}
        </Signal>
        <Signal label={en ? "Citizen feedback" : "เสียงประชาชน"} src="Traffy Fondue">
          {reports != null ? (reports > 0 ? <>{reports} <span className="text-ink-faint text-sm">{en ? "reports near downtown" : "เรื่องแจ้งย่านกลางเมือง"}</span></> : <span className="text-ink-faint text-base">{en ? "quiet now" : "เงียบอยู่"}</span>) : "—"}
        </Signal>
      </Stage>

      {/* PREDICT */}
      <Stage n="๒" word={en ? "Predict" : "ทำนาย"} q={en ? "What may happen?" : "กำลังจะเกิดอะไร?"}>
        <Signal label={en ? "Rain, next 2 h" : "ฝนใน 2 ชม."} src="Open-Meteo nowcast">
          {nowcast ? (nowcast.rainInMin != null ? <span className="text-indoor-warm">{en ? `in ~${nowcast.rainInMin} min` : `อีก ~${nowcast.rainInMin} นาที`}</span> : <span className="text-success text-base">{en ? "staying dry" : "ยังไม่มีฝน"}</span>) : "—"}
        </Signal>
        <Signal label={en ? "Clearest day this week" : "ฟ้าดีสุดสัปดาห์นี้"} src="7-day forecast">
          {best ? (en ? best.en : best.th) : "—"}
        </Signal>
      </Stage>

      {/* ACT */}
      <Stage n="๓" word={en ? "Act" : "ตัดสินใจ"} q={en ? "What should you do?" : "แล้วควรทำยังไง?"} last>
        <Signal label={en ? "Today's verdict" : "คำตัดสินวันนี้"} src="Arnfah engine">
          {verdict ? (lang === "zh" ? verdict.headlineZh : en ? verdict.headlineEn : verdict.headline) : "—"}
        </Signal>
        <Signal label={en ? "Where to go now" : "ไปไหนดีตอนนี้"} src="nationwide ranking">
          {topArea ? <>{en ? topArea.en : topArea.th} <span className="text-ink-faint text-sm">{topArea.tempC}° · {topArea.rainProb}%</span></> : "—"}
        </Signal>
      </Stage>

      <section className="arnfa-grid section-major">
        <div className="col-content flex flex-wrap items-center gap-x-6 gap-y-3">
          <Link href="/plan" className="inline-flex h-12 items-center rounded-full bg-ink px-7 font-thai text-base font-medium text-paper transition-colors hover:bg-ink-muted">
            {en ? "Plan today's trip →" : "วางแผนทริปวันนี้ →"}
          </Link>
          <Link href="/data" className="font-thai text-sm text-rain hover:underline">{en ? "Every signal, cited with its License →" : "ทุกสัญญาณ มีที่มา + License →"}</Link>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}

function nearestIdx(hours: HourlyForecast[]): number {
  const now = Date.now(); let idx = 0, best = Infinity;
  for (let i = 0; i < hours.length; i++) { const dt = Math.abs(new Date(hours[i].hourISO).getTime() - now); if (dt < best) { best = dt; idx = i; } }
  return idx;
}

function Stage({ n, word, q, last, children }: { n: string; word: string; q: string; last?: boolean; children: React.ReactNode }) {
  return (
    <section className={`arnfa-grid ${last ? "section-minor" : "section-minor"}`}>
      <div className="col-content border-t border-hairline pt-7">
        <div className="mb-5 flex items-baseline gap-4">
          <span className="font-thai-serif text-3xl font-light text-ink-faint">{n}</span>
          <div>
            <h2 className="font-display text-sm uppercase tracking-[0.22em] text-ink">{word}</h2>
            <p className="font-thai text-sm text-ink-faint">{q}</p>
          </div>
        </div>
        <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
      </div>
    </section>
  );
}

function Signal({ label, src, children }: { label: string; src: string; children: React.ReactNode }) {
  return (
    <div className="af-lift rounded-2xl border border-hairline bg-surface/55 p-4">
      <p className="mb-1 font-display text-[0.7rem] uppercase tracking-[0.16em] text-ink-faint">{label}</p>
      <p className="font-thai-serif text-2xl font-light tabular-nums text-ink">{children}</p>
      <p className="mt-1 font-thai text-[0.7rem] italic text-ink-faint">{src}</p>
    </div>
  );
}

/** A ticking Asia/Bangkok clock — makes "right now" literal. SSR-safe (renders "—" until mount). */
function BangkokClock({ en }: { en: boolean }) {
  const [t, setT] = useState("");
  useEffect(() => {
    const p = (n: number) => String(n).padStart(2, "0");
    const tick = () => { const b = bkkNow(); setT(`${p(b.getHours())}:${p(b.getMinutes())}:${p(b.getSeconds())}`); };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-hairline bg-surface/55 px-3.5 py-1.5 font-thai text-xs text-ink-muted">
      <span className="af-blink h-2 w-2 rounded-full bg-success" aria-hidden />
      <span className="tabular-nums text-ink">{t || "—"}</span>
      <span className="text-ink-faint">{en ? "Bangkok now" : "เวลากรุงเทพฯ"}</span>
    </span>
  );
}
