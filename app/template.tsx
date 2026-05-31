"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

/**
 * Route template — soft cross-fade + drift between / and /plan. Next re-mounts
 * template.tsx per navigation, so the enter animation replays each route change.
 *
 * Gated on mount: a motion `initial={opacity:0}` rendered in SSR HTML mismatches
 * hydration (it clashes with the /plan Suspense boundary). So SSR + first client
 * paint are PLAIN; the entrance plays only after mount. The first load therefore
 * shows no flash, and subsequent client navigations animate (template re-mounts
 * already-hydrated, so `mounted` is true immediately on the next route).
 * Reduced-motion: always plain.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (reduce || !mounted) return <>{children}</>;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
