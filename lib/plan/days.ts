/**
 * days.ts — turn a multi-day forecast into "which day do you want to go?" options
 * and the right start-hour index for that day. People plan trips for "this weekend"
 * or "next Tuesday", not just today. Pure (now is passed in) → testable.
 */

import type { HourlyForecast } from "@/lib/weather/types";

export type DayOption = { offset: number; th: string; en: string };

const TH_WD = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัส", "ศุกร์", "เสาร์"];
const EN_WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function dayOffsetOf(hourISO: string, now: Date): number {
  const d = new Date(hourISO);
  const a = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  const b = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((a - b) / 86400000);
}

/** Distinct day options (0..6) actually present in the forecast, nearest first. */
export function availableDays(hours: Pick<HourlyForecast, "hourISO">[], now: Date): DayOption[] {
  const offsets = new Set<number>();
  for (const h of hours) { const o = dayOffsetOf(h.hourISO, now); if (o >= 0 && o <= 6) offsets.add(o); }
  return [...offsets].sort((a, b) => a - b).map((offset) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
    const wd = d.getDay();
    return {
      offset,
      th: offset === 0 ? "วันนี้" : offset === 1 ? "พรุ่งนี้" : TH_WD[wd],
      en: offset === 0 ? "Today" : offset === 1 ? "Tomorrow" : EN_WD[wd],
    };
  });
}

/** Start-hour index for the chosen day: today = now-ish (clamped to daytime), future = 10:00. */
export function startIndexForDay(hours: Pick<HourlyForecast, "hourISO">[], offset: number, now: Date): number {
  const targetHour = offset === 0 ? (now.getHours() >= 9 && now.getHours() <= 16 ? now.getHours() : 10) : 10;
  const exact = hours.findIndex((h) => dayOffsetOf(h.hourISO, now) === offset && new Date(h.hourISO).getHours() === targetHour);
  if (exact >= 0) return exact;
  const first = hours.findIndex((h) => dayOffsetOf(h.hourISO, now) === offset);
  return first >= 0 ? first : 0;
}
