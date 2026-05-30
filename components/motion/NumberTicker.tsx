"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { useMounted } from "@/lib/useMounted";

/**
 * NumberTicker — counts up to `value` when it scrolls into view.
 * Interaction research #6 (wow 7 / effort 2).
 *
 * Hydration-safe: SSR and the first client render BOTH show the final `value`
 * (so the markup matches and no-JS users see the real number). The count-up
 * animation only starts AFTER mount (in an effect), so it never causes a
 * server/client text mismatch. Reduced-motion → no animation, stays at value.
 */
export function NumberTicker({
  value,
  durationMs = 1200,
  className,
  suffix = "",
}: {
  value: number;
  durationMs?: number;
  className?: string;
  suffix?: string;
}) {
  const reduce = useReducedMotion();
  const mounted = useMounted();
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(value); // SSR + first paint = final value (match)
  const started = useRef(false);

  useEffect(() => {
    if (!mounted || reduce) return; // reduced-motion or pre-mount → leave at value
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !started.current) {
          started.current = true;
          setDisplay(0); // begin the count-up from zero (post-hydration, safe)
          const t0 = performance.now();
          const tick = (now: number) => {
            const p = Math.min(1, (now - t0) / durationMs);
            const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
            setDisplay(Math.round(value * eased));
            if (p < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [value, durationMs, reduce, mounted]);

  return (
    <span ref={ref} className={className}>
      {display.toLocaleString()}
      {suffix}
    </span>
  );
}
