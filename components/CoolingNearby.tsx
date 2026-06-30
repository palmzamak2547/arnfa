"use client";

import { useEffect, useState } from "react";
import { useLang } from "@/lib/i18n/useLang";
import { mapsPoiUrl } from "@/lib/poi/photo";

/**
 * CoolingNearby — OFFICIAL กทม. cooling centers (ห้องหลบร้อน), surfaced ONLY when it's
 * genuinely hot or dusty (the advisory says so). The BDI "Envi Link" health×environment
 * cross-link made actionable: dangerous heat/PM2.5 → here's the nearest official refuge.
 * Renders nothing when conditions are fine, the data is down, or nothing is nearby.
 */
type Center = { id: string; name: string; type: string; district: string; address: string; time: string; lat: number; lng: number; km: number };

export function CoolingNearby({ lat, lng, active }: { lat: number; lng: number; active: boolean }) {
  const { en } = useLang();
  const [centers, setCenters] = useState<Center[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    fetch(`/api/cooling?lat=${lat}&lng=${lng}&n=3`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => { if (!cancelled) setCenters(d.centers ?? []); })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [active, lat, lng]);

  if (!active || failed || (centers && centers.length === 0)) return null;

  return (
    <section className="rounded-2xl border border-indoor-warm/30 bg-indoor-warm/[0.06] p-4">
      <div className="flex items-baseline justify-between gap-3 mb-2">
        <h3 className="font-thai-serif text-lg font-light text-ink">
          {en ? "Cool off nearby" : "หลบร้อน/ฝุ่น ได้ที่ใกล้ ๆ"}
        </h3>
        <span className="font-display text-[0.65rem] uppercase tracking-[0.18em] text-indoor-warm">{en ? "official refuge BMA" : "ห้องหลบร้อน กทม."}</span>
      </div>
      <p className="font-thai text-xs text-ink-muted mb-3">
        {en ? "Heat/dust is high right now — these are official city cooling refuges." : "ตอนนี้ร้อน/ฝุ่นสูง นี่คือห้องหลบร้อนทางการของ กทม. ที่ใกล้ที่สุด"}
      </p>

      {!centers ? (
        <div className="grid gap-2 sm:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="h-16 rounded-xl border border-hairline bg-surface/50 animate-pulse" />)}</div>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-3">
          {centers.map((c) => (
            <li key={c.id}>
              <a href={mapsPoiUrl(c.lat, c.lng, c.name)} target="_blank" rel="noopener noreferrer"
                className="group block h-full rounded-xl border border-hairline bg-paper/40 p-3 transition-colors hover:bg-surface">
                <p className="font-thai text-sm font-medium text-ink leading-snug line-clamp-2 group-hover:text-indoor-warm transition-colors">{c.name}</p>
                <p className="font-thai text-xs text-ink-faint mt-0.5">
                  {c.district}, {c.km < 1 ? `${Math.round(c.km * 1000)} ${en ? "m" : "ม."}` : `${c.km.toFixed(1)} ${en ? "km" : "กม."}`}
                </p>
                {c.time && <p className="font-thai text-xs text-ink-muted mt-1 line-clamp-1">{c.time}</p>}
              </a>
            </li>
          ))}
        </ul>
      )}

      <p className="font-thai text-[0.7rem] text-ink-faint mt-3">
        {en ? "Source — BMA cooling-center registry" : "ข้อมูลทางการ ห้องหลบร้อน กทม."}{" "}
        <a href="https://bmamap.bangkok.go.th" target="_blank" rel="noopener noreferrer" className="text-rain hover:underline">bmamap.bangkok.go.th</a>
      </p>
    </section>
  );
}
