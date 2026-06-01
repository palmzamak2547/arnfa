"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { useLang } from "@/lib/i18n/useLang";
import { Logo } from "@/components/Logo";
import { LanguageToggle } from "@/components/LanguageToggle";
import { SKY_VERDICT_TH, SKY_VERDICT_EN, type SkyVerdict } from "@/lib/core/skyScore";

/**
 * /where — "ไปไหนดี". Flips the engine from "I picked an area, plan it" to "tell me
 * WHERE the sky is clearest today/this weekend". Ranks every area in Thailand by
 * the chosen day's sky (one bulk forecast call). The nationwide-data flex.
 */

type Area = {
  key: string; th: string; en: string; zone: string; tier: string;
  tempC: number; rainProb: number; score: number; verdict: SkyVerdict;
};

const VDOT: Record<SkyVerdict, string> = {
  clearish: "var(--arnfa-success)", ok: "var(--arnfa-accent-sun)",
  closing: "var(--arnfa-accent-rain)", poor: "var(--arnfa-accent-indoor-warm)",
};

const TH_DOW = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];
const EN_DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function dayLabel(offset: number, en: boolean): string {
  if (offset === 0) return en ? "Today" : "วันนี้";
  if (offset === 1) return en ? "Tomorrow" : "พรุ่งนี้";
  const d = new Date(Date.now() + offset * 86400000);
  return (en ? EN_DOW : TH_DOW)[d.getDay()];
}

// zone display order: Bangkok neighbourhoods, then tourist spots, then the 6 regions
const ZONE_ORDER = ["ย่านยอดนิยม", "จุดเที่ยวยอดนิยม", "ภาคเหนือ", "ภาคกลาง", "ภาคตะวันออกเฉียงเหนือ", "ภาคตะวันออก", "ภาคตะวันตก", "ภาคใต้"];

export default function WherePage() {
  const { en } = useLang();
  const [day, setDay] = useState(0);
  const [areas, setAreas] = useState<Area[] | null>(null);
  const [date, setDate] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setAreas(null); setError(false);
    fetch(`/api/where?day=${day}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => { if (!cancelled) { setAreas(d.areas); setDate(d.date); } })
      .catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, [day]);

  const top = areas?.slice(0, 8) ?? [];
  const grouped = useMemo(() => {
    if (!areas) return [];
    const by = new Map<string, Area[]>();
    for (const a of areas) { const k = a.zone || "อื่นๆ"; (by.get(k) ?? by.set(k, []).get(k)!).push(a); }
    return [...by.entries()].sort((x, y) => {
      const ix = ZONE_ORDER.indexOf(x[0]); const iy = ZONE_ORDER.indexOf(y[0]);
      return (ix < 0 ? 99 : ix) - (iy < 0 ? 99 : iy);
    });
  }, [areas]);

  return (
    <main className="relative z-10 min-h-screen">
      <header className="arnfa-grid section-minor pad-safe-t">
        <div className="col-content flex items-center justify-between">
          <Link href="/" className="text-ink hover:text-ink-muted transition-colors"><Logo className="text-xl" animate={false} /></Link>
          <div className="flex items-center gap-4">
            <Link href="/plan" className="font-thai text-sm text-rain hover:underline">{en ? "Plan a trip →" : "วางแผนทริป →"}</Link>
            <LanguageToggle />
          </div>
        </div>
      </header>

      <section className="arnfa-grid">
        <div className="col-content">
          <h1 className="font-thai-serif fs-h2 font-light text-ink mb-2 text-balance">{en ? "Where to go" : "ไปไหนดี"}</h1>
          <p className="font-thai text-ink-muted mb-7 max-w-xl">
            {en ? "The clearest skies in Thailand — pick a day, we rank everywhere for you." : "ฟ้าเปิดที่ไหนในไทย — เลือกวัน แล้วเราจัดอันดับทุกที่ให้"}
          </p>

          {/* day selector */}
          <div className="flex flex-wrap gap-2 mb-8">
            {Array.from({ length: 7 }, (_, i) => i).map((o) => (
              <button key={o} type="button" onClick={() => setDay(o)}
                className={clsx("font-thai rounded-full px-4 py-2 text-sm transition-colors duration-[var(--dur-fast)] min-h-[44px]",
                  o === day ? "bg-ink text-paper" : "border border-hairline text-ink hover:bg-surface")}>
                {dayLabel(o, en)}
              </button>
            ))}
          </div>

          {error && (
            <p className="font-thai rounded-2xl border border-hairline bg-surface p-6 text-ink-muted">
              {en ? "Couldn't read the skies right now — try again in a moment." : "อ่านฟ้าทั่วไทยไม่ได้ตอนนี้ ลองใหม่อีกที (เราไม่เดาให้)"}
            </p>
          )}

          {/* loading skeleton */}
          {!areas && !error && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-28 rounded-3xl border border-hairline bg-surface/50 animate-pulse" />
              ))}
            </div>
          )}

          {/* top picks */}
          {areas && top.length > 0 && (
            <>
              <h2 className="font-thai-serif text-lg font-light text-ink mb-4">{en ? "Clearest right now" : "ฟ้าโปร่งสุด"}</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {top.map((a, i) => (
                  <Link key={a.key} href={`/plan?y=${a.key}&d=${day}`}
                    className="group rounded-3xl border border-hairline bg-surface/70 p-4 transition-colors hover:bg-surface">
                    <div className="flex items-center justify-between">
                      <span className="font-display text-xs text-ink-faint tabular-nums">#{i + 1}</span>
                      <span className="inline-flex items-center gap-1.5 font-thai text-xs text-ink-muted">
                        <span className="inline-block h-2 w-2 rounded-full" style={{ background: VDOT[a.verdict] }} aria-hidden />
                        {en ? SKY_VERDICT_EN[a.verdict] : SKY_VERDICT_TH[a.verdict]}
                      </span>
                    </div>
                    <h3 className="font-thai-serif text-xl font-light text-ink mt-2 group-hover:text-ink-muted transition-colors truncate">{en ? a.en : a.th}</h3>
                    <p className="font-thai text-xs text-ink-faint mt-0.5 truncate">{a.zone}</p>
                    <p className="font-thai text-sm text-ink-muted mt-2 tabular-nums">{a.tempC}° · {en ? "rain" : "ฝน"} {a.rainProb}%</p>
                  </Link>
                ))}
              </div>

              {/* full ranked list, grouped by region */}
              <h2 className="font-thai-serif text-lg font-light text-ink mt-12 mb-4">{en ? "All areas, by region" : "ทั้งหมด รายภาค"}</h2>
              <div className="grid gap-x-10 gap-y-8 lg:grid-cols-2">
                {grouped.map(([zone, list]) => (
                  <div key={zone}>
                    <h3 className="font-display text-xs uppercase tracking-[0.18em] text-ink-faint mb-3 pb-2 border-b border-hairline">{zone}</h3>
                    <ul className="divide-y divide-hairline">
                      {list.map((a) => (
                        <li key={a.key}>
                          <Link href={`/plan?y=${a.key}&d=${day}`} className="group flex items-center justify-between gap-3 py-2.5">
                            <span className="flex min-w-0 items-center gap-2.5">
                              <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: VDOT[a.verdict] }} aria-hidden />
                              <span className="font-thai text-sm text-ink truncate group-hover:text-rain transition-colors">{en ? a.en : a.th}</span>
                            </span>
                            <span className="font-thai shrink-0 text-xs text-ink-faint tabular-nums">{a.tempC}° · {a.rainProb}%</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              <p className="font-thai text-[0.7rem] text-ink-faint mt-10">
                {en ? `Hourly forecast per area — Open-Meteo — ${date} — ranked by sky (haze not included)`
                    : `พยากรณ์รายพื้นที่ Open-Meteo — ${date} — เรียงตามฟ้า (ยังไม่รวมฝุ่น)`}
              </p>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
