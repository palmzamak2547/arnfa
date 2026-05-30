"use client";

import { useTranslation } from "react-i18next";
import { setLocale } from "@/lib/i18n/I18nProvider";
import { LOCALES, type Locale } from "@/lib/i18n/locales";
import { clsx } from "clsx";

/** LanguageToggle — minimal TH/EN switch. Editorial, hairline, no flags. */
export function LanguageToggle({ className }: { className?: string }) {
  const { i18n } = useTranslation();
  const current = (i18n.language as Locale) ?? "th";
  return (
    <div className={clsx("inline-flex items-center gap-1 text-sm", className)}>
      {LOCALES.map((lng, i) => (
        <span key={lng} className="flex items-center">
          {i > 0 && <span className="mx-1 text-ink-faint">/</span>}
          <button type="button" onClick={() => setLocale(lng)} aria-pressed={current === lng}
            className={clsx("font-display uppercase tracking-wider transition-colors duration-[var(--dur-fast)]", current === lng ? "text-ink font-medium" : "text-ink-faint hover:text-ink-muted")}>
            {lng}
          </button>
        </span>
      ))}
    </div>
  );
}
