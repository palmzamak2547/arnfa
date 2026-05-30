"use client";

import { useEffect } from "react";
import { I18nProvider } from "@/lib/i18n/I18nProvider";

/** ClientShell — wraps app in i18n provider + registers the service worker. */
export function ClientShell({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => { /* best-effort */ });
    }
  }, []);

  return <I18nProvider>{children}</I18nProvider>;
}
