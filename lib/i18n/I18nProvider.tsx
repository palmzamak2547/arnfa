"use client";

import i18n from "i18next";
import { initReactI18next, I18nextProvider } from "react-i18next";
import { useEffect, useState } from "react";
import { resources, type Locale } from "./locales";
import { markHydrated, LocaleContext } from "./useLang";

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources,
    lng: "th",
    fallbackLng: "th",
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });
}

const STORAGE_KEY = "arnfa.locale";

export function I18nProvider({ children, initialLocale = "th" }: { children: React.ReactNode; initialLocale?: Locale }) {
  const [, setReady] = useState(false);

  useEffect(() => {
    // The server already rendered in `initialLocale` (the cookie). Confirm the live
    // language matches — prefer an explicit localStorage choice, else the cookie.
    // Thai-first: we never auto-pick English from the browser locale.
    let lng: Locale = initialLocale;
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Locale | null;
      if (saved === "th" || saved === "en" || saved === "zh") lng = saved;
    } catch { /* localStorage may be unavailable */ }
    if (lng !== i18n.language) i18n.changeLanguage(lng);
    markHydrated(); // AFTER changeLanguage, so the hydrated read sees the right language
    setReady(true);
  }, [initialLocale]);

  return (
    <LocaleContext.Provider value={initialLocale}>
      <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
    </LocaleContext.Provider>
  );
}

export function setLocale(lng: Locale) {
  i18n.changeLanguage(lng);
  try { localStorage.setItem(STORAGE_KEY, lng); } catch { /* ignore */ }
  // Cookie so the SERVER can render this language on the next load (flash-free).
  try { document.cookie = `${STORAGE_KEY}=${lng}; path=/; max-age=31536000; samesite=lax`; } catch { /* ignore */ }
}
