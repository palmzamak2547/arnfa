"use client";

import { useEffect, useState } from "react";
import { useLang } from "@/lib/i18n/useLang";
import { mapsPoiUrl } from "@/lib/poi/photo";
import { SYSTEM_META } from "@/lib/data/transitStations";

/**
 * TransitNearby — the "ไปย่านนี้ด้วยรถไฟฟ้า" answer: nearest BTS/MRT/ARL/SRT stations to the
 * plan area, from the real Namtang open transit feed (รุ่นพี่'s OTP project). The BDI Track-1
 * "การเดินทาง" axis with real public-transit data. Renders nothing if none nearby / feed down.
 */
type Station = { th: string; en: string; lat: number; lng: number; system: string; km: number };

export function TransitNearby({ lat, lng }: { lat: number; lng: number }) {
  const { en } = useLang();
  const [stations, setStations] = useState<Station[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/transit?lat=${lat}&lng=${lng}&n=3`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => { if (!cancelled) setStations(d.stations ?? []); })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [lat, lng]);

  if (failed || (stations && stations.length === 0)) return null;

  return (
    <section className="rounded-2xl border border-hairline bg-surface/50 p-4">
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <h3 className="font-thai-serif text-lg font-light text-ink">{en ? "Get here by train" : "ไปย่านนี้ด้วยรถไฟฟ้า"}</h3>
        <span className="font-thai text-[0.7rem] text-ink-faint">{en ? "nearest stations" : "สถานีใกล้สุด"}</span>
      </div>

      {!stations ? (
        <div className="grid gap-2 sm:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="h-14 rounded-xl border border-hairline bg-surface/50 animate-pulse" />)}</div>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-3">
          {stations.map((s) => {
            const meta = SYSTEM_META[s.system];
            return (
              <li key={`${s.system}-${s.en}`}>
                <a href={mapsPoiUrl(s.lat, s.lng, `${s.system} ${s.en}`)} target="_blank" rel="noopener noreferrer"
                  className="group flex items-center gap-2.5 h-full rounded-xl border border-hairline bg-paper/40 p-3 transition-colors hover:bg-surface">
                  <span className="shrink-0 rounded px-1.5 py-0.5 text-[0.6rem] font-semibold text-white" style={{ background: meta?.color ?? "var(--arnfa-ink)" }}>{s.system}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-thai text-sm text-ink truncate group-hover:text-rain transition-colors">{s.th || s.en}</span>
                    <span className="block font-thai text-xs text-ink-faint tabular-nums">{s.km < 1 ? `${Math.round(s.km * 1000)} ม.` : `${s.km.toFixed(1)} กม.`}</span>
                  </span>
                </a>
              </li>
            );
          })}
        </ul>
      )}

      <p className="font-thai text-[0.7rem] text-ink-faint mt-3">
        {en ? "Transit data — Namtang (OTP)" : "ข้อมูลขนส่งจาก Namtang"}{" "}
        <a href="https://namtang.otp.go.th/" target="_blank" rel="noopener noreferrer" className="text-rain hover:underline">namtang.otp.go.th</a>
      </p>
    </section>
  );
}
