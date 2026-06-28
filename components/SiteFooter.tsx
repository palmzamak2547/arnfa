"use client";

import Link from "next/link";
import { useLang } from "@/lib/i18n/useLang";
import { Logo } from "@/components/Logo";

/** SiteFooter — grouped broadsheet foot credits (Explore / Decide / More) + the "0 fabricated
 *  numbers" trust line. Client so it follows the TH/EN toggle. Shared app-wide. */
const GROUPS = [
  {
    th: "สำรวจ", en: "Explore",
    links: [
      { href: "/explore", th: "เที่ยว กทม.", en: "Explore Bangkok" },
      { href: "/where", th: "ไปไหนดี", en: "Where to go" },
      { href: "/skymap", th: "แผนที่ฟ้า", en: "Sky Map" },
      { href: "/ai", th: "ถามอ่านฟ้า AI", en: "Ask Arnfah AI" },
    ],
  },
  {
    th: "ตัดสินใจ", en: "Decide",
    links: [
      { href: "/plan", th: "วางแผนทริป", en: "Plan a trip" },
      { href: "/signals", th: "สัญญาณเมือง", en: "City signals" },
      { href: "/trips", th: "ทริปของฉัน", en: "My trips" },
    ],
  },
  {
    th: "เพิ่มเติม", en: "More",
    links: [
      { href: "/data", th: "ที่มาข้อมูล", en: "Sources" },
      { href: "/status", th: "สถานะระบบ", en: "Status" },
      { href: "/partner", th: "สำหรับร้านค้า", en: "For venues" },
    ],
  },
] as const;

export function SiteFooter() {
  const { en } = useLang();
  return (
    <footer className="relative z-10 arnfa-grid section-minor border-t border-hairline pad-safe-b">
      <div className="col-content">
        <div className="flex flex-col gap-10 md:flex-row md:justify-between">
          <div className="flex max-w-xs flex-col gap-3">
            <Logo className="text-lg" animate={false} />
            <p className="font-thai text-sm text-ink-muted">
              {en ? "Tell it the sky, get a trip the rain can't ruin." : "บอกฟ้า แล้วได้ทริปที่ฝนพังไม่ได้"}
            </p>
            <p className="inline-flex w-fit items-baseline gap-1.5 font-thai text-xs text-ink-faint">
              <span className="font-thai-serif text-base leading-none text-sun">0</span>
              {en ? "fabricated numbers — every figure is sourced" : "ตัวเลขที่กุขึ้น — ทุกตัวเลขมีที่มา"}
            </p>
          </div>

          <nav className="grid grid-cols-3 gap-x-8 gap-y-2 sm:gap-x-14">
            {GROUPS.map((g) => (
              <div key={g.en} className="flex flex-col gap-2">
                <p className="font-display text-[0.66rem] uppercase tracking-[0.18em] text-ink-faint">{en ? g.en : g.th}</p>
                {g.links.map((l) => (
                  <Link key={l.href} href={l.href} className="font-thai text-sm text-ink-muted transition-colors hover:text-ink">
                    {en ? l.en : l.th}
                  </Link>
                ))}
              </div>
            ))}
          </nav>
        </div>

        <div className="mt-8 flex flex-col gap-2 border-t border-hairline pt-5 sm:flex-row sm:items-baseline sm:justify-between">
          <p className="max-w-xl font-thai text-xs text-ink-faint">
            {en
              ? "Open data from Open-Meteo, MET Norway, OpenStreetMap, OpenFreeMap, RainViewer and Air4Thai (Thai PCD) — made for Thailand."
              : "ข้อมูลเปิดจาก Open-Meteo, MET Norway, OpenStreetMap, OpenFreeMap, RainViewer และ Air4Thai (กรมควบคุมมลพิษ) — ทำเพื่อคนไทย"}
          </p>
          <p className="whitespace-nowrap font-thai text-xs tabular-nums text-ink-faint">© 2026 Arnfah</p>
        </div>
      </div>
    </footer>
  );
}
