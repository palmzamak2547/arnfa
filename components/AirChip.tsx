"use client";

import { useEffect, useState } from "react";
import { useLang } from "@/lib/i18n/useLang";
import { AIR_LABEL_TH, AIR_LABEL_EN, airFreshness, type AirLevel, type AirReading } from "@/lib/air/air4thai";

/**
 * AirChip — real PM2.5 near the chosen area, from Air4Thai (Thai PCD).
 * Honest: shows "ไม่มีข้อมูล" if the station has no reading; never fabricates.
 * A real-Thai-gov-data credibility signal + a genuine Bangkok pain point.
 */

const LEVEL_COLOR: Record<AirLevel, string> = {
  good: "var(--arnfa-success)",
  moderate: "var(--arnfa-accent-sun)",
  warn: "var(--arnfa-accent-sun)",
  unhealthy: "var(--arnfa-accent-indoor-warm)",
  "very-unhealthy": "var(--arnfa-accent-indoor-warm)",
  unknown: "var(--arnfa-ink-faint)",
};

export function AirChip({ lat, lng, reading }: { lat: number; lng: number; reading?: AirReading | null }) {
  const { en } = useLang();
  const AIR_LABEL = en ? AIR_LABEL_EN : AIR_LABEL_TH;
  // Controlled mode: when the parent already fetched the reading (to also drive
  // the day advisory) it passes it in, so we don't double-hit /api/air.
  const controlled = reading !== undefined;
  const [fetched, setFetched] = useState<AirReading | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (controlled) return;
    let cancelled = false;
    setFetched(null);
    setFailed(false);
    fetch(`/api/air?lat=${lat}&lng=${lng}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => { if (!cancelled) setFetched(d); })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [lat, lng, controlled]);

  const air = controlled ? reading : fetched;
  if (!controlled && failed) return null; // air is a bonus signal; stay quiet if it can't load
  if (!air) {
    // skeleton chip (matches the real PM2.5 pill's shape — no layout shift on load)
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-hairline px-2.5 py-1 animate-pulse" aria-busy="true" aria-label={en ? "Checking air quality" : "กำลังเช็คฝุ่น"}>
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-ink/20" />
        <span className="inline-block h-2.5 w-14 rounded bg-ink/10" />
      </span>
    );
  }

  const color = LEVEL_COLOR[air.level];
  const fresh = airFreshness(air.readingAt);
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border border-hairline px-2.5 py-1 text-xs font-thai"
      title={en
        ? `PM2.5 from ${air.stationNameTh} (${air.distanceKm} km away) — Thai PCD${fresh ? `, ${fresh.fresh ? "updated" : "as of"} ${fresh.hhmm}` : ""}`
        : `PM2.5 จาก ${air.stationNameTh} (ห่าง ${air.distanceKm} กม.) — กรมควบคุมมลพิษ${fresh ? `, ${fresh.fresh ? "อัปเดตล่าสุด" : "ล่าสุด"} ${fresh.hhmm} น.` : ""}`}
    >
      <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      <span className="text-ink-muted">PM2.5</span>
      {air.pm25 != null ? (
        <>
          <span className="font-medium text-ink tabular-nums">{Math.round(air.pm25)}</span>
          <span className="text-ink-faint">{AIR_LABEL[air.level]}</span>
        </>
      ) : (
        <span className="text-ink-faint">{AIR_LABEL.unknown}</span>
      )}
      {/* honest freshness: Air4Thai is hourly — show the reading time when it's not fresh, so we never imply "live" on a stale value */}
      {fresh && !fresh.fresh && <span className="text-ink-faint">{en ? "as of" : "ล่าสุด"} {fresh.hhmm}</span>}
    </span>
  );
}
