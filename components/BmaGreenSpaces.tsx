"use client";

import { useEffect, useState } from "react";
import { useLang } from "@/lib/i18n/useLang";
import { mapsPoiUrl } from "@/lib/poi/photo";
import type { BmaPark } from "@/lib/data/bmaParks";

/**
 * BmaGreenSpaces — the official กทม. green-space layer (data.bangkok.go.th) on the plan.
 * Shows the nearest OFFICIAL public parks to the chosen area, with hours + size + a
 * provenance link. Real city data = the BDI "Envi Link / FACT not estimation" trust
 * surface, and a cross-link (environment × travel). Renders nothing if the city portal
 * is down or nothing is genuinely nearby — never fabricates a park.
 */
function km(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371, dLat = ((bLat - aLat) * Math.PI) / 180, dLng = ((bLng - aLng) * Math.PI) / 180;
  const la1 = (aLat * Math.PI) / 180, la2 = (bLat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function BmaGreenSpaces({ lat, lng }: { lat: number; lng: number }) {
  const { en } = useLang();
  const [parks, setParks] = useState<BmaPark[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/bma-parks")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => { if (!cancelled) setParks(d.parks ?? []); })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, []);

  if (failed) return null;
  const nearest = parks
    ? parks.map((p) => ({ ...p, d: km(lat, lng, p.lat, p.lng) })).sort((a, b) => a.d - b.d).slice(0, 3)
    : [];
  if (parks && nearest.length === 0) return null;

  return (
    <section className="rounded-2xl border border-hairline bg-surface/50 p-4">
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <h3 className="font-thai-serif text-lg font-light text-ink">
          {en ? "Official city parks nearby" : "สวนทางการ กทม. ใกล้ ๆ"}
        </h3>
        <span className="font-display text-[0.65rem] uppercase tracking-[0.18em] text-success">{en ? "verified · BMA" : "ทางการ · กทม."}</span>
      </div>

      {!parks ? (
        <div className="grid gap-2 sm:grid-cols-3">
          {[0, 1, 2].map((i) => <div key={i} className="h-20 rounded-xl border border-hairline bg-surface/50 animate-pulse" />)}
        </div>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-3">
          {nearest.map((p) => (
            <li key={p.id}>
              <a href={mapsPoiUrl(p.lat, p.lng, p.name)} target="_blank" rel="noopener noreferrer"
                className="group block h-full rounded-xl border border-hairline bg-paper/40 p-3 transition-colors hover:bg-surface">
                <p className="font-thai font-medium text-ink leading-snug group-hover:text-rain transition-colors">{p.name}</p>
                <p className="font-thai text-xs text-ink-faint mt-0.5">
                  {p.district} · {p.d < 1 ? `${Math.round(p.d * 1000)} ${en ? "m" : "ม."}` : `${p.d.toFixed(1)} ${en ? "km" : "กม."}`}{p.areaRai ? ` · ${p.areaRai} ${en ? "rai" : "ไร่"}` : ""}
                </p>
                {p.hours && <p className="font-thai text-xs text-ink-muted mt-1 line-clamp-1">{p.hours}</p>}
              </a>
            </li>
          ))}
        </ul>
      )}

      <p className="font-thai text-[0.7rem] text-ink-faint mt-3">
        {en ? "Source — Bangkok open data" : "ข้อมูลทางการจาก"}{" "}
        <a href="https://data.bangkok.go.th/dataset/park" target="_blank" rel="noopener noreferrer" className="text-rain hover:underline">data.bangkok.go.th</a>
      </p>
    </section>
  );
}
