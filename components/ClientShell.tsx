"use client";

import { useEffect } from "react";
import { I18nProvider } from "@/lib/i18n/I18nProvider";
import { BottomNav } from "./BottomNav";

/** ClientShell — wraps app in i18n provider + registers the service worker. */
export function ClientShell({ children, initialLocale }: { children: React.ReactNode; initialLocale: "th" | "en" | "zh" }) {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => { /* best-effort */ });
    }
  }, []);

  return (
    <I18nProvider initialLocale={initialLocale}>
      <div className="flex-1 flex flex-col md:pb-0 pb-[calc(4rem+var(--safe-b))]">
        {children}
      </div>
      <BottomNav />
    </I18nProvider>
  );
}
