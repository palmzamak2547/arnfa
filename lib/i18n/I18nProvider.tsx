"use client";

import i18n from "i18next";
import { initReactI18next, I18nextProvider } from "react-i18next";
import { useEffect, useState } from "react";
import { resources, type Locale } from "./locales";
import { markHydrated } from "./useLang";

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

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [, setReady] = useState(false);

  useEffect(() => {
    // Thai-first: only switch to English if the user EXPLICITLY chose it before.
    // We do NOT auto-pick English from the browser locale — a Thai visitor on an
    // English phone should still see Thai, and this removes the surprise + flash.
    let lng: Locale = "th";
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Locale | null;
      if (saved === "th" || saved === "en") lng = saved;
    } catch { /* localStorage may be unavailable */ }
    if (lng !== i18n.language) i18n.changeLanguage(lng);
    markHydrated();
    setReady(true);
  }, []);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}

export function setLocale(lng: Locale) {
  i18n.changeLanguage(lng);
  try { localStorage.setItem(STORAGE_KEY, lng); } catch { /* ignore */ }
}
