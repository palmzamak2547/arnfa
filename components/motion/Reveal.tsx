"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

/**
 * Reveal — scroll-triggered entrance (fade + drift-up), the editorial way.
 *
 * "drift, never bounce": opacity + small y, 700-900ms cubic-bezier(0.22,1,0.36,1),
 * once. Under prefers-reduced-motion it renders fully visible immediately (the
 * content is the point; the motion is decorative). Per
 * memory/feedback_reduce-motion-blanket-disable-trap.
 *
 * Interaction research technique #4 (anti-2021-parallax): a tasteful single-shot
 * reveal, not a scrubbed parallax.
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
  if (reduce) return <div className={className}>{children}</div>;

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
