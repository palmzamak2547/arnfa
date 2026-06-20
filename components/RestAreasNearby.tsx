"use client";

import { useEffect, useState } from "react";
import { useLang } from "@/lib/i18n/useLang";
import { mapsPoiUrl } from "@/lib/poi/photo";

/**
 * RestAreasNearby — official highway rest areas (จุดพักรถ ของกรมทางหลวง) near the plan area.
 * The intercity "การเดินทาง" answer for province trips: where to pull over on the way. Renders
 * nothing for city centres (no highway rest areas in town) or if the feed is empty — honest.
 */
type Area = { name: string; route: string; km: string; size: string; parking: number; prov: string; lat: number; lng: number; dist: number };

const SIZE_LABEL: Record<string, { th: string; en: string }> = {
  S: { th: "เล็ก", en: "small" }, M: { th: "กลาง", en: "medium" }, L: { th: "ใหญ่", en: "large" },
};

export function RestAreasNearby({ lat, lng }: { lat: number; lng: number }) {
  const { en } = useLang();
  const [areas, setAreas] = useState<Area[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/rest-areas?lat=${lat}&lng=${lng}&n=3`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => { if (!cancelled) setAreas(d.areas ?? []); })
      .catch(() => { if (!cancelled) setAreas([]); });
    return () => { cancelled = true; };
  }, [lat, lng]);

  if (!areas || areas.length === 0) return null; // city centre / feed empty → don't render

  return (
    <section className="rounded-2xl border border-hairline bg-surface/50 p-4">
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <h3 className="font-thai-serif text-lg font-light text-ink">{en ? "Rest stops on the way" : "จุดพักรถระหว่างทาง"}</h3>
        <span className="font-thai text-[0.7rem] text-ink-faint">{en ? "Dept. of Highways" : "กรมทางหลวง"}</span>
      </div>

      <ul className="grid gap-2 sm:grid-cols-3">
        {areas.map((a, i) => (
          <li key={`${a.route}-${a.km}-${i}`}>
            <a href={mapsPoiUrl(a.lat, a.lng, a.name)} target="_blank" rel="noopener noreferrer"
              className="group flex h-full flex-col gap-1 rounded-xl border border-hairline bg-paper/40 p-3 transition-colors hover:bg-surface">
              <div className="flex items-center gap-2">
                <span className="shrink-0 rounded bg-ink/85 px-1.5 py-0.5 text-[0.6rem] font-semibold text-paper">{en ? `Hwy ${a.route}` : `ทล. ${a.route}`}</span>
                <span className="font-thai text-xs text-ink-faint tabular-nums">{a.dist < 1 ? `${Math.round(a.dist * 1000)} ${en ? "m" : "ม."}` : `${a.dist.toFixed(1)} ${en ? "km" : "กม."}`}</span>
              </div>
              <span className="font-thai text-sm text-ink leading-snug line-clamp-2 group-hover:text-rain transition-colors">{a.name}</span>
              <span className="font-thai text-[0.7rem] text-ink-faint">
                {en ? `km ${a.km}` : `กม.${a.km}`}{a.parking ? (en ? ` · ${a.parking} parking` : ` · จอด ${a.parking} คัน`) : ""}{SIZE_LABEL[a.size] ? ` · ${en ? SIZE_LABEL[a.size].en : SIZE_LABEL[a.size].th}` : ""}
              </span>
            </a>
          </li>
        ))}
      </ul>

      <p className="font-thai text-[0.7rem] text-ink-faint mt-3">
        {en ? "Rest-area data — Dept. of Highways GeoServer" : "ข้อมูลจุดพักรถจากกรมทางหลวง"}
      </p>
    </section>
  );
}
