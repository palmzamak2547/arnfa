"use client";

import Link from "next/link";
import { useLang } from "@/lib/i18n/useLang";
import { Logo } from "@/components/Logo";

/** SiteFooter — the home's foot credits. Client so it follows the TH/EN toggle (the
 *  server-rendered version stayed Thai when EN was selected). */
export function SiteFooter() {
  const { en } = useLang();
  return (
    <footer className="relative z-10 arnfa-grid section-minor border-t border-hairline pad-safe-b">
      <div className="col-content flex flex-col items-start justify-between gap-4 text-sm text-ink-faint sm:flex-row">
        <div className="flex flex-col gap-2">
          <Logo className="text-lg" animate={false} />
          <div className="flex gap-4">
            <Link href="/explore" className="font-thai transition-colors hover:text-ink">{en ? "Explore" : "เที่ยว กทม."}</Link>
            <Link href="/plan" className="font-thai transition-colors hover:text-ink">{en ? "Plan a trip" : "วางแผนทริป"}</Link>
            <Link href="/signals" className="font-thai transition-colors hover:text-ink">{en ? "City signals" : "สัญญาณเมือง"}</Link>
            <Link href="/trips" className="font-thai transition-colors hover:text-ink">{en ? "My trips" : "ทริปของฉัน"}</Link>
            <Link href="/data" className="font-thai transition-colors hover:text-ink">{en ? "Sources" : "ที่มาข้อมูล"}</Link>
            <Link href="/status" className="font-thai transition-colors hover:text-ink">{en ? "Status" : "สถานะระบบ"}</Link>
          </div>
        </div>
        <p className="max-w-md font-thai sm:text-right">
          {en
            ? "Open data from Open-Meteo, MET Norway, OpenStreetMap, OpenFreeMap, RainViewer and Air4Thai (Thai PCD) — made for Thailand"
            : "ข้อมูลเปิดจาก Open-Meteo, MET Norway, OpenStreetMap, OpenFreeMap, RainViewer, และ Air4Thai (กรมควบคุมมลพิษ) — ทำเพื่อคนไทย"}
        </p>
      </div>
    </footer>
  );
}
