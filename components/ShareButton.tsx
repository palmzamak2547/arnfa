"use client";

import { useState } from "react";
import { clsx } from "clsx";

/**
 * ShareButton — share this exact plan. Web Share API on mobile (native sheet to
 * LINE/IG/etc.), clipboard-copy fallback on desktop. The viral loop's trigger.
 */
export function ShareButton({
  url,
  title = "ทริปของฉันจาก อ่านฟ้า",
  text = "วันนี้ฟ้าเป็นแบบนี้ — นี่คือแพลนที่อ่านฟ้าจัดให้",
  className,
}: {
  url: string;
  title?: string;
  text?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function onShare() {
    const full = url.startsWith("http") ? url : (typeof window !== "undefined" ? window.location.origin + url : url);
    // Native share sheet where available (mobile)
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, text, url: full });
        return;
      } catch {
        /* user cancelled or unsupported → fall through to copy */
      }
    }
    try {
      await navigator.clipboard.writeText(full);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked — last resort: do nothing visible */
    }
  }

  return (
    <button
      type="button"
      onClick={onShare}
      className={clsx(
        "font-thai inline-flex items-center gap-2 rounded-full border border-hairline px-5 text-sm font-medium text-ink transition-colors duration-[var(--dur-base)] hover:bg-surface min-h-[44px]",
        className,
      )}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
        <line x1="8.6" y1="13.5" x2="15.4" y2="17.5" /><line x1="15.4" y1="6.5" x2="8.6" y2="10.5" />
      </svg>
      {copied ? "คัดลอกลิงก์แล้ว" : "แชร์แพลนนี้"}
    </button>
  );
}
