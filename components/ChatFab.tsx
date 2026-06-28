"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import { useLang } from "@/lib/i18n/useLang";

/**
 * ChatFab — the mockup's floating "ask the sky" button + mini panel, made fully FUNCTIONAL: a
 * quick prompt or the input hands the question to the REAL /ai agent (via /ai?q=…, which auto-runs
 * it). No fake in-panel chat — it's a friendly doorway to the actual NIM-grounded planner.
 */
const MARK = (
  <svg width="30" height="30" viewBox="0 0 48 48" aria-hidden>
    <circle cx="24" cy="22" r="13" fill="var(--arnfa-accent-sun)" />
    <path d="M8 40 a8 8 0 0 1 1.5 -15.7 a11 11 0 0 1 21 1.5 a7 7 0 0 1 -1.5 14.2 Z" fill="var(--arnfa-paper)" />
    <line x1="6" y1="40" x2="42" y2="40" stroke="var(--arnfa-accent-rain)" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

export function ChatFab() {
  const { en } = useLang();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const go = (text: string) => {
    const t = text.trim();
    router.push(t ? `/ai?q=${encodeURIComponent(t)}` : "/ai");
  };
  const prompts = en ? ["Where to go today?", "Will it rain tomorrow?"] : ["วันนี้ไปไหนดี", "พรุ่งนี้ฝนตกไหม"];

  return (
    <>
      <div
        role="dialog"
        aria-label={en ? "Ask Arnfah" : "ถามอ่านฟ้า"}
        aria-hidden={!open}
        className={clsx(
          "fixed right-3 z-[62] w-[min(340px,calc(100vw-24px))] origin-bottom-right overflow-hidden rounded-[2rem] border border-hairline bg-surface shadow-[0_24px_60px_-28px_rgba(26,31,43,0.5)] transition-[transform,opacity] duration-[var(--dur-base)] ease-[var(--ease-drift)]",
          open ? "translate-y-0 scale-100 opacity-100" : "pointer-events-none translate-y-3 scale-95 opacity-0",
        )}
        style={{ bottom: "calc(max(1rem,env(safe-area-inset-bottom)) + 72px)" }}
      >
        <div className="flex items-center gap-2.5 p-3.5" style={{ background: "linear-gradient(180deg,#C9D6E4,#F1E2CC)" }}>
          <span className="flex-none">{MARK}</span>
          <span className="flex flex-col leading-tight">
            <span className="font-thai-serif text-[0.98rem] font-semibold text-ink">{en ? "Ask Arnfah" : "ถามอ่านฟ้า"}</span>
            <span className="inline-flex items-center gap-1.5 font-thai text-[0.72rem] text-ink-muted">
              <span className="h-[7px] w-[7px] rounded-full bg-success" aria-hidden />{en ? "asks the sky for you" : "ถามฟ้าให้คุณ"}
            </span>
          </span>
          <button type="button" onClick={() => setOpen(false)} aria-label={en ? "Close" : "ปิด"} className="ml-auto flex h-8 w-8 items-center justify-center rounded-full bg-white/55 text-ink transition-colors hover:bg-white/80">✕</button>
        </div>
        <div className="flex flex-col gap-3 p-4">
          <p className="max-w-[86%] self-start rounded-[16px] rounded-bl-[5px] border border-hairline bg-sun/10 px-3.5 py-2.5 font-thai text-sm leading-snug text-ink">
            {en ? "Tell me a day and I'll read the sky — where to go, and when." : "บอกวันมา เดี๋ยวอ่านฟ้าให้ — ไปไหนดี ตอนกี่โมง"}
          </p>
          <div className="flex flex-wrap gap-2">
            {prompts.map((p) => (
              <button key={p} type="button" onClick={() => go(p)} className="rounded-full border border-hairline bg-paper px-3.5 py-2 font-thai text-sm text-ink transition-colors hover:bg-surface">{p}</button>
            ))}
          </div>
          <form onSubmit={(e) => { e.preventDefault(); go(q); }} className="flex gap-2">
            <input value={q} onChange={(e) => setQ(e.target.value)} aria-label={en ? "Message" : "พิมพ์ถามฟ้า"} placeholder={en ? "ask the sky…" : "พิมพ์ถามฟ้า…"}
              className="h-10 flex-1 rounded-full border border-hairline bg-paper px-4 font-thai text-sm text-ink outline-none focus:border-sun" />
            <button type="submit" aria-label={en ? "Send" : "ส่ง"} className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-ink text-base text-paper transition-colors hover:bg-ink-muted">→</button>
          </form>
        </div>
      </div>

      <button type="button" onClick={() => setOpen((o) => !o)} aria-label={en ? "Ask Arnfah" : "ถามอ่านฟ้า"} aria-expanded={open}
        className="af-floaty fixed right-3 z-[62] flex h-14 w-14 items-center justify-center rounded-full bg-ink shadow-[0_18px_44px_-18px_rgba(26,31,43,0.7)] transition-transform hover:scale-105"
        style={{ bottom: "max(1rem,env(safe-area-inset-bottom))" }}>
        {MARK}
      </button>
    </>
  );
}
