"use client";

import { useEffect, useState } from "react";
import { useLang } from "@/lib/i18n/useLang";

type Peak = { iso: string; pm25: number; usAqi: number };

/**
 * AirOutlook — forward dust warning from Open-Meteo CAMS PM2.5 FORECAST (/api/air-forecast),
 * the worst daytime hour of the selected day. Renders ONLY when the peak is unhealthy
 * (US-AQI > 100 / PM2.5 > 37.5). It is the FUTURE layer and is labelled as a forecast — the
 * measured "now" is Air4Thai (AirChip). Never fabricates: hidden when data is missing or clean.
 */
export function AirOutlook({ lat, lng, dayOffset = 0 }: { lat: number; lng: number; dayOffset?: number }) {
  const { en } = useLang();
  const [peak, setPeak] = useState<Peak | null>(null);

  useEffect(() => {
    let c = false;
    fetch(`/api/air-forecast?lat=${lat}&lng=${lng}&day=${dayOffset}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => { if (!c) setPeak(d?.bad && d.peak ? d.peak : null); })
      .catch(() => { if (!c) setPeak(null); });
    return () => { c = true; };
  }, [lat, lng, dayOffset]);

  if (!peak) return null;
  const hhmm = peak.iso.slice(11, 16);
  return (
    <div className="font-thai mt-3 flex items-start gap-2 rounded-2xl border border-indoor-warm/30 bg-indoor-warm/[0.06] px-3.5 py-2.5 text-sm text-indoor-warm">
      <span aria-hidden className="mt-[0.15rem] text-xs">▲</span>
      <span>
        {en
          ? `Dust forecast to climb to PM2.5 ~${peak.pm25} (US-AQI ${peak.usAqi}) around ${hhmm} — plan indoor then`
          : `พยากรณ์ฝุ่นจะขึ้นแตะ PM2.5 ~${peak.pm25} (US-AQI ${peak.usAqi}) ราว ${hhmm} น. — ช่วงนั้นเลี่ยงกลางแจ้ง`}
        <span className="ml-1 text-[0.7rem] text-ink-faint">{en ? "(forecast — CAMS, not measured now)" : "(พยากรณ์ CAMS ไม่ใช่ค่าวัดสด)"}</span>
      </span>
    </div>
  );
}
