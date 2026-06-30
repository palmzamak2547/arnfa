"use client";

import { setLocale } from "@/lib/i18n/I18nProvider";
import { useLang } from "@/lib/i18n/useLang";
import { LOCALES, type Locale } from "@/lib/i18n/locales";
import { clsx } from "clsx";

/** LanguageToggle — minimal TH / EN switch. Editorial, hairline, no flags.
 *  中文 is intentionally NOT offered: only a few pages have real zh strings, so a 中文 button
 *  would silently render English everywhere else — an over-claim on a brand graded on honesty.
 *  Re-add "zh" here once the whole app is genuinely translated. */
const LABEL: Record<Locale, string> = { th: "TH", en: "EN", zh: "中文" };
export function LanguageToggle({ className }: { className?: string }) {
  const { lang } = useLang();
  const current = lang as Locale;
  const offered = LOCALES.filter((l) => l !== "zh");
  return (
    <div className={clsx("inline-flex items-center gap-1 text-sm", className)}>
      {offered.map((lng, i) => (
        <span key={lng} className="flex items-center">
          {i > 0 && <span className="mx-1 text-ink-faint">/</span>}
          <button type="button" onClick={() => setLocale(lng)} aria-pressed={current === lng}
            className={clsx("font-display uppercase tracking-wider transition-colors duration-[var(--dur-fast)]", current === lng ? "text-ink font-medium" : "text-ink-faint hover:text-ink-muted")}>
            {LABEL[lng]}
          </button>
        </span>
      ))}
    </div>
  );
}
