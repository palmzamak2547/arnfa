"use client";

import { useState } from "react";
import Link from "next/link";
import { useLang } from "@/lib/i18n/useLang";
import { LanguageToggle } from "./LanguageToggle";
import { AuthButton } from "./AuthButton";
import { LogoMark } from "./Logo";

/**
 * Masthead — the app-wide broadsheet masthead, from the Arnfa brand book ("THE ARNFAH ALMANAC").
 * The sun-cloud-rain mark + อ่านฟ้า (Thai serif) + an italic "Arnfah" Latin tag, an editorial
 * uppercase nav to the app's real surfaces, one primary "วางแผนทริป" CTA, the account widget,
 * and the language toggle. On phones the nav collapses to a hamburger drawer (so all 6 surfaces
 * stay reachable). Shared by EVERY page so the whole app reads as one publication.
 */
const NAV = [
  { href: "/explore", th: "เที่ยว กทม.", en: "Explore" },
  { href: "/where", th: "ไปไหนดี", en: "Where" },
  { href: "/skymap", th: "แผนที่ฟ้า", en: "Sky Map" },
  { href: "/ai", th: "ถาม AI", en: "Ask AI" },
  { href: "/signals", th: "สัญญาณเมือง", en: "Signals" },
  { href: "/data", th: "ที่มาข้อมูล", en: "Sources" },
];

export function Masthead() {
  const { en } = useLang();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-white/40 bg-paper/60 backdrop-blur-xl backdrop-saturate-150 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.7)] pad-safe-t">
      <div className="mx-auto flex max-w-[1360px] items-center justify-between gap-4 px-4 py-2.5 sm:px-[clamp(16px,4vw,46px)]">
        {/* brand lockup */}
        <Link href="/" className="flex flex-none items-center gap-2.5 text-ink transition-colors hover:text-ink-muted" aria-label="อ่านฟ้า Arnfah">
          <LogoMark size={26} />
          <span className="font-thai-serif text-xl font-medium leading-none tracking-tight">อ่านฟ้า</span>
          <span className="hidden font-display text-sm italic text-ink-faint sm:inline">Arnfah</span>
        </Link>

        {/* editorial nav — uppercase, tracked, to the real surfaces (desktop) */}
        <nav className="hidden items-center gap-[clamp(12px,2vw,26px)] md:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href}
              className="font-display text-[0.7rem] uppercase tracking-[0.12em] text-ink-muted transition-colors hover:text-ink">
              {en ? n.en : n.th}
            </Link>
          ))}
        </nav>

        <div className="flex flex-none items-center gap-2 sm:gap-3">
          <div className="hidden sm:block"><AuthButton compact /></div>
          <Link href="/plan" className="inline-flex min-h-[44px] items-center rounded-full bg-ink px-3.5 py-2 font-thai text-sm leading-none text-paper transition-colors hover:bg-ink-muted sm:px-4">
            {en ? "Plan a trip" : "วางแผนทริป"}
          </Link>
          <div className="hidden md:block"><LanguageToggle /></div>
          {/* hamburger — phones only */}
          <button type="button" onClick={() => setOpen((o) => !o)} aria-label={en ? "Menu" : "เมนู"} aria-expanded={open}
            className="flex h-11 w-11 items-center justify-center rounded-full text-ink transition-colors hover:bg-surface md:hidden">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              {open ? <><path d="M6 6l12 12" /><path d="M18 6 6 18" /></> : <><path d="M4 7h16" /><path d="M4 12h16" /><path d="M4 17h16" /></>}
            </svg>
          </button>
        </div>
      </div>

      {/* mobile drawer — keeps all surfaces reachable on phones */}
      {open && (
        <nav className="border-t border-hairline bg-paper/95 backdrop-blur-xl md:hidden">
          <div className="mx-auto flex max-w-[1360px] flex-col px-4 pb-2 sm:px-[clamp(16px,4vw,46px)]">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} onClick={() => setOpen(false)}
                className="flex min-h-[48px] items-center border-b border-hairline font-thai text-[0.95rem] text-ink transition-colors hover:text-ink-muted">
                {en ? n.en : n.th}
              </Link>
            ))}
            <div className="flex items-center gap-3 border-b border-hairline py-3">
              <span className="font-thai text-sm text-ink-faint">{en ? "Language" : "ภาษา"}</span>
              <LanguageToggle />
            </div>
            <div className="py-3 sm:hidden"><AuthButton /></div>
          </div>
        </nav>
      )}
    </header>
  );
}
