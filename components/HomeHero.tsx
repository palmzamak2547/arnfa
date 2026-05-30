"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { SkyHero } from "./SkyHero";

/** HomeHero — R3F sky + translatable editorial overlay. */
export function HomeHero() {
  const { t } = useTranslation();
  return (
    <section className="relative h-[88vh] min-h-[640px] overflow-hidden">
      <SkyHero />
      <div className="absolute inset-x-0 bottom-0 px-6 sm:px-12 lg:px-20 pb-16 sm:pb-24">
        <div className="max-w-4xl">
          <p className="font-thai text-sm tracking-[0.2em] uppercase text-ink-muted mb-4">{t("hero.kicker")}</p>
          <h1 className="font-thai-serif font-light text-5xl sm:text-7xl lg:text-8xl leading-[0.98] text-ink tracking-tight">
            <span>{t("hero.title1")}</span>
            <br />
            <span className="italic text-ink-muted">{t("hero.title2")}</span>
          </h1>
          <p className="font-thai mt-8 max-w-xl text-lg sm:text-xl leading-relaxed text-ink-muted">{t("hero.sub")}</p>
          <div className="mt-12 flex flex-wrap gap-4">
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
