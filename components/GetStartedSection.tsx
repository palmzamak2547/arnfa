"use client";

import Link from "next/link";
import { useLang } from "@/lib/i18n/useLang";

/**
 * GetStartedSection — the full-bleed pre-footer CTA panel from the redesign. HONEST version:
 * Arnfah is a free web app (no native App Store / Play / LINE OA exists yet), so the CTAs point
 * at the REAL surfaces — Plan a day and Ask Arnfah AI, in the browser, no account. One filled
 * accent CTA + one ghost (teardown #4). The accent (#D9534A) marks the primary action only.
 */
export function GetStartedSection() {
  const { en } = useLang();
  return (
    <section className="relative z-10 mx-auto max-w-[1360px] px-4 py-[clamp(36px,5vw,64px)] sm:px-[clamp(16px,4vw,46px)]">
      <div
        className="relative overflow-hidden rounded-[2rem] border border-hairline shadow-[0_24px_60px_-34px_rgba(26,31,43,0.42)]"
        style={{ background: "linear-gradient(160deg,#D7E0EA 0%,#EBDFC9 52%,#F6EAD6 100%)" }}
      >
        {/* soft sun-glow + drifting cloud, purely decorative */}
        <div
          aria-hidden
          className="af-glow pointer-events-none absolute right-[-6%] top-[-18%] h-[min(40vw,340px)] w-[min(40vw,340px)] rounded-full"
          style={{ background: "radial-gradient(circle,rgba(242,166,90,0.5),transparent 66%)", filter: "blur(8px)" }}
        />
        <div className="relative z-10 max-w-[640px] p-[clamp(28px,5vw,60px)]">
          <p className="mb-3 font-display text-[0.72rem] uppercase tracking-[0.24em] text-ink-muted">
            {en ? "Carry the sky in your pocket" : "พกฟ้าไว้ในกระเป๋า"}
          </p>
          <h2 className="font-thai-serif font-light leading-[1.08] tracking-tight text-ink" style={{ fontSize: "clamp(2rem, 1.2rem + 3vw, 3.4rem)" }}>
            {en ? "Tomorrow's plan, before the rain decides." : "วางแผนพรุ่งนี้ ก่อนฝนจะตัดสินใจ"}
          </h2>
          <p className="mt-4 max-w-[46ch] font-thai leading-relaxed text-ink-muted">
            {en
              ? "No app to install, no account needed — open it in your browser and Arnfah reads the real sky for wherever you're headed. A new call lands the moment the sky changes its mind."
              : "ไม่ต้องโหลดแอป ไม่ต้องสมัคร — เปิดในเบราว์เซอร์ แล้วอ่านฟ้าจะอ่านฟ้าจริงให้ว่าควรไปไหน คำตัดสินใหม่มาถึงทันทีที่ฟ้าเปลี่ยนใจ"}
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link
              href="/plan"
              className="inline-flex h-[52px] items-center gap-2 rounded-full bg-indoor-warm px-6 font-thai font-semibold text-white shadow-[0_8px_22px_-10px_rgba(217,83,74,0.8)] transition-[transform,background] duration-[var(--dur-base)] ease-[var(--ease-drift)] hover:-translate-y-px hover:bg-[#c8463d]"
            >
              {en ? "Plan today" : "วางแผนวันนี้"}
              <span aria-hidden>→</span>
            </Link>
            <Link
              href="/ai"
              className="inline-flex h-[52px] items-center rounded-full border border-ink px-5 font-thai font-medium text-ink transition-colors duration-[var(--dur-base)] ease-[var(--ease-drift)] hover:bg-ink hover:text-paper"
            >
              {en ? "Ask Arnfah AI" : "ถามอ่านฟ้า AI"}
            </Link>
          </div>
          <p className="mt-4 font-thai text-xs text-ink-faint">
            {en ? "Free, forever — TH / EN / 中文" : "ฟรีตลอด — ไทย / อังกฤษ / 中文"}
          </p>
        </div>
      </div>
    </section>
  );
}
