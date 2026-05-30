"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { useMounted } from "@/lib/useMounted";

/**
 * Reveal — scroll-triggered entrance (fade + drift-up), the editorial way.
 *
 * "drift, never bounce": opacity + small y, ~850ms cubic-bezier(0.22,1,0.36,1), once.
 *
 * Hydration-safe: the entrance only arms AFTER mount (useMounted). Before mount —
 * i.e. the SSR HTML and the client's first render — the element is plain (no
 * initial opacity:0/transform), so server and client markup match. This avoids
 * the "server rendered HTML didn't match" hydration error that a bare
 * `initial={{opacity:0}}` on an SSR'd motion element causes.
 *
 * Reduced-motion → always plain (content is the point; motion is decorative).
 */
export function Reveal({
  children,
  delay = 0,
  y = 18,
  className,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const mounted = useMounted();

  // Pre-mount or reduced-motion: render a plain div (matches SSR, no animation).
  if (!mounted || reduce) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-12% 0px -12% 0px" }}
      transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1], delay }}
    >
      {children}
    </motion.div>
  );
}
