"use client";

import { useEffect, useState } from "react";
import { useLang } from "@/lib/i18n/useLang";
import { SWIM_TH, SWIM_EN, SWIM_DOT, type SwimLevel } from "@/lib/marine/marine";

/**
 * BeachConditions — "ทะเลวันนี้". For coastal areas only: real wave height + sea
 * temp from Open-Meteo Marine, with a swim verdict. Self-hiding when the area isn't
 * beachside (the API returns available:false if the nearest sea is >25 km away) —
 * never invents a beach.
 */

type Marine = { available: boolean; waveM?: number; waveMaxM?: number | null; seaTempC?: number; swim?: SwimLevel; km?: number };

export function BeachConditions({ lat, lng }: { lat: number; lng: number }) {
  const { en } = useLang();
  const [d, setD] = useState<Marine | null>(null);

  useEffect(() => {
    let cancelled = false;
    setD(null);
    fetch(`/api/marine?lat=${lat}&lng=${lng}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((x) => { if (!cancelled) setD(x); })
      .catch(() => { if (!cancelled) setD(null); });
    return () => { cancelled = true; };
  }, [lat, lng]);

  if (!d?.available || d.swim == null) return null;

  return (
    <div className="rounded-3xl border border-hairline bg-surface/70 p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-thai-serif text-lg font-light text-ink">{en ? "At the beach today" : "ทะเลวันนี้"}</h2>
        <span className="inline-flex items-center gap-1.5 font-thai text-xs text-ink-muted">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: SWIM_DOT[d.swim] }} aria-hidden />
          {en ? SWIM_EN[d.swim] : SWIM_TH[d.swim]}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 font-thai text-sm text-ink">
        <span>{en ? "Waves" : "คลื่น"} <b className="font-medium tabular-nums">{d.waveM?.toFixed(1)} m</b>{d.waveMaxM ? ` (${en ? "up to" : "สูงสุด"} ${d.waveMaxM.toFixed(1)} m)` : ""}</span>
        <span>{en ? "Sea" : "น้ำทะเล"} <b className="font-medium tabular-nums">{Math.round(d.seaTempC!)}°</b></span>
      </div>
      <p className="font-thai mt-2 text-[0.7rem] text-ink-faint">{en ? "Open-Meteo Marine — significant wave height" : "Open-Meteo Marine — ความสูงคลื่นนัยสำคัญ"}</p>
    </div>
  );
}
