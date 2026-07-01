"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useLang } from "@/lib/i18n/useLang";
import { Masthead } from "@/components/Masthead";
import { SiteFooter } from "@/components/SiteFooter";
import { LogoMark } from "@/components/Logo";
import { StopFeedback } from "@/components/StopFeedback";
import { RouteTimeline, TransitRoute } from "@/components/RouteTimeline";
/**
 * /ai — "ถามอ่านฟ้า": the agentic surface. Free-text wish → LLM reads the intent →
 * the REAL engine builds the weather-fit plan → the AI narrates it. Now MULTI-TURN: a
 * follow-up ("เปลี่ยนเป็นพรุ่งนี้", "แล้วถ้าฝนตกล่ะ") PATCHES the prior intent and re-runs the
 * SAME grounded engine — conversation memory, not a free-roaming tool-loop. Iron Rule 0:
 * the cards are always the engine's real output; the model never invents a place or weather.
 */
const SKY_COLOR: Record<string, string> = {
  clear: "var(--arnfa-accent-sun)",
  partly: "var(--arnfa-success)",
  cloudy: "var(--arnfa-ink-muted)",
  rain: "var(--arnfa-accent-rain)",
  storm: "var(--arnfa-accent-indoor-warm)",
  night: "#4A5878",
};

const SKY_EMOJI: Record<string, string> = {
  clear: "☀️",
  partly: "⛅",
  cloudy: "☁️",
  rain: "🌧️",
  storm: "⛈️",
  night: "🌙",
};

const SKY_LABEL_TH: Record<string, string> = {
  clear: "ฟ้าเปิด",
  partly: "โปร่ง",
  cloudy: "ครึ้ม",
  rain: "ฝนตกเบา",
  storm: "ฝนตกหนัก",
  night: "กลางคืน",
};

const SKY_LABEL_EN: Record<string, string> = {
  clear: "Clear",
  partly: "Fair",
  cloudy: "Cloudy",
  rain: "Light Rain",
  storm: "Heavy Rain",
  night: "Night",
};

type Stop = { id: string; name: string; category: string; sky: string; arrival: string; tempC: number; rainProb: number; reason: string; routeFromPrev?: TransitRoute };
type Intent = { area?: string; day?: number; budget?: number; vibes?: string[] };
type Resp = { available: boolean; answer: string; plan: { areaKey: string; areaTh: string; areaEn: string; dayLabel: string; stops: Stop[] }; intent?: Intent; planUrl: string; provider: string; llm?: string };
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

  // Deep-link: /ai?q=... (e.g. from the home ChatFab) auto-runs the question once on mount.
  const didInit = useRef(false);
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    try {
      const q = new URLSearchParams(window.location.search).get("q");
      if (q && q.trim()) ask(q.trim());
    } catch { /* no-op */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      const r = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, prior }),
      });
      const d = await r.json();
      setTurns((t) => t.map((turn, i) => (i === idx ? { ...turn, resp: d?.available ? d : null, error: d?.available ? "" : fail } : turn)));
    } catch {
      setTurns((t) => t.map((turn, i) => (i === idx ? { ...turn, error: en ? "Something went wrong — try again." : "มีบางอย่างผิดพลาด ลองใหม่อีกที" } : turn)));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative z-10 min-h-screen pb-20">
      <Masthead />

      <section className="arnfa-grid mt-6">
        <div className="col-content max-w-2xl mx-auto px-4">
          
          {/* Header section */}
          <div className="flex flex-col gap-2 mb-6">
            <div className="flex items-center gap-2.5">
              <LogoMark size={28} />
              <h1 className="font-thai-serif fs-h2 font-light text-ink">{en ? "Ask Arnfah" : "ถามอ่านฟ้า"}</h1>
            </div>
            <p className="font-thai text-sm text-ink-muted leading-relaxed max-w-xl">
              {en 
                ? "Describe what you want to do (e.g., chill cafe, low PM2.5, skip the rain) — the AI reads current forecast and sets a plan." 
                : "พิมพ์สไตล์ทริปที่ต้องการ (เช่น คาเฟ่ชิลๆ ฝุ่นน้อย หลบฝน) — AI จะวิเคราะห์ฟ้าจริงแล้วเลือกจุดท่องเที่ยวและสลับในร่ม/กลางแจ้งให้ทันที"}
            </p>
          </div>



          {/* input */}
          <div className="flex flex-col gap-3 sm:flex-row mb-6">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") ask(); }}
              aria-label={en ? "Ask Arnfah" : "ถามอ่านฟ้า"}
              placeholder={turns.length ? (en ? "Ask a follow-up…" : "ถามต่อยอดเพื่อปรับทริปได้เลย…") : (en ? "e.g. a chill café tomorrow, dodge the rain" : "เช่น อยากไปคาเฟ่ชิลๆ พรุ่งนี้บ่าย เลี่ยงฝน")}
              className="font-thai h-12 flex-1 rounded-full border border-hairline bg-white/80 px-5 text-base text-ink outline-none shadow-sm transition-all focus:border-sun/80 focus:bg-white"
            />
            <button type="button" onClick={() => ask()} disabled={loading || !input.trim()}
              className="font-thai inline-flex h-12 items-center justify-center rounded-full bg-ink px-8 text-base font-medium text-paper shadow transition-all hover:bg-ink-muted active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none">
              {loading ? (en ? "Reading…" : "อ่านฟ้า…") : (en ? "Ask" : "ถาม")}
            </button>
          </div>

          {/* example chips (only before the first turn) */}
          {turns.length === 0 && !loading && (
            <div className="mb-8">
              <span className="font-thai text-xs text-ink-faint block mb-2">{en ? "Recommended queries:" : "คำถามแนะนำเพื่อเริ่มต้น:"}</span>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => ask("แนะนำที่เที่ยวยอดฮิตวันนี้ที่เหมาะกับสภาพอากาศปัจจุบัน")}
                  className="font-thai text-left rounded-full border border-sun bg-sun/10 px-4 py-2 text-sm text-ink-muted transition-colors hover:bg-sun/20 min-h-[44px] shadow-sm flex items-center gap-2">
                  <span>✨</span> {en ? "Recommend popular places for today's weather" : "แนะนำที่เที่ยวยอดฮิตตามสภาพอากาศวันนี้"}
                </button>
                {examples.map((ex) => (
                  <button key={ex} type="button" onClick={() => ask(ex)}
                    className="font-thai text-left rounded-full border border-hairline bg-white/40 px-4 py-2 text-sm text-ink-muted transition-colors hover:bg-white hover:text-ink min-h-[44px] shadow-sm">{ex}</button>
                ))}
              </div>
            </div>
          )}

          {/* conversation */}
          <div className="space-y-8">
            {turns.map((turn, ti) => (
              <div key={ti} className="space-y-4">
                
                {/* User message (Right-aligned pill) */}
                <div className="flex justify-end">
                  <p className="font-thai max-w-[85%] rounded-3xl rounded-br-md bg-ink/90 shadow px-5 py-3 text-sm text-paper font-light leading-relaxed">
                    {turn.q}
                  </p>
                </div>

                {/* Loader / Pending state */}
                {!turn.resp && !turn.error && loading && ti === turns.length - 1 && (
                  <div className="arnfa-glass rounded-3xl rounded-bl-md p-5 sm:p-6 border border-hairline shadow-sm" style={{ background: "rgba(255,255,255,0.65)" }} aria-busy="true" aria-live="polite">
                    <p className="font-thai flex items-center gap-2 text-sm text-ink-faint">
                      <span className="af-blink h-2 w-2 rounded-full bg-sun shrink-0 animate-ping" />
                      {en ? "Arnfah is reading the sky and planning…" : "อ่านฟ้ากำลังส่องสภาพอากาศและวิเคราะห์สถานที่…"}
                    </p>
                    <div className="mt-4 space-y-2">
                      <span className="block h-3 w-[92%] rounded bg-ink/10 animate-pulse" />
                      <span className="block h-3 w-[74%] rounded bg-ink/10 animate-pulse" />
                    </div>
                    <div className="mt-6 pl-4 border-l border-ink/10 space-y-4">
                      {[0, 1, 2].map((i) => (
                        <div key={i} className="flex items-center gap-3">
                          <span className="h-5 w-5 shrink-0 rounded-full bg-ink/10 animate-pulse" />
                          <span className="h-3 flex-1 rounded bg-ink/10 animate-pulse" style={{ maxWidth: `${65 - i * 15}%` }} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Error message */}
                {turn.error && (
                  <p className="font-thai border border-indoor-warm/20 bg-indoor-warm/5 rounded-3xl px-5 py-4 text-sm text-ink-muted leading-relaxed" style={{ background: "rgba(255,255,255,0.4)" }}>
                    ⚠️ {turn.error} <Link href="/plan" className="text-rain font-semibold hover:underline">{en ? "Plan →" : "เปิดตัวช่วยวางแผนโดยตรง →"}</Link>
                  </p>
                )}

                {/* AI response content */}
                {turn.resp && (
                  <div className="arnfa-glass rounded-3xl rounded-bl-md border border-hairline p-5 sm:p-6 shadow-sm overflow-hidden" style={{ background: "rgba(255,255,255,0.68)" }}>
                    
                    {/* Chat Text Answer */}
                    <p className="font-thai text-ink text-sm sm:text-base leading-relaxed tracking-wide mb-6">
                      {turn.resp.answer}
                    </p>

                    {/* Timeline Plan */}
                    {turn.resp.plan.stops.length > 0 && (
                      <div className="relative pl-6 sm:pl-8 border-l border-ink/10 space-y-6 my-6">
                        
                        {/* Vertical line indicator */}
                        <div className="absolute left-0 top-3 bottom-3 w-[1px] bg-gradient-to-b from-sun via-rain to-success opacity-40" />

                        {turn.resp.plan.stops.map((s, i) => {
                          const weatherColor = SKY_COLOR[s.sky] ?? "var(--arnfa-ink-muted)";
                          const weatherEmoji = SKY_EMOJI[s.sky] ?? "❓";
                          const weatherLabel = en ? SKY_LABEL_EN[s.sky] ?? s.sky : SKY_LABEL_TH[s.sky] ?? s.sky;
                          
                          return (
                            <React.Fragment key={i}>
                              {s.routeFromPrev && (
                                <div className="mb-6 -mt-2">
                                  <RouteTimeline route={s.routeFromPrev} />
                                </div>
                              )}
                              <div className="relative group mb-6">
                                {/* Step dot marker */}
                                <div 
                                  className="absolute -left-[30px] sm:-left-[38px] top-1 flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full bg-white border shadow-sm transition-transform group-hover:scale-110 z-10"
                                  style={{ borderColor: weatherColor }}
                                >
                                  <span className="text-[0.65rem] font-bold text-ink-muted">{i + 1}</span>
                                </div>
  
                                <div className="bg-white/80 rounded-2xl border border-hairline p-4 shadow-sm hover:shadow transition-shadow z-10 relative">
                                  <div className="flex flex-wrap items-start justify-between gap-2 mb-1.5">
                                    <div>
                                      <h3 className="font-thai font-semibold text-sm sm:text-base text-ink pr-2">{s.name}</h3>
                                      <span className="inline-block rounded-full bg-ink/5 px-2 py-0.5 font-thai text-[0.65rem] text-ink-muted mt-0.5">
                                        {s.category}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0 bg-surface border border-hairline rounded-full px-2 py-0.5">
                                      <span className="text-xs" title={weatherLabel}>{weatherEmoji}</span>
                                      <span className="font-thai text-[0.7rem] font-medium text-ink-muted">{s.arrival} · {s.tempC}°</span>
                                      {s.rainProb > 15 ? (
                                        <span className="font-thai text-[0.7rem] font-medium text-rain pl-1 border-l border-hairline">
                                          ☔ {s.rainProb}%
                                        </span>
                                      ) : null}
                                    </div>
                                  </div>
  
                                  {s.reason && (
                                    <p className="font-thai text-xs text-ink-muted bg-surface/50 border-l-2 border-hairline px-2.5 py-1.5 my-2.5 rounded-r-md leading-relaxed">
                                      💡 {s.reason}
                                    </p>
                                  )}
  
                                  {/* Flywheel Feedback Loop integrated directly on each Stop Card */}
                                  <div className="border-t border-hairline/40 pt-2.5 mt-2.5">
                                    <StopFeedback
                                      poiId={s.id}
                                      skyState={s.sky as any}
                                      rainProb={s.rainProb / 100}
                                      district={turn.resp.plan.areaKey}
                                      en={en}
                                    />
                                  </div>
                                </div>
                              </div>
                            </React.Fragment>
                          );
                        })}
                      </div>
                    )}

                    {/* Quick links & Data provenance metadata */}
                    <div className="mt-6 pt-5 border-t border-hairline/80 flex flex-wrap items-center gap-x-4 gap-y-3">
                      <Link href={turn.resp.planUrl} className="font-thai inline-flex h-10 items-center justify-center rounded-full bg-ink px-6 text-sm font-medium text-paper transition-all hover:bg-ink-muted active:scale-[0.98] shadow-sm">
                        {en ? `Open the full plan for ${turn.resp.plan.areaEn} →` : `เปิดแผนแบบแผนที่เต็มของ${turn.resp.plan.areaTh} →`}
                      </Link>
                      
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-thai text-[0.68rem] text-ink-faint">{en ? "🔎 grounded on:" : "🔎 อ้างอิงแหล่งข้อมูลจริง:"}</span>
                        {[
                          `${en ? "forecast" : "สภาพอากาศ"} ${turn.resp.provider || "Open-Meteo"}`,
                          `${turn.resp.plan.stops.length} ${en ? "OSM POIs" : "จุดท่องเที่ยวจริง OSM"}`,
                          en ? `area ${turn.resp.plan.areaEn}` : `ย่าน${turn.resp.plan.areaTh}`,
                          turn.resp.plan.dayLabel,
                        ].filter(Boolean).map((c, ci) => (
                          <span key={ci} className="rounded-full border border-hairline bg-surface/50 px-2 py-0.5 font-thai text-[0.62rem] text-ink-muted">{c}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* follow-up suggestions after the latest plan */}
            {lastResp && !loading && (
              <div className="flex flex-col gap-2 pt-2 animate-fadeIn">
                <span className="font-thai text-xs text-ink-faint">{en ? "Keep chatting or refine plan:" : "คุยรายละเอียดต่อยอดทริปนี้:"}</span>
                <div className="flex flex-wrap items-center gap-2">
                  {followUps.map((f) => (
                    <button key={f} type="button" onClick={() => ask(f)}
                      className="font-thai rounded-full border border-hairline bg-white/40 px-4 py-1.5 text-sm text-ink-muted transition-all hover:bg-white hover:text-ink min-h-[44px] shadow-sm">{f}</button>
                  ))}
                  <button type="button" onClick={() => setTurns([])} className="font-thai text-sm font-semibold text-rain hover:underline ml-2 min-h-[44px] px-3">
                    {en ? "start over" : "เริ่มแผนใหม่"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Model info watermark */}
          <div className="border-t border-hairline mt-12 pt-4 flex items-center justify-between gap-4">
            <p className="font-thai text-[0.65rem] text-ink-faint leading-relaxed max-w-[80%]">
              {lastResp?.llm === "thai-sovereign"
                ? (en ? "Powered by Thai-LLM (Sovereign mode) — narrates Arnfah's real weather-fit plan outputs only; never invents places." : "รันด้วย Thai-LLM (อธิปไตย AI) — บรรยายข้อมูลจริงจากระบบคำนวณของอ่านฟ้า ไม่สร้างแผนปลอมเอง")
                : (en ? "Powered by NVIDIA NIM (Nemotron/DeepSeek) — narrates Arnfah's real weather-fit plan outputs only; never invents places." : "รันด้วย NVIDIA NIM + Nemotron — บรรยายข้อมูลจริงจากระบบคำนวณของอ่านฟ้า ไม่สร้างแผนปลอมเอง")}
            </p>
            {lastResp?.llm === "thai-sovereign" ? (
              <span className="shrink-0 bg-success/10 border border-success/30 text-success text-[0.62rem] font-bold tracking-wider uppercase px-2 py-0.5 rounded">
                SOVEREIGN AI
              </span>
            ) : null}
          </div>

        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
