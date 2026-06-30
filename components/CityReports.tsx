"use client";

import { useEffect, useState } from "react";
import { useLang } from "@/lib/i18n/useLang";
import { parseTs, timeAgo } from "@/lib/timeAgo";

/**
 * CityReports — the "citizen feedback" City Signal (the BDI keynote's third UNDERSTAND signal,
 * alongside weather + PM2.5). Live citizen-reported issues near the plan area from **Traffy
 * Fondue** (Bangkok's official report platform): before you go, is the STREET ok here — floods,
 * footpaths, road work — not just the sky? Trip-relevant reports are flagged. Renders nothing if
 * none nearby / feed down (Iron Rule 0 — never a fabricated report).
 */
type Report = { desc: string; lat: number; lng: number; distKm: number; state: string; address: string; timestamp: string; ticketId: string; tripRelevant: boolean };

export function CityReports({ lat, lng }: { lat: number; lng: number }) {
  const { en } = useLang();
  const [reports, setReports] = useState<Report[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/city-reports?lat=${lat}&lng=${lng}&n=4`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => { if (!cancelled) setReports(d.reports ?? []); })
      .catch(() => { if (!cancelled) setReports([]); });
    return () => { cancelled = true; };
  }, [lat, lng]);

  if (!reports || reports.length === 0) return null; // nothing nearby / feed down → don't render

  const dist = (d: number) => (d < 1 ? `${Math.round(d * 1000)} ${en ? "m" : "ม."}` : `${d.toFixed(1)} ${en ? "km" : "กม."}`);

  // Honest freshness: only call it "live/สดๆ" if the newest report is genuinely recent (< 12h).
  // Otherwise the wording softens and we show the real "อัปเดตล่าสุด <relative>".
  const newest = reports.reduce<number | null>((mx, r) => { const t = parseTs(r.timestamp); return t && (!mx || t > mx) ? t : mx; }, null);
  const live = newest != null && Date.now() - newest < 12 * 3600 * 1000;

  return (
    <section className="rounded-3xl border border-hairline bg-surface/70 p-5 sm:p-6">
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <h3 className="font-thai-serif text-lg font-light text-ink">{en ? (live ? "The street, live" : "The street near here") : (live ? "เสียงจากเมือง แถวนี้" : "เรื่องแจ้งแถวนี้")}</h3>
        <span className="font-display text-[0.65rem] uppercase tracking-[0.18em] text-rain">{en ? "citizen feedback" : "ประชาชนแจ้ง"}</span>
      </div>
      <p className="mb-3 font-thai text-xs text-ink-muted">
        {en
          ? (live ? "Live citizen reports near here — before you go, is the street ok, not just the sky?" : "Citizen reports near here — before you go, is the street ok, not just the sky?")
          : (live ? "เรื่องที่คนแถวนี้แจ้งเข้ามาสดๆ — ก่อนไป เช็คทั้งฟ้าและถนน" : "เรื่องที่คนแถวนี้แจ้งเข้ามา — ก่อนไป เช็คทั้งฟ้าและถนน")}
        {newest != null && <span className="text-ink-faint">{" "}— {en ? "updated" : "อัปเดตล่าสุด"} {timeAgo(newest, en)}</span>}
      </p>

      <ul className="space-y-2">
        {reports.map((rp, i) => (
          <li key={rp.ticketId || i} className="rounded-xl border border-hairline bg-paper/40 p-3">
            <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1">
              {rp.tripRelevant && (
                <span className="rounded-full bg-indoor-warm px-1.5 py-0.5 text-[0.6rem] font-medium text-white">
                  {en ? "affects your trip" : "เกี่ยวกับการเดินทาง"}
                </span>
              )}
              <span className="font-thai text-xs tabular-nums text-ink-faint">{dist(rp.distKm)}</span>
              {rp.state && <span className="font-thai text-[0.7rem] text-ink-faint">{rp.state}</span>}
            </div>
            <p className="font-thai text-sm leading-snug text-ink line-clamp-2">{rp.desc || (en ? "(report near here)" : "(เรื่องแจ้งแถวนี้)")}</p>
          </li>
        ))}
      </ul>

      <p className="mt-3 font-thai text-[0.7rem] text-ink-faint">
        {en ? "Source — Traffy Fondue (Bangkok citizen reports)" : "ข้อมูลจาก Traffy Fondue (เรื่องที่ประชาชนแจ้ง กทม.)"}{" "}
        <a href="https://www.traffy.in.th/" target="_blank" rel="noopener noreferrer" className="text-rain hover:underline">traffy.in.th</a>
      </p>
    </section>
  );
}
