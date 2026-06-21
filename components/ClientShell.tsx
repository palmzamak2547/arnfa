"use client";

import { useEffect } from "react";
import { I18nProvider } from "@/lib/i18n/I18nProvider";

/** ClientShell — wraps app in i18n provider + registers the service worker. */
export function ClientShell({ children, initialLocale }: { children: React.ReactNode; initialLocale: "th" | "en" | "zh" }) {
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => { /* best-effort */ });
    }
  }, []);

  return <I18nProvider initialLocale={initialLocale}>{children}</I18nProvider>;
}
