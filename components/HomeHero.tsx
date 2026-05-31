"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { SkyHero } from "./SkyHero";
import { MagneticButton } from "./motion/MagneticButton";

/** HomeHero — R3F sky + translatable editorial overlay. */
export function HomeHero() {
  const { t } = useTranslation();
  return (
    <section
      className="relative flex flex-col overflow-hidden"
      style={{ minHeight: "max(88svh, 600px)" }}
    >
      <SkyHero />
      {/*
        Hero copy in normal flow (flex-end), NOT absolute-bottom — so it can never
        overlap the floating header: the column starts BELOW header height and the
        headline grows downward. pt reserves the header band; mt-auto pins copy low.
      */}
      <div className="relative z-10 flex flex-1 flex-col px-6 sm:px-12 lg:px-20 pt-28 sm:pt-32 pb-16 sm:pb-24 pad-safe-b">
        <div className="mt-auto max-w-[26ch] sm:max-w-[30ch]">
          <h1 className="font-thai-serif font-light fs-display leading-[1.04] text-ink tracking-tight">
            <span>{t("hero.title1")} </span>
            <span className="italic text-ink-muted whitespace-nowrap">{t("hero.title2")}</span>
          </h1>
          <p className="font-thai mt-7 max-w-[40ch] fs-lead leading-relaxed text-ink-muted">{t("hero.sub")}</p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link href="/plan" className="font-thai inline-flex h-12 items-center rounded-full bg-ink px-8 text-paper text-base font-medium transition-colors duration-[var(--dur-base)] ease-[var(--ease-drift)] hover:bg-ink-muted">
              {t("hero.cta.plan")}
            </Link>
            <Link href="#how" className="font-thai inline-flex h-12 items-center rounded-full border border-hairline px-8 text-ink text-base font-medium transition-colors duration-[var(--dur-base)] ease-[var(--ease-drift)] hover:bg-surface">
              {t("hero.cta.how")}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
