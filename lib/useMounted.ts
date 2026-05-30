"use client";

import { useEffect, useState } from "react";

/**
 * useMounted — true only after the first client effect runs.
 *
 * Used to gate framer-motion entrance animations so the motion element mounts
 * CLIENT-SIDE (not in SSR HTML). This avoids hydration mismatches where the
 * server renders `opacity:0 / translateY(...)` from `initial` but the client
 * immediately animates to the resting state — the element instead appears
 * fresh post-hydration and plays its entrance cleanly.
 *
 * See memory/reference_nextfont-axes-weight-conflict (same session, verify-first).
 */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
