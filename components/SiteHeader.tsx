"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { LanguageToggle } from "./LanguageToggle";

/** SiteHeader — minimal floating header: brand + language toggle. */
export function SiteHeader() {
  const { t } = useTranslation();
  return (
    <header className="absolute inset-x-0 top-0 z-30">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 sm:px-12">
        <Link href="/" className="font-display text-lg tracking-tight text-ink hover:text-ink-muted transition-colors">{t("brand")}</Link>
        <LanguageToggle />
      </div>
    </header>
  );
}
