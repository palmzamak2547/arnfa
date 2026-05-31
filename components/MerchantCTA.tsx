"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { submitMerchantLead } from "@/lib/deals/deals";

/**
 * MerchantCTA — the honest monetization seed. Shops can register interest in
 * listing a weather-triggered deal (e.g. a rainy-afternoon promo). We capture the
 * lead only; we never invent a deal. Real listings then appear as a chip on the
 * relevant stop. Write-only intake (arnfa.merchant_lead).
 */
export function MerchantCTA() {
  const { i18n } = useTranslation();
  const en = i18n.language === "en";
  const [open, setOpen] = useState(false);
  const [place, setPlace] = useState("");
  const [contact, setContact] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");

  async function send() {
    if (!place.trim() || !contact.trim()) return;
    setState("sending");
    const ok = await submitMerchantLead(place.trim(), contact.trim());
    setState(ok ? "done" : "error");
  }

  if (state === "done") {
    return (
      <p className="font-thai text-sm text-success">
        {en ? "Thanks — we'll reach out about listing your weather deals." : "ขอบคุณครับ เดี๋ยวเราติดต่อกลับเรื่องลงดีลตามอากาศ"}
      </p>
    );
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="font-thai text-sm text-rain hover:underline">
        {en ? "Run a shop nearby? List a weather deal →" : "มีร้านแถวนี้? ลงดีลตามอากาศกับเรา →"}
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-hairline bg-surface/70 p-4 max-w-md">
      <p className="font-thai text-sm text-ink-muted mb-3">
        {en ? "Tell us your shop — we'll set up weather-triggered deals (e.g. a rainy-afternoon promo). No fake deals ever; only real ones show." : "บอกชื่อร้าน เดี๋ยวเราช่วยตั้งดีลตามอากาศให้ (เช่น โปรบ่ายฝนตก) — เราไม่ขึ้นดีลปลอม โชว์เฉพาะของจริง"}
      </p>
      <div className="flex flex-col gap-2">
        <input value={place} onChange={(e) => setPlace(e.target.value)} placeholder={en ? "Shop name" : "ชื่อร้าน"}
          className="font-thai h-11 rounded-xl border border-hairline bg-paper px-3 text-sm text-ink outline-none focus:border-rain/50" />
        <input value={contact} onChange={(e) => setContact(e.target.value)} placeholder={en ? "Line / phone / email" : "Line / เบอร์ / อีเมล"}
          className="font-thai h-11 rounded-xl border border-hairline bg-paper px-3 text-sm text-ink outline-none focus:border-rain/50" />
        <div className="flex items-center gap-3">
          <button type="button" onClick={send} disabled={state === "sending" || !place.trim() || !contact.trim()}
            className="font-thai inline-flex h-11 items-center rounded-full bg-ink px-5 text-sm text-paper transition-colors hover:bg-ink-muted disabled:opacity-50">
            {state === "sending" ? (en ? "Sending…" : "กำลังส่ง…") : (en ? "Send" : "ส่ง")}
          </button>
          {state === "error" && <span className="font-thai text-xs text-indoor-warm">{en ? "Didn't send — try again." : "ส่งไม่สำเร็จ ลองใหม่"}</span>}
        </div>
      </div>
    </div>
  );
}
