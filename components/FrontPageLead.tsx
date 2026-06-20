"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { dayVerdict } from "@/lib/core/verdict";
import { SkyChip, skyStateFrom } from "@/components/SkyChip";
import { skyFrom, skyTone } from "@/lib/core/skyTone";
import { AIR_LABEL_TH, AIR_COLOR, type AirLevel } from "@/lib/air/air4thai";
import type { HourlyForecast } from "@/lib/weather/types";
import { useMounted } from "@/lib/useMounted";
import { useLang } from "@/lib/i18n/useLang";

/**
 * FrontPageLead — the broadsheet front page's LEAD article + SKY-BOX, ported from the Arnfa
 * brand book. The newspaper two-column spine: a "Today's Verdict" lead (the REAL dayVerdict)
 * with an editorial body and two CTAs, beside a sky-now box (REAL current Bangkok weather + the
 * next-hours SkyChips + PM2.5). Replaces the old SkyWindow/TodayPick mix so the front page reads
 * as one broadsheet. Iron Rule 0: every number is live; honest skeleton/fallback when it isn't.
 */

const BKK = { lat: 13.7563, lng: 100.5018 };
const hhmm = (iso: string) => { const d = new Date(iso); return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };
const chipState = (f: HourlyForecast) => { const h = new Date(f.hourISO).getHours(); return skyStateFrom({ rainProb: f.rainProb, rainIntensity: f.rainIntensity, cloudCover: f.cloudCover, isNight: h < 6 || h >= 19 }); };

export function FrontPageLead() {
  const { en } = useLang();
  const mounted = useMounted();
  const [hours, setHours] = useState<HourlyForecast[] | null>(null);
  const [air, setAir] = useState<{ pm25: number | null; level: AirLevel } | null>(null);

  useEffect(() => {
    let c = false;
    fetch(`/api/forecast?lat=${BKK.lat}&lng=${BKK.lng}&hours=18`).then((r) => (r.ok ? r.json() : Promise.reject())).then((d) => { if (!c) setHours(d.hours ?? []); }).catch(() => {});
    fetch(`/api/air?lat=${BKK.lat}&lng=${BKK.lng}`).then((r) => (r.ok ? r.json() : Promise.reject())).then((d) => { if (!c) setAir(d); }).catch(() => {});
    return () => { c = true; };
  }, []);

  const data = useMemo(() => {
    if (!hours || !hours.length) return null;
    const now = Date.now();
    let idx = 0, best = Infinity;
    for (let i = 0; i < hours.length; i++) { const dt = Math.abs(new Date(hours[i].hourISO).getTime() - now); if (dt < best) { best = dt; idx = i; } }
    const verdict = dayVerdict(hours, idx);
    const cur = hours[idx];
    const win = hours.slice(idx, idx + 9);
    const laterRain = win.reduce((m, f) => Math.max(m, f.rainProb), 0);
    const chips = [idx + 2, idx + 4, idx + 6].map((i) => hours[i]).filter(Boolean);
    return { verdict, cur, chips, laterRain };
  }, [hours]);

  const updatedAt = mounted ? hhmm(new Date().toISOString()) : "—";
  // the sky-now box gradient breathes with the REAL current sky (not a fixed colour)
  const boxBg = data ? skyTone(skyFrom(data.cur)).box : "linear-gradient(180deg,#C9D6E4,#F1E2CC)";

  return (
    <section className="relative z-10 mx-auto max-w-[1360px] px-4 pb-[clamp(28px,4vw,52px)] sm:px-[clamp(16px,4vw,46px)]">
      <div className="grid items-start gap-[clamp(20px,3vw,42px)] lg:grid-cols-[1.62fr_1px_1fr]">

        {/* LEAD ARTICLE */}
        <article className="af-rise">
          <p className="mb-4 flex items-center gap-2.5 font-display text-[0.72rem] uppercase tracking-[0.26em]" style={{ color: "var(--arnfa-accent-indoor-warm)" }}>
            <span className="af-blink h-[7px] w-[7px] rounded-full" style={{ background: "var(--arnfa-accent-indoor-warm)" }} />
            {en ? "Today's Verdict" : "คำตัดสินประจำวัน"}
          </p>
          <h1 className="font-thai-serif font-light text-ink" style={{ fontSize: "clamp(2.3rem, 1.2rem + 4.6vw, 5rem)", lineHeight: 1.18, letterSpacing: "-0.01em" }}>
            {data ? (en ? data.verdict.headlineEn : data.verdict.headline) : (en ? "Reading the sky…" : "กำลังอ่านฟ้า…")}
          </h1>
          <p className="mt-4 max-w-[36ch] font-thai-serif font-light text-ink-muted" style={{ fontSize: "clamp(1.1rem, 1rem + 0.5vw, 1.45rem)", lineHeight: 1.45 }}>
            {data ? (en ? data.verdict.reasonEn : data.verdict.reason) : (en ? "Pulling Bangkok's real hourly forecast." : "กำลังดึงฟ้าจริงรายชั่วโมงของกรุงเทพฯ")}
          </p>

          <p className="mt-6 border-b border-hairline pb-3.5 font-display text-[0.74rem] tracking-[0.04em] text-ink-faint">
            {en ? "Read by " : "อ่านโดย "}<span className="italic text-ink">Arnfah</span>{en ? " · updated " : " · ปรับล่าสุด "}<span className="tabular-nums">{updatedAt}</span>{en ? " · Bangkok" : " · กรุงเทพมหานคร"}
          </p>

          {/* editorial body — the brand voice (pain-first, verb-first); left-aligned + airy reads
              intentional, not the ragged auto-justify that screams "generated" */}
          <div className="mt-5 text-ink [column-gap:42px] [column-rule:1px_solid_var(--arnfa-hairline)] md:[column-count:2]" style={{ fontSize: "1rem", lineHeight: 1.72 }}>
            <p className="mb-[1em]"><span className="font-display font-semibold tracking-[0.02em]">{en ? "Bangkok —" : "กรุงเทพฯ —"}</span> {en ? "We plan everything well here — except the sky. The monsoon doesn't read calendars; it dumps on the Saturday afternoon you set aside and wrecks the whole day in 20 minutes." : "คนกรุงเก่งเรื่องวางแผนทุกอย่าง ยกเว้นฟ้า. มรสุมที่นี่ไม่อ่านปฏิทิน มันเทลงบ่ายวันเสาร์ที่คุณตั้งใจไว้ แล้วพังทริปทั้งวันใน ๒๐ นาที."}</p>
            <p className="mb-[1em]">{en ? "So Arnfah doesn't say \"60% rain tomorrow\" and leave you guessing. It reads the real hourly sky, matches it to places that suit that weather, and tells you " : "อ่านฟ้าจึงไม่ได้บอก “พรุ่งนี้ฝน ๖๐%” แล้วปล่อยให้คุณเดาต่อ. มันอ่านฟ้าจริงรายชั่วโมง จับคู่กับสถานที่ที่เข้ากับอากาศตอนนั้น แล้วบอกตรงๆ ว่า "}<span className="font-display italic">{en ? "where to go, and when." : "ควรไปไหน ตอนกี่โมง."}</span></p>
            <p className="m-0">{en ? "And if the sky changes mid-trip — it prints a correction at once." : "และถ้าฟ้าเปลี่ยนใจกลางทาง — มันจะพิมพ์ฉบับแก้ให้ทันที."}</p>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/plan" className="inline-flex h-12 items-center rounded-full bg-ink px-7 font-thai text-base text-paper transition-colors hover:bg-ink-muted">
              {en ? "Plan today's trip" : "วางแผนทริปวันนี้"}
            </Link>
            <Link href="/ai" className="inline-flex h-12 items-center rounded-full border border-hairline px-7 font-thai text-base text-ink transition-colors hover:bg-surface">
              {en ? "Ask the sky →" : "ดูว่าฟ้าคิดยังไง →"}
            </Link>
          </div>
        </article>

        {/* column rule */}
        <div className="hidden bg-hairline lg:block" style={{ width: 1, height: "100%" }} />

        {/* SKY BOX — real current Bangkok weather */}
        <aside className="af-rise" style={{ animationDelay: "140ms" }}>
          <div className="overflow-hidden rounded-2xl border" style={{ borderColor: "var(--arnfa-ink)" }}>
            <div className="px-[18px] pb-3.5 pt-[18px] transition-[background] duration-700" style={{ background: boxBg }}>
              <p className="m-0 font-display text-[0.62rem] uppercase tracking-[0.2em] text-ink-muted">{en ? "Bangkok sky now" : "ฟ้ากรุงเทพฯ ตอนนี้"}</p>
              <p className="m-0 mt-1.5 font-thai-serif font-light tabular-nums" style={{ fontSize: "2.6rem", lineHeight: 1 }}>
                {data ? `${Math.round(data.cur.tempC)}°` : "—"}
                {data && <span className="font-thai text-base text-ink-muted"> {en ? "feels" : "รู้สึกเหมือน"} {Math.round(data.cur.apparentTempC)}°</span>}
              </p>
            </div>
            <div className="px-[18px] pb-3.5 pt-1">
              <Row label={en ? "Rain, now → later" : "โอกาสฝน ตอนนี้ → ช่วงหน้า"}>
                {data ? <span className="tabular-nums font-display font-semibold">{Math.round(data.cur.rainProb * 100)}% → <span style={{ color: "var(--arnfa-accent-rain)" }}>{Math.round(data.laterRain * 100)}%</span></span> : "—"}
              </Row>
              <Row label="PM2.5">
                {air && air.pm25 != null ? <span className="tabular-nums font-display font-semibold">{air.pm25} <span className="text-[0.82rem] font-normal" style={{ color: AIR_COLOR[air.level] }}>{AIR_LABEL_TH[air.level]}</span></span> : <span className="text-ink-faint">—</span>}
              </Row>
              <Row label={en ? "Wind" : "ลม"} last>
                {data ? <span className="tabular-nums font-display font-semibold">{Math.round(data.cur.windSpeedKmh)} {en ? "km/h" : "กม./ชม."}</span> : "—"}
              </Row>
              <div className="flex flex-col gap-2 border-t pt-3.5" style={{ borderColor: "var(--arnfa-ink)" }}>
                <span className="font-display text-[0.6rem] uppercase tracking-[0.18em] text-ink-faint">{en ? "Sky in the hours ahead" : "ฟ้าในชั่วโมงข้างหน้า"}</span>
                {data && data.chips.length ? data.chips.map((f) => (
                  <SkyChip key={f.hourISO} state={chipState(f)} arrivalLabel={hhmm(f.hourISO)} tempC={f.tempC} rainProb={f.rainProb} size="sm" />
                )) : <span className="font-thai text-sm text-ink-faint">{en ? "loading…" : "กำลังโหลด…"}</span>}
              </div>
            </div>
          </div>
          <p className="mt-2 px-0.5 text-right font-display text-[0.74rem] italic text-ink-faint">{en ? "Source: Open-Meteo, Air4Thai" : "ที่มา: Open-Meteo, Air4Thai"}</p>
        </aside>
      </div>
    </section>
  );
}

function Row({ label, children, last }: { label: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div className={`flex items-baseline justify-between py-[11px] ${last ? "" : "border-b border-hairline"}`}>
      <span className="text-[0.88rem] text-ink-muted">{label}</span>
      <span>{children}</span>
    </div>
  );
}
