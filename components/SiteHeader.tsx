"use client";

import Link from "next/link";
import { LanguageToggle } from "./LanguageToggle";
import { Logo } from "./Logo";

/** SiteHeader — minimal floating header: logo wordmark + language toggle. */
export function SiteHeader() {
  return (
    <header className="absolute inset-x-0 top-0 z-30">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 sm:px-12">
        <Link href="/" className="text-ink hover:text-ink-muted transition-colors">
          <Logo className="text-2xl" />
        </Link>
        <LanguageToggle />
      </div>
    </header>
  );
}
