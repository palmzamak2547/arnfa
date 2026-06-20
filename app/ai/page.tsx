"use client";

import { useState } from "react";
import Link from "next/link";
import { useLang } from "@/lib/i18n/useLang";
import { Masthead } from "@/components/Masthead";
import { SiteFooter } from "@/components/SiteFooter";
import { LogoMark } from "@/components/Logo";

/**
 * /ai — "ถามอ่านฟ้า": the agentic surface. Free-text wish → NVIDIA NIM reads the intent →
 * the REAL engine builds the weather-fit plan → the AI narrates it. Now MULTI-TURN: a
 * follow-up ("เปลี่ยนเป็นพรุ่งนี้", "แล้วถ้าฝนตกล่ะ") PATCHES the prior intent and re-runs the
 * SAME grounded engine — conversation memory, not a free-roaming tool-loop. Iron Rule 0:
 * the cards are always the engine's real output; the model never invents a place or weather.
 */
const SKY_COLOR: Record<string, string> = {
  clear: "var(--arnfa-accent-sun)", partly: "var(--arnfa-success)", cloudy: "#4B5263",
  rain: "var(--arnfa-accent-rain)", storm: "var(--arnfa-accent-indoor-warm)", night: "#4A5878",
};

type Stop = { name: string; category: string; sky: string; arrival: string; tempC: number; rainProb: number; reason: string };
type Intent = { area?: string; day?: number; budget?: number; vibes?: string[] };
type Resp = { available: boolean; answer: string; plan: { areaTh: string; areaEn: string; dayLabel: string; stops: Stop[] }; intent?: Intent; planUrl: string; provider: string; llm?: string };
type Turn = { q: string; resp: Resp | null; error: string };

export default function AiPage() {
  const { en } = useLang();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);

  const examples = en
    ? ["A chill café tomorrow afternoon, dodge the rain", "Kid-friendly day out Saturday, low PM2.5", "Where should I go to the beach this weekend?", "An easy evening walk around Ari"]
    : ["อยากไปคาเฟ่ชิลๆ เลี่ยงฝน พรุ่งนี้บ่าย", "พาเด็กเที่ยวเสาร์นี้ ฝุ่นน้อยๆ", "ไปทะเลสุดสัปดาห์ที่ไหนดี", "เดินเล่นย่านอารีย์เย็นๆ"];
  const followUps = en
    ? ["Make it tomorrow instead", "What if it rains in the afternoon?", "Somewhere else", "Less time"]
    : ["เปลี่ยนเป็นพรุ่งนี้", "ถ้าฝนตกตอนบ่ายล่ะ", "ขอย่านอื่น", "ใช้เวลาน้อยกว่านี้"];

  const lastResp = [...turns].reverse().find((t) => t.resp)?.resp ?? null;

  async function ask(q?: string) {
    const message = (q ?? input).trim();
    if (!message || loading) return;
    const prior = lastResp?.intent ?? null; // multi-turn: patch the previous intent
    setInput("");
    const idx = turns.length;
    setTurns((t) => [...t, { q: message, resp: null, error: "" }]);
    setLoading(true);
    const fail = en ? "Arnfah AI is resting right now — you can still plan directly." : "ตอนนี้ AI ยังไม่พร้อม ลองวางแผนเองที่หน้าวางแผนได้นะ";
    try {
      const r = await fetch("/api/ask", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message, prior }) });
      const d = await r.json();
      setTurns((t) => t.map((turn, i) => (i === idx ? { ...turn, resp: d?.available ? d : null, error: d?.available ? "" : fail } : turn)));
    } catch {
      setTurns((t) => t.map((turn, i) => (i === idx ? { ...turn, error: en ? "Something went wrong — try again." : "มีบางอย่างผิดพลาด ลองใหม่อีกที" } : turn)));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative z-10 min-h-screen">
      <Masthead />

      <section className="arnfa-grid">
        <div className="col-content max-w-2xl">
          <div className="flex items-center gap-2.5 mb-2">
            <LogoMark size={24} />
            <h1 className="font-thai-serif fs-h2 font-light text-ink">{en ? "Ask Arnfah" : "ถามอ่านฟ้า"}</h1>
          </div>
          <p className="font-thai text-ink-muted mb-7 max-w-xl">
            {en ? "Say what you feel like doing — the AI reads the real sky and lays out a plan. Then keep chatting: change the day, dodge rain, try another area." : "พิมพ์สิ่งที่อยากทำ แล้ว AI จะอ่านฟ้าจริงแล้วจัดแผนให้ คุยต่อได้เลย เช่น เปลี่ยนวัน เลี่ยงฝน หรือลองย่านอื่น"}
          </p>

          {/* input */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") ask(); }}
              placeholder={turns.length ? (en ? "ask a follow-up…" : "ถามต่อได้เลย…") : (en ? "e.g. a chill café tomorrow, dodge the rain" : "เช่น อยากไปคาเฟ่ชิลๆ พรุ่งนี้ เลี่ยงฝน")}
              className="font-thai h-12 flex-1 rounded-full border border-hairline bg-surface/70 px-5 text-base text-ink outline-none transition-colors focus:border-sun/60"
            />
            <button type="button" onClick={() => ask()} disabled={loading || !input.trim()}
              className="font-thai inline-flex h-12 items-center justify-center rounded-full bg-ink px-7 text-base font-medium text-paper transition-colors hover:bg-ink-muted disabled:opacity-50">
              {loading ? (en ? "Reading…" : "อ่านฟ้า…") : (en ? "Ask" : "ถาม")}
            </button>
          </div>

          {/* example chips (only before the first turn) */}
          {turns.length === 0 && !loading && (
            <div className="mt-5 flex flex-wrap gap-2">
              {examples.map((ex) => (
                <button key={ex} type="button" onClick={() => ask(ex)}
                  className="font-thai rounded-full border border-hairline px-4 py-2 text-sm text-ink-muted transition-colors hover:bg-surface min-h-[40px]">{ex}</button>
              ))}
            </div>
          )}

          {/* conversation */}
          <div className="mt-9 space-y-6">
            {turns.map((turn, ti) => (
              <div key={ti} className="space-y-4">
                <p className="font-thai ml-auto max-w-[85%] w-fit rounded-3xl rounded-br-lg bg-ink px-5 py-3 text-sm text-paper">{turn.q}</p>

                {!turn.resp && !turn.error && loading && ti === turns.length - 1 && (
                  <p className="font-thai flex items-center gap-2 text-ink-faint"><span className="af-blink h-2 w-2 rounded-full bg-sun" />{en ? "Arnfah is reading the sky and planning…" : "อ่านฟ้ากำลังคิดแผนให้…"}</p>
                )}
                {turn.error && <p className="font-thai rounded-3xl border border-hairline bg-surface/70 px-5 py-4 text-sm text-ink-muted">{turn.error} <Link href="/plan" className="text-rain hover:underline">{en ? "Plan →" : "วางแผนเอง →"}</Link></p>}

                {turn.resp && (
                  <div className="rounded-3xl rounded-bl-lg border border-hairline bg-surface/70 p-5 sm:p-6">
                    <p className="font-thai text-ink leading-relaxed">{turn.resp.answer}</p>
                    {turn.resp.plan.stops.length > 0 && (
                      <ol className="mt-5 space-y-2.5">
                        {turn.resp.plan.stops.map((s, i) => (
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
                      <Link href={turn.resp.planUrl} className="font-thai inline-flex h-10 items-center rounded-full bg-ink px-5 text-sm text-paper transition-colors hover:bg-ink-muted">
                        {en ? `Open the full plan for ${turn.resp.plan.areaEn} →` : `เปิดแผนเต็มของ${turn.resp.plan.areaTh} →`}
                      </Link>
                      <span className="font-thai text-[0.7rem] text-ink-faint">
                        {en ? `Real plan · sky via ${turn.resp.provider || "Open-Meteo"} · POIs OpenStreetMap` : `แผนจริง · ฟ้าจาก ${turn.resp.provider || "Open-Meteo"} · สถานที่จาก OpenStreetMap`}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* follow-up suggestions after the latest plan */}
            {lastResp && !loading && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-thai text-xs text-ink-faint">{en ? "keep going:" : "คุยต่อ:"}</span>
                {followUps.map((f) => (
                  <button key={f} type="button" onClick={() => ask(f)}
                    className="font-thai rounded-full border border-hairline px-3.5 py-1.5 text-sm text-ink-muted transition-colors hover:bg-surface min-h-[36px]">{f}</button>
                ))}
                <button type="button" onClick={() => setTurns([])} className="font-thai text-sm text-rain hover:underline ml-1">{en ? "start over" : "เริ่มใหม่"}</button>
              </div>
            )}
          </div>

          <p className="font-thai text-[0.7rem] text-ink-faint mt-10">
            {lastResp?.llm === "thai-sovereign"
              ? (en ? "Powered by a Thai-sovereign LLM — narrates Arnfah's real engine output only; never invents a place or the weather." : "ขับเคลื่อนด้วย Thai-LLM (อธิปไตย AI) — เล่าเฉพาะแผนจริงจาก engine ของอ่านฟ้า ไม่แต่งสถานที่หรือสภาพอากาศเอง")
              : (en ? "Powered by NVIDIA NIM (Thai-LLM ready) — narrates Arnfah's real engine output only; never invents a place or the weather." : "ขับเคลื่อนด้วย NVIDIA NIM (พร้อมรองรับ Thai-LLM) — เล่าเฉพาะแผนจริงจาก engine ของอ่านฟ้า ไม่แต่งสถานที่หรือสภาพอากาศเอง")}
          </p>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
