"use client";

import Link from "next/link";
import { useLang } from "@/lib/i18n/useLang";
import { LanguageToggle } from "./LanguageToggle";
import { AuthButton } from "./AuthButton";
import { LogoMark } from "./Logo";

/**
 * Masthead — the app-wide broadsheet masthead, from the Arnfa brand book ("THE ARNFAH ALMANAC").
 * The sun-cloud-rain mark + อ่านฟ้า (Thai serif) + an italic "Arnfah" Latin tag, an editorial
 * uppercase nav to the app's real surfaces, one primary "วางแผนทริป" CTA, the account widget,
 * and the language toggle. Shared by EVERY page so the whole app reads as one publication
 * (zero-prop, self-sources language + auth). Sticky, with a paper scrim for legibility.
 */
const NAV = [
  { href: "/explore", th: "เที่ยว กทม.", en: "Explore" },
  { href: "/where", th: "ไปไหนดี", en: "Where" },
  { href: "/ai", th: "ถาม AI", en: "Ask AI" },
  { href: "/signals", th: "สัญญาณเมือง", en: "Signals" },
  { href: "/data", th: "ที่มาข้อมูล", en: "Sources" },
];

export function Masthead() {
  const { en } = useLang();
  return (
    <header className="sticky top-0 z-40 border-b border-hairline bg-paper/85 backdrop-blur-md pad-safe-t">
      <div className="mx-auto flex max-w-[1360px] items-center justify-between gap-4 px-4 py-2.5 sm:px-[clamp(16px,4vw,46px)]">
        {/* brand lockup */}
        <Link href="/" className="flex flex-none items-center gap-2.5 text-ink transition-colors hover:text-ink-muted" aria-label="อ่านฟ้า Arnfah">
          <LogoMark size={26} />
          <span className="font-thai-serif text-xl font-medium leading-none tracking-tight">อ่านฟ้า</span>
          <span className="hidden font-display text-sm italic text-ink-faint sm:inline">Arnfah</span>
        </Link>

        {/* editorial nav — uppercase, tracked, to the real surfaces */}
        <nav className="hidden items-center gap-[clamp(12px,2vw,26px)] md:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href}
              className="font-display text-[0.7rem] uppercase tracking-[0.12em] text-ink-muted transition-colors hover:text-ink">
              {en ? n.en : n.th}
            </Link>
          ))}
        </nav>

        <div className="flex flex-none items-center gap-3">
          <div className="hidden sm:block"><AuthButton compact /></div>
          <Link href="/plan" className="rounded-full bg-ink px-4 py-2 font-thai text-sm leading-none text-paper transition-colors hover:bg-ink-muted">
            {en ? "Plan a trip" : "วางแผนทริป"}
          </Link>
          <LanguageToggle />
        </div>
      </div>
    </header>
  );
}
