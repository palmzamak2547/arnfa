"use client";

import Link from "next/link";
import { useMounted } from "@/lib/useMounted";
import { useLang } from "@/lib/i18n/useLang";

/**
 * FrontPageTop — the broadsheet hero, faithful to the redesign mockup: the folio/edition line
 * (with today's REAL Thai Buddhist date), a tracked eyebrow, the centered อ่านฟ้า nameplate with
 * the rising sun-arc, the italic tagline, and the two CTAs (Plan today / How it reads the sky).
 * Sits over the live Bangkok HeroVideo. The date is computed after mount so SSR/client agree.
 */

const TH_DIGITS = "๐๑๒๓๔๕๖๗๘๙";
const toThai = (n: number | string) => String(n).replace(/\d/g, (d) => TH_DIGITS[+d]);
const TH_DOW = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];
const TH_MONTH = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
const EN_DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const EN_MONTH = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function thaiDate(d: Date) {
  return `วัน${TH_DOW[d.getDay()]}ที่ ${toThai(d.getDate())} ${TH_MONTH[d.getMonth()]} ${toThai(d.getFullYear() + 543)}`;
}
function enDate(d: Date) {
  return `${EN_DOW[d.getDay()]} ${d.getDate()} ${EN_MONTH[d.getMonth()]} ${d.getFullYear()}`;
}

export function FrontPageTop() {
  const mounted = useMounted();
  const { en } = useLang();
  const now = mounted ? new Date() : null;
  const dateStr = now ? (en ? enDate(now) : thaiDate(now)) : "";

  return (
    <section id="top" className="relative z-10 mx-auto max-w-[1360px] px-4 pt-[clamp(8px,3vh,30px)] pb-1 sm:px-[clamp(16px,4vw,46px)]">
      {/* folio / edition line */}
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 border-y border-hairline border-t-ink py-2 font-display text-[0.6rem] uppercase tracking-[0.12em] text-ink-muted [text-shadow:0_1px_10px_rgba(244,239,230,0.85)] sm:justify-between sm:tracking-[0.2em]">
        <span className="hidden sm:inline">{en ? "Daily sky edition" : "ฉบับฟ้าประจำวัน"}</span>
        <span className="hidden tracking-[0.3em] md:inline">{en ? "The Arnfah Almanac" : "The Arnfah Almanac — หนังสือพิมพ์ฟ้า"}</span>
        <span className="tabular-nums">{dateStr || "—"} — {en ? "free" : "ฟรี"}</span>
      </div>

      {/* nameplate block — sits over the live Bangkok hero footage */}
      <div className="pt-[clamp(24px,7vh,88px)] pb-[clamp(18px,3.2vw,40px)] text-center">
        <p className="mb-[clamp(6px,1.4vw,14px)] font-display text-[0.74rem] uppercase tracking-[0.32em] text-ink-muted [text-shadow:0_1px_12px_rgba(244,239,230,0.9)]">
          {en ? "Bangkok & all of Thailand" : "กรุงเทพฯ และทั่วไทย"}
        </p>

        <div className="af-nameglow inline-block font-thai-serif font-light leading-[1.04] tracking-tight text-ink" style={{ fontSize: "clamp(3.4rem, 1.6rem + 9.5vw, 9rem)" }}>
          อ่าน<span className="relative">ฟ้า
            <svg viewBox="0 0 40 22" aria-hidden className="af-arc absolute overflow-visible" style={{ top: "-0.16em", right: "0.04em", height: "0.28em", width: "0.58em" }}>
              <path d="M2 20 A18 18 0 0 1 38 20" fill="none" stroke="var(--arnfa-accent-sun)" strokeWidth="3.4" strokeLinecap="round" />
            </svg>
          </span>
        </div>

        <p className="mx-auto mt-[clamp(12px,2vw,22px)] max-w-[30ch] font-display italic leading-snug text-ink-muted [text-shadow:0_1px_12px_rgba(244,239,230,0.7)]" style={{ fontSize: "clamp(1.05rem, 0.9rem + 0.7vw, 1.5rem)" }}>
          {en ? "Read Thailand's real sky — and it tells you where to go today." : "อ่านฟ้าจริงของไทย — แล้วมันบอกว่าวันนี้ควรไปไหน"}
        </p>

        <div className="mt-[clamp(20px,2.6vw,30px)] flex flex-wrap justify-center gap-3">
          <Link href="/plan"
            className="inline-flex h-[50px] items-center rounded-full bg-ink px-7 font-thai font-medium text-paper shadow-sm transition-[transform,background] duration-[var(--dur-base)] ease-[var(--ease-drift)] hover:-translate-y-px hover:bg-ink-muted">
            {en ? "Plan today's trip" : "วางแผนทริปวันนี้"}
          </Link>
          <a href="#how"
            className="inline-flex h-[50px] items-center rounded-full border border-hairline bg-white/50 px-6 font-thai text-ink backdrop-blur-sm transition-colors duration-[var(--dur-base)] ease-[var(--ease-drift)] hover:bg-white/90">
            {en ? "How it reads the sky →" : "มันอ่านฟ้ายังไง →"}
          </a>
        </div>

        {/* the mockup's playful pill — repurposed as a real doorway to the live nationwide sky map */}
        <div className="mt-3.5 flex justify-center">
          <Link href="/skymap"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-hairline bg-white/40 px-4 font-display text-[0.68rem] uppercase tracking-[0.16em] text-ink-muted backdrop-blur-sm transition-colors hover:bg-white/80">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--arnfa-accent-sun)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="af-spin" aria-hidden>
              <path d="M21 12 a9 9 0 1 1 -2.64 -6.36" /><path d="M21 4 v4 h-4" />
            </svg>
            {en ? "explore the live sky map" : "ดูแผนที่ฟ้าทั้งไทย"}
          </Link>
        </div>
      </div>
    </section>
  );
}
