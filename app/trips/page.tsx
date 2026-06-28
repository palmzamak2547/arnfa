"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLang } from "@/lib/i18n/useLang";
import { SkyWatch } from "@/components/SkyWatch";
import { Masthead } from "@/components/Masthead";
import { SiteFooter } from "@/components/SiteFooter";
import { useAuth } from "@/lib/auth/useAuth";
import { listTrips, deleteTrip, type SavedTrip } from "@/lib/plan/trips";
import { districtMeta } from "@/lib/poi/districts";
import { encodePlanState } from "@/lib/plan/shareState";
import { AuthButton } from "@/components/AuthButton";

export default function TripsPage() {
  const { en } = useLang();
  const { user, ready } = useAuth();
  const [trips, setTrips] = useState<SavedTrip[] | null>(null);

  useEffect(() => {
    if (!ready) return;
    if (user) listTrips().then(setTrips);
    else setTrips([]);
  }, [user, ready]);

  async function remove(id: string) {
    if (await deleteTrip(id)) setTrips((t) => (t ?? []).filter((x) => x.id !== id));
  }

  const dayLabel = (d: number) => (d === 0 ? (en ? "today" : "วันนี้") : en ? `+${d}d` : `+${d} วัน`);
  const watchKeys = useMemo(() => [...new Set((trips ?? []).map((t) => t.district))], [trips]);

  return (
    <main className="relative z-10 min-h-screen">
      <Masthead />

      <section className="arnfa-grid">
        <div className="col-content max-w-2xl">
          <h1 className="font-thai-serif fs-h2 font-light text-ink mb-2">{en ? "My trips" : "ทริปของฉัน"}</h1>
          <p className="font-thai text-sm text-ink-muted mb-8">{en ? "Saved trips re-read the live sky each time you open them — always fresh." : "ทริปที่เซฟไว้จะอ่านฟ้าสดทุกครั้งที่เปิด — ใหม่เสมอ"}</p>

          {ready && !user && (
            <div className="arnfa-glass rounded-3xl p-6" style={{ background: "rgba(255,255,255,0.4)" }}>
              <p className="font-thai text-ink mb-4">{en ? "Sign in to save trips and sync your taste across devices." : "เข้าสู่ระบบเพื่อเซฟทริปและซิงค์รสนิยมข้ามเครื่อง"}</p>
              <AuthButton />
            </div>
          )}

          {user && trips === null && <p className="font-thai flex items-center gap-2 text-ink-faint"><span className="af-blink h-2 w-2 rounded-full bg-sun" />{en ? "Loading…" : "กำลังโหลด…"}</p>}
          {user && trips?.length === 0 && (
            <div className="arnfa-glass rounded-3xl p-8 text-center" style={{ background: "rgba(255,255,255,0.4)" }}>
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-sun/15">
                <svg width="26" height="26" viewBox="0 0 48 48" aria-hidden><circle cx="24" cy="24" r="11" fill="var(--arnfa-accent-sun)" /></svg>
              </div>
              <p className="font-thai-serif text-xl font-light text-ink">{en ? "No saved trips yet" : "ยังไม่มีทริปที่เซฟ"}</p>
              <p className="mx-auto mt-2 max-w-sm font-thai text-sm text-ink-muted">
                {en ? "Plan a day, then tap Save — Arnfah keeps watching the sky for it and tells you the best day to go." : "ลองวางแผนสักวันแล้วกดเซฟ — อ่านฟ้าจะเฝ้าฟ้าให้ แล้วบอกว่าวันไหนควรไป"}
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2.5">
                <Link href="/plan" className="rounded-full bg-ink px-5 py-2.5 font-thai text-sm font-medium text-paper transition-colors hover:bg-ink-muted">{en ? "Plan a trip" : "วางแผนทริป"}</Link>
                <Link href="/where" className="rounded-full border border-hairline px-5 py-2.5 font-thai text-sm text-ink transition-colors hover:bg-surface">{en ? "Where to go" : "ไปไหนดี"}</Link>
              </div>
            </div>
          )}

          {user && watchKeys.length > 0 && <SkyWatch keys={watchKeys} />}

          <ul className="space-y-3">
            {(trips ?? []).map((t) => {
              const meta = districtMeta(t.district);
              const url = `/plan?${encodePlanState({ district: t.district, budgetMin: t.budgetMin, rain: false, day: t.day })}`;
              return (
                <li key={t.id} className="flex items-center justify-between gap-3 rounded-2xl border border-hairline bg-surface/70 p-4">
                  <Link href={url} className="min-w-0 flex-1">
                    <p className="font-thai font-medium text-ink truncate">{t.title || (en ? meta?.en : meta?.th) || t.district}</p>
                    <p className="font-thai text-xs text-ink-faint mt-0.5">{en ? meta?.en : meta?.th}, {t.budgetMin >= 420 ? (en ? "full day" : "เต็มวัน") : t.budgetMin >= 240 ? (en ? "half day" : "ครึ่งวัน") : (en ? "quick" : "แวบเดียว")}, {dayLabel(t.day)}</p>
                  </Link>
                  <button type="button" onClick={() => remove(t.id)} className="font-thai shrink-0 text-xs text-ink-faint hover:text-indoor-warm">{en ? "delete" : "ลบ"}</button>
                </li>
              );
            })}
          </ul>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
