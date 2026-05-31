"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { SeedPoi } from "@/lib/plan/buildPlan";
import { fetchPoiImage, hasLinkedImage, mapsPoiUrl } from "@/lib/poi/photo";
import { categoryLabel } from "@/lib/plan/categoryLabel";

/**
 * AreaHighlights — real photos of notable, photo-linked places in the chosen area
 * (Wikimedia Commons via OSM wikidata). Self-filtering: only places that actually
 * resolve to a real image are shown. Honest — no stock/guessed imagery. Hidden when
 * an area has none.
 */
type Card = { poi: SeedPoi; src: string };

export function AreaHighlights({ pois }: { pois: SeedPoi[] }) {
  const { i18n } = useTranslation();
  const en = i18n.language === "en";
  const [cards, setCards] = useState<Card[]>([]);

  useEffect(() => {
    let cancelled = false;
    setCards([]);
    const candidates = pois.filter(hasLinkedImage).slice(0, 14);
    if (!candidates.length) return;
    Promise.all(candidates.map(async (poi) => ({ poi, src: await fetchPoiImage(poi) })))
      .then((rs) => { if (!cancelled) setCards(rs.filter((r): r is Card => !!r.src).slice(0, 6)); });
    return () => { cancelled = true; };
  }, [pois]);

  if (cards.length === 0) return null;

  return (
    <section className="arnfa-grid section-minor">
      <div className="col-content">
        <h2 className="font-thai-serif text-lg font-light text-ink mb-4">{en ? "Notable around here" : "ที่น่าสนใจในย่านนี้"}</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {cards.map(({ poi, src }) => (
            <a key={poi.id} href={mapsPoiUrl(poi.lat, poi.lng, poi.name)} target="_blank" rel="noopener noreferrer"
              className="group overflow-hidden rounded-2xl border border-hairline bg-surface">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={poi.name} loading="lazy" decoding="async" className="aspect-[4/3] w-full object-cover transition-transform duration-[var(--dur-base)] ease-[var(--ease-drift)] group-hover:scale-105" />
              <div className="p-2.5">
                <p className="font-thai text-sm font-medium text-ink truncate">{poi.name}</p>
                <p className="font-thai text-xs text-ink-faint">{categoryLabel(poi.category, en)}</p>
              </div>
            </a>
          ))}
        </div>
        <p className="font-thai text-[0.7rem] text-ink-faint mt-3">{en ? "Real photos via Wikimedia Commons" : "รูปจริงจาก Wikimedia Commons"}</p>
      </div>
    </section>
  );
}
