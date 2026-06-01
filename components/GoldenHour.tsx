"use client";

import { useMemo } from "react";
import { useLang } from "@/lib/i18n/useLang";
import { sunTimes, bkkTime } from "@/lib/core/sun";

/**
 * GoldenHour — a compact sun line: sunrise · sunset · the evening golden-hour window,
 * computed locally from lat·lng·day (no API). Lives at the foot of "เตรียมตัววันนี้".
 */
export function GoldenHour({ lat, lng, dayOffset = 0 }: { lat: number; lng: number; dayOffset?: number }) {
  const { en } = useLang();
  const t = useMemo(() => sunTimes(new Date(Date.now() + dayOffset * 86400000), lat, lng), [lat, lng, dayOffset]);
  if (!t.sunrise || !t.sunset) return null;

  return (
    <div className="mt-4 flex items-start gap-2.5 border-t border-hairline pt-4">
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className="mt-0.5 shrink-0 text-sun" aria-hidden>
        <circle cx="12" cy="12" r="3.5" /><path d="M12 3.5v2M4.6 6.6l1.4 1.4M19.4 6.6l-1.4 1.4M2.5 13h2M19.5 13h2M6 18h12" />
      </svg>
      <p className="font-thai text-sm text-ink-muted">
        {en ? "Sunrise" : "พระอาทิตย์ขึ้น"} <b className="font-medium text-ink tabular-nums">{bkkTime(t.sunrise)}</b> · {en ? "sunset" : "ตก"} <b className="font-medium text-ink tabular-nums">{bkkTime(t.sunset)}</b>
        <span className="text-ink-faint"> — {en ? "golden hour" : "ช่วงแสงสวย"} {bkkTime(t.goldenEveningStart)}–{bkkTime(t.sunset)}</span>
      </p>
    </div>
  );
}
