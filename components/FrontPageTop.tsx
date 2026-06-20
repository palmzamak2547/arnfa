"use client";

import { useMounted } from "@/lib/useMounted";
import { useLang } from "@/lib/i18n/useLang";

/**
 * FrontPageTop — the broadsheet front-page header from the Arnfa brand book ("THE ARNFAH
 * ALMANAC"): a folio edition line (with today's REAL Thai Buddhist-calendar date), the centered
 * อ่านฟ้า nameplate with the rising sun-arc over ฟ้า, and the bilingual tagline. Replaces the
 * R3F sky hero on the home with the editorial front page. The date is computed after mount so
 * SSR and the client agree (no hydration mismatch).
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
    <section id="top" className="relative z-10 mx-auto max-w-[1360px] px-4 pt-7 pb-1 sm:px-[clamp(16px,4vw,46px)]">
      {/* folio / edition line */}
      <div className="flex items-center justify-between gap-4 whitespace-nowrap border-y border-hairline py-2 font-display text-[0.6rem] uppercase tracking-[0.2em] text-ink-faint" style={{ borderTopColor: "var(--arnfa-ink)" }}>
        <span>{en ? "Daily sky edition" : "ฉบับฟ้าประจำวัน"}</span>
        <span className="hidden tracking-[0.3em] md:inline">The Arnfah Almanac · หนังสือพิมพ์ฟ้า</span>
        <span className="tabular-nums">{dateStr || "—"} · {en ? "free" : "ฟรี"}</span>
      </div>

      {/* nameplate */}
      <div className="py-[clamp(18px,3.2vw,38px)] text-center">
        <div className="inline-block font-thai-serif font-light leading-[1.04] tracking-tight text-ink" style={{ fontSize: "clamp(3.4rem, 1.6rem + 9.5vw, 9rem)" }}>
          อ่าน<span className="relative">ฟ้า
            <svg viewBox="0 0 40 22" aria-hidden className="arnfa-sunrise absolute overflow-visible" style={{ top: "-0.16em", right: "0.04em", height: "0.28em", width: "0.58em", transformOrigin: "bottom center" }}>
              <path d="M2 20 A18 18 0 0 1 38 20" fill="none" stroke="var(--arnfa-accent-sun)" strokeWidth="3.4" strokeLinecap="round" />
            </svg>
          </span>
        </div>
        <p className="mt-2.5 font-display italic text-ink-muted" style={{ fontSize: "clamp(1rem, 0.9rem + 0.5vw, 1.3rem)" }}>
          {en ? "Arnfah — read Thailand's real sky, and it tells you where to go today" : "Arnfah — อ่านฟ้าจริงของไทย แล้วบอกว่าวันนี้ควรไปไหน"}
        </p>
      </div>
    </section>
  );
}
