"use client";

import { useState } from "react";
import Link from "next/link";
import { useLang } from "@/lib/i18n/useLang";
import { Logo } from "@/components/Logo";
import { LanguageToggle } from "@/components/LanguageToggle";

/**
 * /ai — "ถามอ่านฟ้า": the agentic surface. Type a free-text wish; NVIDIA NIM reads the
 * intent, the REAL engine builds the weather-fit plan, and the AI narrates it in Thai.
 * Grounded only in the engine's output (Iron Rule 0) — the cards are the real plan.
 */

const SKY_COLOR: Record<string, string> = {
  clear: "var(--arnfa-accent-sun)", partly: "var(--arnfa-success)", cloudy: "#4B5263",
  rain: "var(--arnfa-accent-rain)", storm: "var(--arnfa-accent-indoor-warm)", night: "#4A5878",
};

type Stop = { name: string; category: string; sky: string; arrival: string; tempC: number; rainProb: number; reason: string };
type Resp = { available: boolean; answer: string; plan: { areaTh: string; areaEn: string; dayLabel: string; stops: Stop[] }; planUrl: string; provider: string };

export default function AiPage() {
  const { en } = useLang();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [resp, setResp] = useState<Resp | null>(null);
  const [asked, setAsked] = useState("");
  const [error, setError] = useState("");

  const examples = en
    ? ["A chill café tomorrow afternoon, dodge the rain", "Kid-friendly day out Saturday, low PM2.5", "Where should I go to the beach this weekend?", "An easy evening walk around Ari"]
    : ["อยากไปคาเฟ่ชิลๆ เลี่ยงฝน พรุ่งนี้บ่าย", "พาเด็กเที่ยวเสาร์นี้ ฝุ่นน้อยๆ", "ไปทะเลสุดสัปดาห์ที่ไหนดี", "เดินเล่นย่านอารีย์เย็นๆ"];

  async function ask(q?: string) {
    const message = (q ?? input).trim();
    if (!message || loading) return;
    setAsked(message); setInput(""); setLoading(true); setResp(null); setError("");
    try {
      const r = await fetch("/api/ask", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message }) });
      const d = await r.json();
      if (d?.available) setResp(d);
      else setError(en ? "Arnfa AI is resting right now — you can still plan directly." : "ตอนนี้ AI ยังไม่พร้อม ลองวางแผนเองที่หน้าวางแผนได้นะ");
    } catch {
      setError(en ? "Something went wrong — try again." : "มีบางอย่างผิดพลาด ลองใหม่อีกที");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative z-10 min-h-screen">
      <header className="arnfa-grid section-minor pad-safe-t">
        <div className="col-content flex items-center justify-between">
          <Link href="/" className="text-ink hover:text-ink-muted transition-colors"><Logo className="text-xl" animate={false} /></Link>
          <div className="flex items-center gap-4">
            <Link href="/where" className="font-thai text-sm text-rain hover:underline">{en ? "Where to go" : "ไปไหนดี"}</Link>
            <Link href="/plan" className="font-thai text-sm text-rain hover:underline">{en ? "Plan" : "วางแผน"}</Link>
            <LanguageToggle />
          </div>
        </div>
      </header>

      <section className="arnfa-grid">
        <div className="col-content max-w-2xl">
          <div className="flex items-center gap-2.5 mb-2">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-sun" aria-hidden>
              <path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3Z" fill="currentColor" /><circle cx="18.5" cy="17.5" r="1.6" fill="currentColor" /><circle cx="5.5" cy="16" r="1" fill="currentColor" />
            </svg>
            <h1 className="font-thai-serif fs-h2 font-light text-ink">{en ? "Ask Arnfa" : "ถามอ่านฟ้า"}</h1>
          </div>
          <p className="font-thai text-ink-muted mb-7 max-w-xl">
            {en ? "Say what you feel like doing — the AI reads the real sky and lays out a plan that dodges the rain and haze." : "พิมพ์สิ่งที่อยากทำ แล้ว AI จะอ่านฟ้าจริง แล้วจัดแผนที่หลบฝน-หลบฝุ่นให้"}
          </p>

          {/* input */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") ask(); }}
              placeholder={en ? "e.g. a chill café tomorrow, dodge the rain" : "เช่น อยากไปคาเฟ่ชิลๆ พรุ่งนี้ เลี่ยงฝน"}
              className="font-thai h-12 flex-1 rounded-full border border-hairline bg-surface/70 px-5 text-base text-ink outline-none transition-colors focus:border-sun/60"
            />
            <button type="button" onClick={() => ask()} disabled={loading || !input.trim()}
              className="font-thai inline-flex h-12 items-center justify-center rounded-full bg-ink px-7 text-base font-medium text-paper transition-colors hover:bg-ink-muted disabled:opacity-50">
              {loading ? (en ? "Reading the sky…" : "กำลังอ่านฟ้า…") : (en ? "Ask" : "ถาม")}
            </button>
          </div>

          {/* example chips (only before first answer) */}
          {!resp && !loading && !error && (
            <div className="mt-5 flex flex-wrap gap-2">
              {examples.map((ex) => (
                <button key={ex} type="button" onClick={() => ask(ex)}
                  className="font-thai rounded-full border border-hairline px-4 py-2 text-sm text-ink-muted transition-colors hover:bg-surface min-h-[40px]">
                  {ex}
                </button>
              ))}
            </div>
          )}

          {/* conversation */}
          {asked && (
            <div className="mt-9 space-y-5">
              <p className="font-thai ml-auto max-w-[85%] w-fit rounded-3xl rounded-br-lg bg-ink px-5 py-3 text-sm text-paper">{asked}</p>

              {loading && <p className="font-thai text-ink-faint animate-pulse">{en ? "Arnfa is reading the sky and planning…" : "อ่านฟ้ากำลังคิดแผนให้…"}</p>}
              {error && <p className="font-thai rounded-3xl border border-hairline bg-surface/70 px-5 py-4 text-sm text-ink-muted">{error} <Link href="/plan" className="text-rain hover:underline">{en ? "Plan →" : "วางแผนเอง →"}</Link></p>}

              {resp && (
                <div className="rounded-3xl rounded-bl-lg border border-hairline bg-surface/70 p-5 sm:p-6">
                  <p className="font-thai text-ink leading-relaxed">{resp.answer}</p>

                  {resp.plan.stops.length > 0 && (
                    <ol className="mt-5 space-y-2.5">
                      {resp.plan.stops.map((s, i) => (
                        <li key={i} className="flex items-center gap-3">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink text-paper text-xs font-semibold">{i + 1}</span>
                          <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: SKY_COLOR[s.sky] ?? "#4B5263" }} aria-hidden />
                          <span className="font-thai min-w-0 flex-1 truncate text-sm text-ink">{s.name}</span>
                          <span className="font-thai shrink-0 text-xs text-ink-faint tabular-nums">~{s.arrival} · {s.tempC}° · {en ? "rain" : "ฝน"} {s.rainProb}%</span>
                        </li>
                      ))}
                    </ol>
                  )}

                  <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
                    <Link href={resp.planUrl} className="font-thai inline-flex h-10 items-center rounded-full bg-ink px-5 text-sm text-paper transition-colors hover:bg-ink-muted">
                      {en ? `Open the full plan for ${resp.plan.areaEn} →` : `เปิดแผนเต็มของ${resp.plan.areaTh} →`}
                    </Link>
                    <span className="font-thai text-[0.7rem] text-ink-faint">
                      {en ? `Real plan · sky via ${resp.provider || "Open-Meteo"} · POIs OpenStreetMap` : `แผนจริง · ฟ้าจาก ${resp.provider || "Open-Meteo"} · สถานที่จาก OpenStreetMap`}
                    </span>
                  </div>
                </div>
              )}

              {resp && (
                <button type="button" onClick={() => { setResp(null); setAsked(""); setError(""); }}
                  className="font-thai text-sm text-rain hover:underline">{en ? "Ask something else" : "ถามใหม่"}</button>
              )}
            </div>
          )}

          <p className="font-thai text-[0.7rem] text-ink-faint mt-10">
            {en ? "Powered by NVIDIA NIM — the AI only narrates Arnfa's real engine output; it never invents a place or the weather." : "ขับเคลื่อนด้วย NVIDIA NIM — AI เล่าเฉพาะแผนจริงจาก engine ของอ่านฟ้า ไม่แต่งสถานที่หรือสภาพอากาศเอง"}
          </p>
        </div>
      </section>
    </main>
  );
}
