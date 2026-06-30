"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { useLang } from "@/lib/i18n/useLang";
import { Masthead } from "@/components/Masthead";
import { SiteFooter } from "@/components/SiteFooter";
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
const ZONE_ORDER = ["ย่านยอดนิยม", "จุดเที่ยวยอดนิยม", "ภาคเหนือ", "ภาคกลาง", "ภาคอีสาน", "ภาคตะวันออก", "ภาคตะวันตก", "ภาคใต้"];
const ZONE_EN: Record<string, string> = {
  "ย่านยอดนิยม": "Popular areas", "จุดเที่ยวยอดนิยม": "Popular spots",
  "ภาคเหนือ": "Northern Thailand", "ภาคกลาง": "Central Thailand",
  "ภาคอีสาน": "Northeast (Isan)", "ภาคตะวันออก": "Eastern Thailand",
  "ภาคตะวันตก": "Western Thailand", "ภาคใต้": "Southern Thailand", "อื่นๆ": "Other",
};
const zoneLabel = (zone: string, en: boolean) => (en ? ZONE_EN[zone] ?? zone : zone);

// region-filter chips → the exact a.zone string(s) each one keeps. "all" = show everything
// (incl. the Bangkok-neighbourhood + tourist-spot zones, which have no chip of their own).
const REGION_CHIPS: { key: string; th: string; en: string; zones: string[] | null }[] = [
  { key: "all", th: "ทั้งหมด", en: "All", zones: null },
  { key: "north", th: "เหนือ", en: "North", zones: ["ภาคเหนือ"] },
  { key: "isan", th: "อีสาน", en: "Isan", zones: ["ภาคอีสาน"] },
  { key: "central", th: "กลาง", en: "Central", zones: ["ภาคกลาง", "ย่านยอดนิยม", "กรุงเทพชั้นใน", "กรุงเทพตะวันออก", "ฝั่งธนบุรี", "รัชดา–ลาดพร้าว–เหนือ", "สุขุมวิท–ฝั่งใต้"] },
  { key: "east", th: "ตะวันออก", en: "East", zones: ["ภาคตะวันออก"] },
  { key: "west", th: "ตะวันตก", en: "West", zones: ["ภาคตะวันตก"] },
  { key: "south", th: "ใต้", en: "South", zones: ["ภาคใต้"] },
];

export default function WherePage() {
  const { en } = useLang();
  const [day, setDay] = useState(0);
  const [region, setRegion] = useState("all");
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

  // active region → matching zone strings (null = all). Filters BOTH the top picks + the grouped list.
  const activeZones = REGION_CHIPS.find((c) => c.key === region)?.zones ?? null;
  const filtered = useMemo(
    () => (!areas ? null : activeZones ? areas.filter((a) => activeZones.includes(a.zone)) : areas),
    [areas, activeZones],
  );

  const top = filtered?.slice(0, 8) ?? [];
  const grouped = useMemo(() => {
    if (!filtered) return [];
    const by = new Map<string, Area[]>();
    for (const a of filtered) { const k = a.zone || "อื่นๆ"; (by.get(k) ?? by.set(k, []).get(k)!).push(a); }
    return [...by.entries()].sort((x, y) => {
      const ix = ZONE_ORDER.indexOf(x[0]); const iy = ZONE_ORDER.indexOf(y[0]);
      return (ix < 0 ? 99 : ix) - (iy < 0 ? 99 : iy);
    });
  }, [filtered]);

  return (
    <main className="relative z-10 min-h-screen">
      <Masthead />

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

          {/* region filter — narrows both the top picks and the full grouped list to one region */}
          <div className="mb-8">
            <p className="mb-2.5 font-display text-[0.72rem] uppercase tracking-[0.24em] text-ink-faint">{en ? "Filter by region" : "เลือกภาค"}</p>
            <div className="flex flex-wrap gap-2">
              {REGION_CHIPS.map((c) => (
                <button key={c.key} type="button" onClick={() => setRegion(c.key)} aria-pressed={c.key === region}
                  className={clsx("font-thai inline-flex min-h-[44px] items-center rounded-full px-4 py-2 text-sm transition-colors duration-[var(--dur-fast)]",
                    c.key === region ? "bg-ink text-paper" : "border border-hairline text-ink-muted hover:bg-surface hover:text-ink")}>
                  {en ? c.en : c.th}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="font-thai arnfa-glass rounded-2xl p-6 text-ink-muted" style={{ background: "rgba(255,255,255,0.4)" }}>
              {en ? "Couldn't read the skies right now — try again in a moment." : "อ่านฟ้าทั่วไทยไม่ได้ตอนนี้ ลองใหม่อีกที (เราไม่เดาให้)"}
            </p>
          )}

          {/* loading skeleton — list-shaped (matches the ranked list, no CLS) */}
          {!areas && !error && (
            <div className="border-y border-hairline divide-y divide-hairline">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 py-4">
                  <div className="h-7 w-7 shrink-0 rounded-full bg-surface animate-pulse" />
                  <div className="h-5 w-44 max-w-[60%] rounded bg-surface animate-pulse" />
                  <div className="ml-auto h-4 w-16 rounded bg-surface animate-pulse" />
                </div>
              ))}
            </div>
          )}

          {/* region filter yielded nothing for this day — honest, no fabricated rows */}
          {areas && !error && top.length === 0 && (
            <p className="font-thai rounded-2xl border border-hairline bg-surface p-6 text-ink-muted">
              {en ? "No areas in this region right now — try another region." : "ยังไม่มีพื้นที่ในภาคนี้ตอนนี้ ลองเลือกภาคอื่นดู"}
            </p>
          )}

          {/* top picks — the answer, ranked, as an editorial list (not a card grid) */}
          {areas && top.length > 0 && (
            <>
              <h2 className="font-thai-serif text-2xl font-light text-ink mb-5 text-balance">
                {(top[0].verdict === "clearish" || top[0].verdict === "ok") ? (en ? "Clearest skies" : "ฟ้าโปร่งสุด") : (en ? "Best of the day" : "ฟ้าดีสุดเท่าที่มี")} — {dayLabel(day, en)}
              </h2>
              <ol className="mb-14 border-y border-hairline divide-y divide-hairline">
                {top.map((a, i) => (
                  <li key={a.key}>
                    <Link href={`/plan?y=${a.key}&d=${day}`} className="group flex items-center gap-4 py-4">
                      <span className="w-8 shrink-0 font-display text-2xl font-light tabular-nums text-ink-faint">{i + 1}</span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: VDOT[a.verdict] }} aria-hidden />
                          <span className="font-thai-serif text-xl font-light text-ink truncate transition-colors group-hover:text-ink-muted">{en ? a.en : a.th}</span>
                          {i === 0 && (
                            <span className="shrink-0 rounded-full border border-sun px-2 py-0.5 font-display text-[0.58rem] uppercase tracking-[0.14em] text-sun">
                              {(a.verdict === "clearish" || a.verdict === "ok") ? (en ? "clearest" : "ฟ้าโปร่งสุด") : (en ? "best today" : "ดีสุดวันนี้")}
                            </span>
                          )}
                        </span>
                        <span className="font-thai text-xs text-ink-faint">{zoneLabel(a.zone, en)} — {en ? SKY_VERDICT_EN[a.verdict] : SKY_VERDICT_TH[a.verdict]}</span>
                      </span>
                      <span className="shrink-0 font-thai text-sm text-ink-muted tabular-nums">{a.tempC}° {en ? "rain" : "ฝน"} {a.rainProb}%</span>
                    </Link>
                  </li>
                ))}
              </ol>

              {/* full ranked list, grouped by region */}
              <h2 className="font-thai-serif text-lg font-light text-ink mt-12 mb-4">{en ? "All areas, by region" : "ทั้งหมด รายภาค"}</h2>
              <div className="grid gap-x-10 gap-y-8 lg:grid-cols-2">
                {grouped.map(([zone, list]) => (
                  <div key={zone}>
                    <h3 className="font-display text-xs uppercase tracking-[0.18em] text-ink-faint mb-3 pb-2 border-b border-hairline">{zoneLabel(zone, en)}</h3>
                    <ul className="divide-y divide-hairline">
                      {list.map((a) => (
                        <li key={a.key}>
                          <Link href={`/plan?y=${a.key}&d=${day}`} className="group flex items-center justify-between gap-3 py-2.5">
                            <span className="flex min-w-0 items-center gap-2.5">
                              <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: VDOT[a.verdict] }} aria-hidden />
                              <span className="font-thai text-sm text-ink truncate group-hover:text-rain transition-colors">{en ? a.en : a.th}</span>
                            </span>
                            <span className="font-thai shrink-0 text-xs text-ink-faint tabular-nums">{a.tempC}° {a.rainProb}%</span>
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
      <SiteFooter />
    </main>
  );
}
