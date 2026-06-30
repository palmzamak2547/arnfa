"use client";

import type { HourlyForecast } from "@/lib/weather/types";
import { useLang } from "@/lib/i18n/useLang";

/**
 * SkyTimeline — the signature "we matched each place to the sky at the hour you'll
 * arrive" made visible. A row of hour cells across the trip window, each tinted by its
 * rain chance (the rain BAND is obvious), with every stop pinned at its arrival hour and
 * dotted by its sky. When the engine swaps a stop indoor because rain hits at 16:00, you
 * SEE that stop sitting on the rain cell — the causal link no generic planner can show.
 */
type TStop = { arrivalHourISO: string; skyState: string; poi: { name: string } };

const SKY_DOT: Record<string, string> = {
  clear: "var(--arnfa-accent-sun)", partly: "var(--arnfa-success)", cloudy: "var(--arnfa-hairline)",
  rain: "var(--arnfa-accent-rain)", storm: "var(--arnfa-accent-indoor-warm)", night: "#4A5878",
};

export function SkyTimeline({ forecast, stops, startHourIndex }: {
  forecast: HourlyForecast[];
  stops: TStop[];
  startHourIndex: number;
}) {
  const { en } = useLang();
  if (!forecast.length || stops.length < 2) return null;

  const arrivalIdx = stops.map((s) => forecast.findIndex((f) => f.hourISO === s.arrivalHourISO));
  const valid = arrivalIdx.filter((i) => i >= 0);
  if (valid.length < 2) return null;

  const lo = Math.max(0, Math.min(startHourIndex, ...valid));
  const hi = Math.min(forecast.length - 1, Math.max(...valid) + 1);
  const hours = forecast.slice(lo, hi + 1);
  if (hours.length < 2 || hours.length > 26) return null;

  // column index (within `hours`) → the stop that arrives there
  const stopAt: Record<number, TStop & { n: number }> = {};
  stops.forEach((s, n) => {
    const gi = arrivalIdx[n];
    if (gi >= lo && gi <= hi) stopAt[gi - lo] = { ...s, n: n + 1 };
  });

  return (
    <section className="rounded-3xl border border-hairline bg-surface/70 p-5 sm:p-6 mb-5">
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <h3 className="font-thai-serif text-lg font-light text-ink">{en ? "Sky-fit timeline" : "ไทม์ไลน์ฟ้า"}</h3>
        <span className="font-thai text-[0.7rem] text-ink-faint">{en ? "each stop at its arrival hour" : "แต่ละจุด ณ เวลาที่ไปถึง"}</span>
      </div>

      <div className="flex items-end gap-px">
        {hours.map((h, i) => {
          const rp = Math.max(0, Math.min(1, h.rainProb)); // 0–1
          const hour = +h.hourISO.slice(11, 13);
          const st = stopAt[i];
          return (
            <div key={h.hourISO} className="flex flex-1 flex-col items-center gap-1" style={{ minWidth: 0 }}>
              {/* stop marker (reserve height so the row aligns) */}
              <div className="flex h-9 flex-col items-center justify-end">
                {st && (
                  <>
                    <span className="flex h-5 w-5 items-center justify-center rounded-full text-paper text-[0.6rem] font-semibold"
                      style={{ background: SKY_DOT[st.skyState] ?? "var(--arnfa-ink)" }} title={st.poi.name}>{st.n}</span>
                    <span className="mt-0.5 block h-1.5 w-px bg-hairline" aria-hidden />
                  </>
                )}
              </div>
              {/* hour cell, tinted by rain chance; the rain band is self-evident */}
              <div className="h-9 w-full rounded-sm border border-hairline/60"
                style={{ background: rp > 0.05 ? `rgba(91,127,184,${(0.12 + rp * 0.78).toFixed(2)})` : "var(--arnfa-paper)" }}
                title={`${hour}:00, ${en ? "rain" : "ฝน"} ${Math.round(rp * 100)}%`} />
              <span className="font-display text-[0.6rem] tabular-nums text-ink-faint">{hour}</span>
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 font-thai text-[0.7rem] text-ink-faint">
        <span className="inline-flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: "rgba(91,127,184,0.8)" }} />{en ? "rain chance (cell)" : "โอกาสฝน (สีน้ำเงิน)"}</span>
        <span className="inline-flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-full bg-indoor-warm" />{en ? "indoor stop" : "จุดในร่ม (เลี่ยงฝน)"}</span>
        <span>{en ? "numbers = your stops" : "ตัวเลข = ลำดับจุดในแผน"}</span>
      </div>
    </section>
  );
}
