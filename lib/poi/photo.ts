/**
 * photo.ts — a REAL photo for a POI, only when one verifiably exists.
 * Source of truth = the POI's OSM `wikidata`/`image` tag. We resolve it to a
 * Wikimedia Commons thumbnail. No name-based image guessing (that risks showing
 * the wrong place) — if there's no linked image we show the self-drawn tile.
 */

import type { SeedPoi } from "@/lib/plan/buildPlan";

const filePathUrl = (file: string, width = 480) =>
  `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file.replace(/^File:/i, ""))}?width=${width}`;

const cache = new Map<string, string | null>();

/** Resolve a real image URL for a POI, or null. Cached per id. */
export async function fetchPoiImage(poi: SeedPoi): Promise<string | null> {
  if (cache.has(poi.id)) return cache.get(poi.id)!;
  let url: string | null = null;
  try {
    // 1) direct OSM image / wikimedia_commons "File:…" tag
    const img = poi.image;
    if (img && /^File:/i.test(img)) url = filePathUrl(img);
    else if (img && /^https?:\/\//.test(img)) url = img;
    // 2) else resolve the wikidata item's P18 (image) claim
    else if (poi.wikidata && /^Q\d+$/.test(poi.wikidata)) {
      const r = await fetch(`https://www.wikidata.org/w/api.php?action=wbgetclaims&entity=${poi.wikidata}&property=P18&format=json&origin=*`);
      if (r.ok) {
        const d = await r.json();
        const file = d?.claims?.P18?.[0]?.mainsnak?.datavalue?.value;
        if (file) url = filePathUrl(file);
      }
    }
  } catch { url = null; }
  cache.set(poi.id, url);
  return url;
}

export const hasLinkedImage = (poi: SeedPoi): boolean =>
  !!(poi.image || (poi.wikidata && /^Q\d+$/.test(poi.wikidata)));

/** Google Maps deep-links — honest "getting around", no API key needed. */
export const mapsPoiUrl = (lat: number, lng: number, name?: string) =>
  `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}${name ? `&destination_place_id=` : ""}`;

export const mapsTripUrl = (stops: { lat: number; lng: number }[]) =>
  stops.length === 0 ? "" : `https://www.google.com/maps/dir/${stops.map((s) => `${s.lat},${s.lng}`).join("/")}`;
