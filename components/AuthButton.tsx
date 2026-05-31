"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/lib/auth/useAuth";

/** Magic-link sign-in widget (email → link). Shows the account + sign-out once in. */
export function AuthButton({ compact = false }: { compact?: boolean }) {
  const { i18n } = useTranslation();
  const en = i18n.language === "en";
  const { user, ready, signIn, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  if (!ready) return null;

  if (user) {
    return (
      <div className="flex items-center gap-2">
        {!compact && <span className="font-thai text-xs text-ink-faint truncate max-w-[11rem]">{user.email}</span>}
        <button type="button" onClick={signOut} className="font-thai text-sm text-ink-faint hover:text-ink hover:underline">{en ? "Sign out" : "ออก"}</button>
      </div>
    );
  }

  if (state === "sent") {
    return <span className="font-thai text-sm text-success">{en ? "Check your email for the sign-in link ✉️" : "เช็คอีเมล มีลิงก์เข้าสู่ระบบส่งไปแล้ว ✉️"}</span>;
  }

  if (!open) {
    return <button type="button" onClick={() => setOpen(true)} className="font-thai text-sm text-rain hover:underline">{en ? "Sign in" : "เข้าสู่ระบบ"}</button>;
  }

  async function send() {
    if (!email.trim()) return;
    setState("sending");
    setState((await signIn(email.trim())) ? "sent" : "error");
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={en ? "your@email.com" : "อีเมลของคุณ"}
        onKeyDown={(e) => { if (e.key === "Enter") send(); }}
        className="font-thai h-10 w-44 rounded-full border border-hairline bg-paper px-4 text-sm text-ink outline-none focus:border-rain/50" />
      <button type="button" onClick={send} disabled={state === "sending" || !email.trim()}
        className="font-thai inline-flex h-10 items-center rounded-full bg-ink px-4 text-sm text-paper transition-colors hover:bg-ink-muted disabled:opacity-50">
        {state === "sending" ? (en ? "Sending…" : "กำลังส่ง…") : (en ? "Send link" : "ส่งลิงก์")}
      </button>
      {state === "error" && <span className="font-thai text-xs text-indoor-warm">{en ? "Failed — try again" : "ส่งไม่ได้ ลองใหม่"}</span>}
    </div>
  );
}
