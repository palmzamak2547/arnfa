"use client";

import { useEffect, useState } from "react";
import type { SeedPoi } from "@/lib/plan/buildPlan";
import type { SkyState } from "./SkyChip";
import { fetchPoiImage, hasLinkedImage } from "@/lib/poi/photo";
import { PoiVisual } from "./PoiVisual";

/**
 * PoiPhoto — a REAL photo of the place when one is verifiably linked (OSM
 * wikidata/image → Wikimedia Commons), otherwise the honest self-drawn tile.
 * Never a guessed/stock image. Lazy + cached.
 */
export function PoiPhoto({ poi, skyState, className }: { poi: SeedPoi; skyState: SkyState; className?: string }) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setSrc(null);
    setFailed(false);
    if (hasLinkedImage(poi)) fetchPoiImage(poi).then((u) => { if (!cancelled) setSrc(u); });
    return () => { cancelled = true; };
  }, [poi]);

  if (src && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- external Commons URL, not a local asset
      <img
        src={src}
        alt={poi.name}
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
        className={`rounded-2xl object-cover ${className ?? ""}`}
      />
    );
  }
  return <PoiVisual id={poi.id} category={poi.category} skyState={skyState} className={className} />;
}
