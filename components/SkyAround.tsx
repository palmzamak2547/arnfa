"use client";

import { useState } from "react";
import { useLang } from "@/lib/i18n/useLang";
import { nearestDistricts } from "@/lib/poi/districts";
import { skyScoreNow, skyVerdict, SKY_VERDICT_TH, SKY_VERDICT_EN, worthMoving, type SkyVerdict } from "@/lib/core/skyScore";

/**
 * SkyAround — microclimate compare. On demand (one tap), reads the REAL current
 * sky for the few nearest districts and shows where it's best to be right now.
 * Bangkok's sky genuinely differs across a few km — if a neighbour is clearly
 * better we offer to move the plan there. District-level + honest (real forecast
 * per centroid); no street-level claims, no fabrication.
 */

type Row = { key: string; th: string; en: string; km: number; score: number; verdict: SkyVerdict };

const DOT: Record<SkyVerdict, string> = {
  clearish: "var(--arnfa-success)", ok: "var(--arnfa-accent-sun)",
  closing: "var(--arnfa-accent-rain)", poor: "var(--arnfa-accent-indoor-warm)",
};

export function SkyAround({ currentKey, lat, lng, onPick }: { currentKey: string; lat: number; lng: number; onPick: (key: string) => void }) {
  const { en } = useLang();
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [rows, setRows] = useState<Row[]>([]);

  async function look() {
    setStatus("loading");
    const cands = nearestDistricts(lat, lng, 6);
    const results = await Promise.all(
      cands.map(async (d) => {
        try {
          const r = await fetch(`/api/forecast?lat=${d.lat}&lng=${d.lng}&hours=2`);
          if (!r.ok) return null;
          const data = await r.json();
          const now = data.hours?.[0];
          if (!now) return null;
          const score = skyScoreNow(now);
          return { key: d.key, th: d.th, en: d.en, km: d.km, score, verdict: skyVerdict(score) } as Row;
        } catch { return null; }
      }),
    );
    const clean = results.filter((r): r is Row => !!r).sort((a, b) => b.score - a.score);
    setRows(clean);
    setStatus(clean.length ? "done" : "error");
  }

  const here = rows.find((r) => r.key === currentKey);
  const best = rows[0];
  const suggestMove = !!(here && best && best.key !== currentKey && worthMoving(here.score, best.score));

  return (
    <div className="rounded-3xl border border-hairline bg-surface/70 p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-thai-serif text-lg font-light text-ink">{en ? "Sky around you, now" : "ฟ้ารอบๆ ตอนนี้"}</h2>
        {status === "idle" && (
          <button type="button" onClick={look} className="font-thai inline-flex min-h-[44px] items-center rounded-full border border-hairline px-4 text-sm text-ink transition-colors hover:bg-paper">
            {en ? "Check" : "ดูเลย"}
          </button>
        )}
        {status === "loading" && <span className="font-thai text-sm text-ink-faint animate-pulse">{en ? "reading the sky…" : "กำลังอ่านฟ้า…"}</span>}
      </div>

      {status === "idle" && (
        <p className="font-thai mt-2 text-sm text-ink-muted">{en ? "The sky differs a few km apart — see where it's clearest right now." : "ฟ้าห่างกันไม่กี่กม.ก็ต่างกัน — เช็คว่าตอนนี้ที่ไหนโปร่งสุด"}</p>
      )}

      {status === "error" && (
        <p className="font-thai mt-2 text-sm text-ink-faint">{en ? "Couldn't read nearby sky right now — try again in a moment." : "อ่านฟ้ารอบๆ ไม่ได้ตอนนี้ ลองใหม่อีกที"}</p>
      )}

      {status === "done" && (
        <>
          {suggestMove && (
            <button type="button" onClick={() => onPick(best.key)}
              className="font-thai mt-4 flex w-full items-center justify-between gap-3 rounded-2xl border border-success/40 bg-success/[0.07] px-4 py-3 text-left text-sm transition-colors hover:bg-success/[0.12] min-h-[44px]">
              <span className="text-ink">
                {en ? <>Clearer at <b className="font-medium">{best.en}</b> right now — move the plan?</> : <>ตอนนี้ฟ้าโปร่งกว่าที่ <b className="font-medium">{best.th}</b> — ย้ายแผนไปไหม?</>}
              </span>
              <span className="shrink-0 text-success">→</span>
            </button>
          )}
          {!suggestMove && here && (
            <p className="font-thai mt-4 rounded-2xl bg-paper px-4 py-3 text-sm text-ink-muted">
              {en ? <>Your area is about as good as it gets nearby right now 👌</> : <>ย่านคุณฟ้าดีพอๆ กับรอบๆ แล้วตอนนี้ 👌</>}
            </p>
          )}
          <ul className="mt-4 space-y-1.5">
            {rows.map((r) => (
              <li key={r.key} className="flex items-center justify-between gap-3 rounded-xl px-2 py-1.5">
                <span className="flex min-w-0 items-center gap-2.5">
                  <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: DOT[r.verdict] }} aria-hidden />
                  <button type="button" onClick={() => onPick(r.key)} className="font-thai truncate text-sm text-ink hover:underline">
                    {en ? r.en : r.th}
                  </button>
                  {r.key === currentKey && <span className="font-thai shrink-0 text-[0.7rem] text-ink-faint">({en ? "you" : "คุณอยู่นี่"})</span>}
                </span>
                <span className="font-thai shrink-0 text-xs text-ink-faint">{en ? SKY_VERDICT_EN[r.verdict] : SKY_VERDICT_TH[r.verdict]}</span>
              </li>
            ))}
          </ul>
          <p className="font-thai mt-3 text-[0.7rem] text-ink-faint">{en ? "Real forecast per district centre · Open-Meteo" : "พยากรณ์จริงรายเขต · Open-Meteo"}</p>
        </>
      )}
    </div>
  );
}
