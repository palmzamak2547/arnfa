"use client";

import { useEffect, useRef, useState } from "react";
import { clsx } from "clsx";
import { useLang } from "@/lib/i18n/useLang";
import { BrandIcon, BRANDS, type BrandKey } from "./BrandIcon";

/**
 * ShareButton — share this exact plan. The viral loop's trigger.
 *   - mobile: native Web Share sheet (LINE/IG/whatever the OS offers)
 *   - desktop (no navigator.share): a menu of REAL brand logos (LINE/FB/X/WhatsApp,
 *     simple-icons, not emoji) + copy-link.
 * The shared URL carries the area + day, and /plan renders a per-area OG sky card.
 */

const TARGETS: { brand: BrandKey; label: string; href: (url: string, text: string) => string }[] = [
  { brand: "line", label: "LINE", href: (u) => `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(u)}` },
  { brand: "facebook", label: "Facebook", href: (u) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(u)}` },
  { brand: "x", label: "X", href: (u, t) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(t)}&url=${encodeURIComponent(u)}` },
  { brand: "whatsapp", label: "WhatsApp", href: (u, t) => `https://wa.me/?text=${encodeURIComponent(`${t} ${u}`)}` },
];

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
  const { en } = useLang();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const full = url.startsWith("http") ? url : typeof window !== "undefined" ? window.location.origin + url : url;

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  async function onMain() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try { await navigator.share({ title, text, url: full }); return; } catch { /* cancelled → show menu */ }
    }
    setOpen((o) => !o);
  }

  async function copy() {
    try { await navigator.clipboard.writeText(full); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* blocked */ }
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative inline-block">
      <button type="button" onClick={onMain}
        className={clsx("font-thai inline-flex items-center gap-2 rounded-full border border-hairline px-5 text-sm font-medium text-ink transition-colors duration-[var(--dur-base)] hover:bg-surface min-h-[44px]", className)}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
          <line x1="8.6" y1="13.5" x2="15.4" y2="17.5" /><line x1="15.4" y1="6.5" x2="8.6" y2="10.5" />
        </svg>
        {copied ? (en ? "Link copied" : "คัดลอกลิงก์แล้ว") : (en ? "Share this plan" : "แชร์แพลนนี้")}
      </button>

      {open && (
        <div className="absolute left-0 z-20 mt-2 w-60 rounded-2xl border border-hairline bg-paper p-2 shadow-lg">
          {TARGETS.map((t) => (
            <a key={t.brand} href={t.href(full, text)} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-ink transition-colors hover:bg-surface">
              <span style={{ color: BRANDS[t.brand].hex }} className="flex shrink-0"><BrandIcon brand={t.brand} size={18} /></span>
              <span className="font-thai">{en ? `Share to ${t.label}` : `แชร์ไป ${t.label}`}</span>
            </a>
          ))}
          <button type="button" onClick={copy} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-ink transition-colors hover:bg-surface">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0">
              <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.5 1.5" /><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.5-1.5" />
            </svg>
            <span className="font-thai">{copied ? (en ? "Copied" : "คัดลอกแล้ว") : (en ? "Copy link" : "คัดลอกลิงก์")}</span>
          </button>
        </div>
      )}
    </div>
  );
}
