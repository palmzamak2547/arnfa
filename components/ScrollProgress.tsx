"use client";

import { useEffect } from "react";

/**
 * ScrollProgress — a slim sun→rain→indoor gradient bar pinned at the very top that
 * fills as you scroll the page (editorial "you are here" cue). Writes the transform
 * directly to the DOM node each frame (no React state per scroll — see the
 * react-animation-direct-dom rule), and is dropped entirely under reduced-motion.
 */
export function ScrollProgress() {
  useEffect(() => {
    if (typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const bar = document.createElement("div");
    bar.className = "af-progress";
    bar.setAttribute("aria-hidden", "true");
    document.body.appendChild(bar);

    let raf = 0;
    let last = -1;
    const tick = () => {
      const d = document.documentElement;
      const y = window.scrollY || d.scrollTop || 0;
      if (y !== last) {
        last = y;
        const max = d.scrollHeight - window.innerHeight || 1;
        bar.style.transform = `scaleX(${Math.min(1, Math.max(0, y / max)).toFixed(4)})`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      bar.remove();
    };
  }, []);

  return null;
}
