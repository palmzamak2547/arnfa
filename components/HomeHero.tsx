"use client";

import { useRef } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useLang } from "@/lib/i18n/useLang";
import { resources } from "@/lib/i18n/locales";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";

// Lazy-load the R3F sky (three.js ≈ 1 MB) so it's OFF the home critical path. The
// CSS gradient (arnfa-sky-surface) shows instantly as the fallback, then the 3D
// sky progressively enhances on top — fast LCP, identical final look.
const SkyHero = dynamic(() => import("./SkyHero").then((m) => m.SkyHero), {
  ssr: false,
  loading: () => <div className="absolute inset-0 arnfa-sky-surface" aria-hidden />,
});

/** HomeHero — R3F sky + translatable editorial overlay, with a gentle scroll parallax. */
export function HomeHero() {
  // Read hero copy via the cookie-aware language flag (not i18n t()), so SSR + first
  // paint render the chosen language with no flash on reload.
  const { en } = useLang();
  const t = (k: string) => (resources[en ? "en" : "th"].translation as Record<string, string>)[k] ?? k;
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  // As the hero scrolls away, the sky drifts up slower + the copy fades — tasteful
  // depth, not a 2021 parallax slam. Disabled under reduced-motion.
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const skyY = useTransform(scrollYProgress, [0, 1], ["0%", reduce ? "0%" : "-12%"]);
  const copyY = useTransform(scrollYProgress, [0, 1], ["0%", reduce ? "0%" : "8%"]);
  const copyOpacity = useTransform(scrollYProgress, [0, 0.7], [1, reduce ? 1 : 0.35]);

  return (
    <section
      ref={ref}
      className="relative flex flex-col overflow-hidden"
      style={{ minHeight: "max(88svh, 600px)" }}
    >
      {/* Decorative sky layer — pointer-events:none so taps always reach the hero
          buttons below (a full-screen WebGL canvas was swallowing taps on touch). */}
      <motion.div style={{ y: skyY }} className="pointer-events-none absolute inset-0">
        <SkyHero />
      </motion.div>
      {/*
        Hero copy in normal flow (flex-end), NOT absolute-bottom — so it can never
        overlap the floating header: the column starts BELOW header height and the
        headline grows downward. pt reserves the header band; mt-auto pins copy low.
      */}
      <motion.div
        style={{ y: copyY, opacity: copyOpacity }}
        className="relative z-10 flex flex-1 flex-col px-6 sm:px-12 lg:px-20 pt-28 sm:pt-32 pb-16 sm:pb-24 pad-safe-b"
      >
        <div className="mt-auto max-w-[26ch] sm:max-w-[30ch]">
          <h1 className="font-thai-serif font-light fs-display leading-[1.04] text-ink tracking-tight">
            <span>{t("hero.title1")} </span>
            <span className="italic text-ink-muted whitespace-nowrap">{t("hero.title2")}</span>
          </h1>
          <p className="font-thai mt-7 max-w-[40ch] fs-lead leading-relaxed text-ink-muted">{t("hero.sub")}</p>
          {/* One confident primary action; everything else is an understated link —
              editorial restraint reads as confidence (a wall of equal buttons reads AI). */}
          <div className="mt-10 flex flex-col gap-5">
            <Link href="/plan" className="font-thai inline-flex h-12 w-fit items-center rounded-full bg-ink px-9 text-paper text-base font-medium transition-colors duration-[var(--dur-base)] ease-[var(--ease-drift)] hover:bg-ink-muted">
              {t("hero.cta.plan")}
            </Link>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-base">
              <Link href="/ai" className="font-thai inline-flex items-center gap-1.5 text-ink-muted hover:text-ink transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-sun" aria-hidden>
                  <path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3Z" /><circle cx="18.5" cy="17.5" r="1.5" /><circle cx="5.5" cy="16" r="1" />
                </svg>
                {en ? "Ask Arnfa AI" : "ถามอ่านฟ้า AI"}
              </Link>
              <Link href="/where" className="font-thai text-ink-muted hover:text-ink transition-colors">{en ? "Where to go?" : "ไปไหนดี?"}</Link>
              <Link href="#how" className="font-thai text-ink-muted hover:text-ink transition-colors">{t("hero.cta.how")}</Link>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
