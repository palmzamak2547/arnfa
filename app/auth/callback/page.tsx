"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase/client";
import { Logo } from "@/components/Logo";

/**
 * Magic-link landing. The client (flowType pkce, detectSessionInUrl) exchanges the
 * ?code automatically; we wait for the session then send the user to their trips.
 */
export default function AuthCallback() {
  const router = useRouter();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) { router.replace("/"); return; }
    let tries = 0;
    const tick = async () => {
      const { data } = await sb.auth.getSession();
      if (data.session) { router.replace("/trips"); return; }
      if (tries === 0) { try { await sb.auth.exchangeCodeForSession(window.location.href); } catch { /* detectSessionInUrl may have it */ } }
      if (++tries > 8) { setFailed(true); return; }
      setTimeout(tick, 500);
    };
    tick();
  }, [router]);

  return (
    <main className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <Logo className="text-2xl mb-6" animate={false} />
      {failed ? (
        <>
          <p className="font-thai text-ink-muted mb-4">ลิงก์หมดอายุหรือใช้ไปแล้ว — ลองเข้าสู่ระบบใหม่อีกครั้ง</p>
          <a href="/trips" className="font-thai text-rain hover:underline">ไปหน้าทริปของฉัน →</a>
        </>
      ) : (
        <p className="font-thai text-ink-faint animate-pulse">กำลังเข้าสู่ระบบ…</p>
      )}
    </main>
  );
}
