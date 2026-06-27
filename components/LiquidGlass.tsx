"use client";

import { useEffect } from "react";

/**
 * LiquidGlass — Aave-style "liquid glass" refraction, as a progressive enhancement.
 *
 * An SVG feTurbulence → feDisplacementMap filter, referenced by `backdrop-filter:
 * url(#arnfa-lens)`, bends the pixels of the BACKDROP behind any `.arnfa-liquid`
 * element — so a card over the live sky refracts that sky like thick, wavy glass
 * (the card's own text stays crisp; only the backdrop warps).
 *
 * Only Chromium renders `backdrop-filter: url(#filter)` correctly (Safari claims
 * support but mis-renders it; Firefox drops it). So we feature-gate behind
 * `html.liquid-ok` — everyone else keeps the cross-browser `.arnfa-glass` blur.
 * The filter is static (no animated seed) → nothing for reduced-motion to disable.
 * Render once near the top of the page; the off-screen <svg> just defines the filter.
 */
export function LiquidGlass() {
  useEffect(() => {
    const ua = navigator.userAgent;
    const chromium = /Chrome\//.test(ua) && !/(Firefox|FxiOS)/.test(ua);
    const ok = chromium && typeof CSS !== "undefined" && !!CSS.supports?.("backdrop-filter", "url(#x)");
    if (ok) document.documentElement.classList.add("liquid-ok");
  }, []);

  return (
    <svg aria-hidden width="0" height="0" style={{ position: "absolute" }}>
      <filter id="arnfa-lens" x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
        {/* smooth low-frequency noise → a gentle "thick wavy glass" refraction, not a gimmick */}
        <feTurbulence type="fractalNoise" baseFrequency="0.009 0.013" numOctaves={2} seed={11} result="noise" />
        <feDisplacementMap in="SourceGraphic" in2="noise" scale={18} xChannelSelector="R" yChannelSelector="G" />
      </filter>
    </svg>
  );
}
