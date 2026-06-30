"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLang } from "@/lib/i18n/useLang";
import { encodePlanState } from "@/lib/plan/shareState";
import { SKY_VERDICT_TH, SKY_VERDICT_EN, type SkyVerdict } from "@/lib/core/skyScore";

/**
 * SkyWatch — "จับตาฟ้า". The honest "เตือนฟ้าเปิด": for the areas you've saved, the
 * clearest upcoming day in the next 7 (from /api/best-days). No push infra — it's an
 * in-app watchlist that re-reads the live forecast each visit. Self-hides when empty.
 */

type Best = { key: string; th: string; en: string; dayOffset: number; date: string; verdict: SkyVerdict; rainProb: number };

const VDOT: Record<SkyVerdict, string> = {
  clearish: "var(--arnfa-success)", ok: "var(--arnfa-accent-sun)",
  closing: "var(--arnfa-accent-rain)", poor: "var(--arnfa-accent-indoor-warm)",
};
const TH_DOW = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัส", "ศุกร์", "เสาร์"];
const EN_DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function dayName(offset: number, en: boolean, date: string): string {
  if (offset === 0) return en ? "today" : "วันนี้";
  if (offset === 1) return en ? "tomorrow" : "พรุ่งนี้";
  // weekday of the scored calendar date (from /api/best-days, Bangkok) — deterministic,
  // not derived from the device clock (a tourist's phone may be in another timezone).
  const [y, m, dd] = date.split("-").map(Number);
  return (en ? EN_DOW : TH_DOW)[new Date(Date.UTC(y, (m || 1) - 1, dd || 1)).getUTCDay()];
}

export function SkyWatch({ keys }: { keys: string[] }) {
  const { en } = useLang();
  const [areas, setAreas] = useState<Best[] | null>(null);

  useEffect(() => {
    if (!keys.length) { setAreas([]); return; }
    let cancelled = false;
    fetch(`/api/best-days?keys=${keys.join(",")}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled) setAreas(d?.areas ?? []); })
      .catch(() => { if (!cancelled) setAreas([]); });
    return () => { cancelled = true; };
  }, [keys.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!areas?.length) return null;

  return (
    <section className="mb-8 rounded-3xl border border-hairline bg-surface/70 p-5 sm:p-6">
      <h2 className="font-thai-serif text-lg font-light text-ink mb-1">{en ? "Sky watch" : "จับตาฟ้า"}</h2>
      <p className="font-thai text-xs text-ink-faint mb-4">{en ? "The clearest day coming up at each spot you've saved." : "วันที่ฟ้าเปิดสุดของแต่ละที่ที่คุณเซฟไว้ ในสัปดาห์นี้"}</p>
      <ul className="divide-y divide-hairline">
        {areas.map((a) => (
          <li key={a.key}>
            <Link href={`/plan?${encodePlanState({ district: a.key, budgetMin: 240, rain: false, day: a.dayOffset })}`}
              className="group flex items-center justify-between gap-3 py-2.5">
              <span className="flex min-w-0 items-center gap-2.5">
                <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: VDOT[a.verdict] }} aria-hidden />
                <span className="font-thai text-sm text-ink truncate group-hover:text-rain transition-colors">{en ? a.en : a.th}</span>
              </span>
              <span className="font-thai shrink-0 text-xs text-ink-muted">
                {en ? "best" : "ฟ้าดีสุด"} <b className="font-medium text-ink">{dayName(a.dayOffset, en, a.date)}</b> — {en ? SKY_VERDICT_EN[a.verdict] : SKY_VERDICT_TH[a.verdict]}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
