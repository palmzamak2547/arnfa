"use client";

import Link from "next/link";
import { useLang } from "@/lib/i18n/useLang";

/**
 * VenuesStrip — the mockup's "For venues" strip. Links to the real /partner intake
 * (MerchantCTA → arnfa.merchant_lead). Honest: no fake deals, no fake partner counts.
 */
export function VenuesStrip() {
  const { en } = useLang();
  return (
    <section className="relative z-10 mx-auto max-w-[1360px] px-4 py-[clamp(20px,3vw,36px)] sm:px-[clamp(16px,4vw,46px)]">
      <div className="flex flex-col items-start justify-between gap-5 border-y border-hairline py-[clamp(26px,4vw,44px)] md:flex-row md:items-center">
        <div className="max-w-[54ch]">
          <p className="mb-2 font-display text-[0.72rem] uppercase tracking-[0.24em] text-indoor-warm">{en ? "For venues" : "สำหรับร้านค้า"}</p>
          <h2 className="font-thai-serif font-light leading-tight tracking-tight text-ink" style={{ fontSize: "clamp(1.6rem,1.1rem + 1.8vw,2.5rem)" }}>
            {en ? (<>Run a place that&apos;s <em className="not-italic text-indoor-warm">better in the rain?</em></>) : (<>มีร้านที่ <em className="not-italic text-indoor-warm">ดีขึ้นเมื่อฝนตก</em> ไหม?</>)}
          </h2>
          <p className="mt-3 font-thai leading-relaxed text-ink-muted">
            {en ? "Tell Arnfah your weather profile — and get named to people nearby the moment the sky turns your way." : "บอกโปรไฟล์อากาศของร้านให้อ่านฟ้า — แล้วได้ถูกแนะนำกับคนใกล้ ๆ ทันทีที่ฟ้าเข้าทางคุณ"}
          </p>
        </div>
        <Link href="/partner" className="inline-flex h-12 flex-none items-center rounded-full border border-ink px-7 font-thai font-medium text-ink transition-colors duration-[var(--dur-base)] ease-[var(--ease-drift)] hover:bg-ink hover:text-paper">
          {en ? "List your venue →" : "ลงร้านของคุณ →"}
        </Link>
      </div>
    </section>
  );
}
