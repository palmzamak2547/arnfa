"use client";

import type { SkyState } from "./SkyChip";

/**
 * PoiVisual — an honest, self-drawn visual chip for a place (NOT a fake photo).
 *
 * Cafés/restaurants rarely have a licensed real photo, and fabricating one (AI or
 * mismatched stock) would break Iron Rule 0 + Palm's "no AI feel". So each stop
 * gets a small generated tile: a category-hue gradient washed by the arrival sky
 * state, with a single hairline category glyph. Deterministic per place (seeded by
 * id) so it's stable, never random. Real, ours, on-brand.
 */

const CATEGORY_HUE: Record<string, [string, string]> = {
  cafe: ["#E8C9A0", "#F4EFE6"],
  restaurant: ["#E6B89C", "#F4EFE6"],
  bar: ["#B7A6C9", "#F0EAE0"],
  park: ["#A9C7A0", "#EAF0E4"],
  garden: ["#9FC59A", "#EAF0E4"],
  market: ["#E5C58F", "#F4EFE6"],
  mall: ["#BFC8D6", "#F0F1F4"],
  museum: ["#C9BBA8", "#F2EDE3"],
  gallery: ["#CBB6C4", "#F2ECEC"],
  library: ["#B6C2CE", "#EEF0F3"],
  viewpoint: ["#A8C6E8", "#EAF1F8"],
  playground: ["#E6C58F", "#F4EFE6"],
  other: ["#CFC8BC", "#F4EFE6"],
};

const SKY_WASH: Record<SkyState, string> = {
  clear: "rgba(242,166,90,0.16)",
  partly: "rgba(123,166,138,0.14)",
  cloudy: "rgba(75,82,99,0.12)",
  rain: "rgba(91,127,184,0.20)",
  storm: "rgba(217,83,74,0.20)",
  night: "rgba(74,88,120,0.28)",
};

function glyph(category: string, color: string) {
  const c = { stroke: color, strokeWidth: 1.4, fill: "none", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (category) {
    case "cafe":
      return (<g {...c}><path d="M6 9h9v4a4 4 0 0 1-4 4H10a4 4 0 0 1-4-4V9Z" /><path d="M15 10h2a2 2 0 0 1 0 4h-2" /><path d="M8 5v1.5M11 4.5V6" /></g>);
    case "restaurant":
      return (<g {...c}><path d="M8 4v7M6 4v3a2 2 0 0 0 2 2M10 4v3a2 2 0 0 1-2 2M8 11v7" /><path d="M15 4c-1.5 0-2 2-2 4s.5 4 2 4v6" /></g>);
    case "bar":
      return (<g {...c}><path d="M5 5h12l-5 6v5M9 16h6M7 5l5 6" /></g>);
    case "park": case "garden": case "playground":
      return (<g {...c}><path d="M11 19v-6M7 11a4 4 0 1 1 8 0 3 3 0 0 1-1.5 6h-5A3 3 0 0 1 7 11Z" /></g>);
    case "market":
      return (<g {...c}><path d="M5 8h12l-1 3H6L5 8ZM6 11v7h10v-7M5 8l1-3h10l1 3" /></g>);
    case "mall":
      return (<g {...c}><path d="M6 8h10v10H6zM9 8a2 2 0 0 1 4 0" /></g>);
    case "museum": case "gallery":
      return (<g {...c}><path d="M5 9l6-4 6 4M6 9v7m4-7v7m4-7v7M4 18h14" /></g>);
    case "library":
      return (<g {...c}><path d="M6 5h4v13H6zM10 6l4-1 2 12-4 1zM6 18h10" /></g>);
    case "viewpoint":
      return (<g {...c}><circle cx="11" cy="11" r="3" /><path d="M3 11s3-5 8-5 8 5 8 5-3 5-8 5-8-5-8-5Z" /></g>);
    default:
      return (<g {...c}><circle cx="11" cy="11" r="6" /></g>);
  }
}

export function PoiVisual({
  id,
  category,
  skyState,
  className,
}: {
  id: string;
  category: string;
  skyState: SkyState;
  className?: string;
}) {
  const [from, to] = CATEGORY_HUE[category] ?? CATEGORY_HUE.other;
  // deterministic angle from id so each tile differs but is stable
  let s = 0;
  for (let i = 0; i < id.length; i++) s = (s * 31 + id.charCodeAt(i)) % 360;
  const angle = s;

  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-xl ${className ?? "h-12 w-12"}`}
      style={{ background: `linear-gradient(${angle}deg, ${from}, ${to})` }}
      aria-hidden
    >
      <div className="absolute inset-0" style={{ background: SKY_WASH[skyState] }} />
      <svg viewBox="0 0 22 22" className="absolute inset-0 m-auto h-1/2 w-1/2 opacity-70">
        {glyph(category, "#1A1F2B")}
      </svg>
    </div>
  );
}
