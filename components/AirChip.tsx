"use client";

import { useEffect, useState } from "react";
import { AIR_LABEL_TH, type AirLevel, type AirReading } from "@/lib/air/air4thai";

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

export function AirChip({ lat, lng }: { lat: number; lng: number }) {
  const [air, setAir] = useState<AirReading | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setAir(null);
    setFailed(false);
    fetch(`/api/air?lat=${lat}&lng=${lng}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => { if (!cancelled) setAir(d); })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [lat, lng]);

  if (failed) return null; // air is a bonus signal; stay quiet if it can't load
  if (!air) {
    return <span className="font-thai text-xs text-ink-faint animate-pulse">กำลังเช็คฝุ่น…</span>;
  }

  const color = LEVEL_COLOR[air.level];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border border-hairline px-2.5 py-1 text-xs font-thai"
      title={`PM2.5 จาก ${air.stationNameTh} (ห่าง ${air.distanceKm} กม.) · กรมควบคุมมลพิษ`}
    >
      <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      <span className="text-ink-muted">PM2.5</span>
      {air.pm25 != null ? (
        <>
          <span className="font-medium text-ink tabular-nums">{Math.round(air.pm25)}</span>
          <span className="text-ink-faint">{AIR_LABEL_TH[air.level]}</span>
        </>
      ) : (
        <span className="text-ink-faint">{AIR_LABEL_TH.unknown}</span>
      )}
    </span>
  );
}
