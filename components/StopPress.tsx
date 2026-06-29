"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLang } from "@/lib/i18n/useLang";

/**
 * StopPress — "ข่าวด่วน / Stop Press" from the brand book: the live correction. The front page's
 * promise is that when the sky changes, it prints a correction at once. This reads the REAL
 * short-term nowcast for Bangkok and, ONLY when rain is genuinely moving in within the next
 * couple of hours, prints a correction strip. Iron Rule 0: dry ahead → renders NOTHING (no
 * fabricated "breaking" alert). It's an unnumbered late-breaking insert, not a numbered section,
 * so the ภาค numbering stays contiguous whether or not it shows.
 */
const BKK = { lat: 13.7563, lng: 100.5018 };

export function StopPress() {
  const { en } = useLang();
  const [n, setN] = useState<{ rainInMin: number | null; maxMm: number } | null>(null);

  useEffect(() => {
    let c = false;
    fetch(`/api/nowcast?lat=${BKK.lat}&lng=${BKK.lng}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => { if (!c) setN(d); })
      .catch(() => {});
    return () => { c = true; };
  }, []);

  if (!n || n.rainInMin === null) return null; // dry ahead → no correction to print

  const mins = n.rainInMin;
  const soon = mins <= 5;
  const heavy = n.maxMm >= 1.5;
  const headline = en
    ? (soon ? "Rain is moving in now" : `Rain moving in — about ${mins} min`)
    : (soon ? "ฝนกำลังเข้าแล้ว" : `ฝนกำลังเข้าใน ~${mins} นาที`);
  const body = en
    ? `The short-term radar has shifted since this morning${heavy ? " — and it isn't light" : ""}. Keep an indoor plan handy, or let Arnfah re-plan around it.`
    : `เรดาร์ระยะสั้นเปลี่ยนไปจากเมื่อเช้า${heavy ? " และฝนไม่เบา" : ""} เผื่อแผนในร่มไว้ หรือให้อ่านฟ้าจัดแผนเลี่ยงฝนให้`;

  return (
    <section className="relative z-10 mx-auto max-w-[1360px] px-4 py-[clamp(16px,2.5vw,32px)] sm:px-[clamp(16px,4vw,46px)]">
      <div className="af-rise overflow-hidden rounded-2xl border border-hairline border-l-[3px] border-l-indoor-warm">
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:gap-6 sm:p-6">
          <div className="flex-1">
            <p className="mb-2 flex items-center gap-2 font-display text-[0.7rem] uppercase tracking-[0.24em] text-indoor-warm">
              <span className="af-blink h-[7px] w-[7px] rounded-full bg-indoor-warm" />
              {en ? "Stop Press" : "ข่าวด่วน"}
            </p>
            <h2 className="font-thai-serif text-2xl font-light leading-snug text-ink">{headline}</h2>
            <p className="mt-2 max-w-[58ch] font-thai text-sm leading-relaxed text-ink-muted">{body}</p>
          </div>
          <Link href="/plan" className="inline-flex h-11 shrink-0 items-center self-start rounded-full bg-ink px-6 font-thai text-sm font-medium text-paper transition-colors hover:bg-ink-muted sm:self-center">
            {en ? "Re-plan around the rain →" : "จัดแผนเลี่ยงฝน →"}
          </Link>
        </div>
      </div>
    </section>
  );
}
