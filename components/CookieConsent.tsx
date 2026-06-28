"use client";

import { useEffect, useState } from "react";
import { useLang } from "@/lib/i18n/useLang";

/**
 * CookieConsent — the mockup's bottom-left notice, honest + functional. We only keep language +
 * the skies you check (localStorage), so one "Got it" (no fake "essentials only" toggle). Hidden
 * once acknowledged. Rendered after mount so it never flashes for returning visitors / breaks SSR.
 */
export function CookieConsent() {
  const { en } = useLang();
  const [show, setShow] = useState(false);

  useEffect(() => {
    try { if (localStorage.getItem("arnfa-cookie-ok") !== "1") setShow(true); } catch { /* no storage */ }
  }, []);

  const accept = () => {
    try { localStorage.setItem("arnfa-cookie-ok", "1"); } catch { /* no storage */ }
    setShow(false);
  };

  if (!show) return null;
  return (
    <div role="dialog" aria-label={en ? "Cookie notice" : "เรื่องคุกกี้"}
      className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-3 z-[62] w-[min(320px,calc(100vw-96px))] rounded-3xl border border-hairline bg-surface p-4 shadow-[0_24px_60px_-30px_rgba(26,31,43,0.5)]">
      <p className="font-thai-serif text-[0.96rem] font-medium text-ink">{en ? "A quick note on cookies" : "เรื่องคุกกี้แป๊บนึง"}</p>
      <p className="mt-1.5 font-thai text-[0.85rem] leading-snug text-ink-muted">
        {en ? "We keep only what's needed — your language and the skies you check. Never sold." : "เราเก็บเท่าที่จำเป็น — ภาษาและฟ้าที่คุณดู ไม่ขายข้อมูลใคร"}
      </p>
      <button type="button" onClick={accept} className="mt-3.5 h-10 w-full rounded-full bg-ink font-thai text-sm font-medium text-paper transition-colors hover:bg-ink-muted">
        {en ? "Got it" : "ตกลง"}
      </button>
    </div>
  );
}
