"use client";

import { motion, useMotionValue, useSpring, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { useRef, type ReactNode } from "react";

/**
 * MagneticButton — the CTA leans gently toward the cursor, springs back on leave.
 * Interaction research #7 (wow 7 / effort 3). Pointer-only; under reduced-motion
 * (or touch) it's a plain link with no transform.
 */
export function MagneticButton({
  href,
  children,
  className,
  strength = 0.35,
}: {
  href: string;
  children: ReactNode;
  className?: string;
  strength?: number;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLAnchorElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const x = useSpring(mx, { stiffness: 150, damping: 15, mass: 0.2 });
  const y = useSpring(my, { stiffness: 150, damping: 15, mass: 0.2 });

  function onMove(e: React.PointerEvent) {
    if (reduce || e.pointerType !== "mouse") return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    mx.set((e.clientX - (r.left + r.width / 2)) * strength);
    my.set((e.clientY - (r.top + r.height / 2)) * strength);
  }
  function reset() {
    mx.set(0);
    my.set(0);
  }

  return (
    <motion.div style={{ x, y, display: "inline-block" }}>
      <Link
        ref={ref}
        href={href}
        className={className}
        onPointerMove={onMove}
        onPointerLeave={reset}
      >
        {children}
      </Link>
    </motion.div>
  );
}
