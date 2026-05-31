"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/lib/auth/useAuth";
import { listTrips, deleteTrip, type SavedTrip } from "@/lib/plan/trips";
import { districtMeta } from "@/lib/poi/districts";
import { encodePlanState } from "@/lib/plan/shareState";
import { AuthButton } from "@/components/AuthButton";
import { Logo } from "@/components/Logo";

export default function TripsPage() {
  const { i18n } = useTranslation();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const en = mounted && i18n.language === "en";
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

  return (
    <main className="relative z-10 min-h-screen">
      <header className="arnfa-grid section-minor pad-safe-t">
        <div className="col-content flex items-center justify-between gap-3">
          <Link href="/" className="text-ink hover:text-ink-muted transition-colors"><Logo className="text-xl" animate={false} /></Link>
          <AuthButton />
        </div>
      </header>

      <section className="arnfa-grid">
        <div className="col-content max-w-2xl">
          <h1 className="font-thai-serif fs-h2 font-light text-ink mb-2">{en ? "My trips" : "ทริปของฉัน"}</h1>
          <p className="font-thai text-sm text-ink-muted mb-8">{en ? "Saved trips re-read the live sky each time you open them — always fresh." : "ทริปที่เซฟไว้จะอ่านฟ้าสดทุกครั้งที่เปิด — ใหม่เสมอ"}</p>

          {ready && !user && (
            <div className="rounded-3xl border border-hairline bg-surface/70 p-6">
              <p className="font-thai text-ink mb-4">{en ? "Sign in to save trips and sync your taste across devices." : "เข้าสู่ระบบเพื่อเซฟทริปและซิงค์รสนิยมข้ามเครื่อง"}</p>
              <AuthButton />
            </div>
          )}

          {user && trips === null && <p className="font-thai text-ink-faint animate-pulse">{en ? "Loading…" : "กำลังโหลด…"}</p>}
          {user && trips?.length === 0 && (
            <p className="font-thai text-ink-faint">{en ? "No saved trips yet — plan a day and tap Save." : "ยังไม่มีทริปที่เซฟ — ลองวางแผนแล้วกดเซฟดู"} <Link href="/plan" className="text-rain hover:underline">{en ? "Plan →" : "วางแผน →"}</Link></p>
          )}

          <ul className="space-y-3">
            {(trips ?? []).map((t) => {
              const meta = districtMeta(t.district);
              const url = `/plan?${encodePlanState({ district: t.district, budgetMin: t.budgetMin, rain: false, day: t.day })}`;
              return (
                <li key={t.id} className="flex items-center justify-between gap-3 rounded-2xl border border-hairline bg-surface/70 p-4">
                  <Link href={url} className="min-w-0 flex-1">
                    <p className="font-thai font-medium text-ink truncate">{t.title || (en ? meta?.en : meta?.th) || t.district}</p>
                    <p className="font-thai text-xs text-ink-faint mt-0.5">{en ? meta?.en : meta?.th} · {t.budgetMin >= 420 ? (en ? "full day" : "เต็มวัน") : t.budgetMin >= 240 ? (en ? "half day" : "ครึ่งวัน") : (en ? "quick" : "แวบเดียว")} · {dayLabel(t.day)}</p>
                  </Link>
                  <button type="button" onClick={() => remove(t.id)} className="font-thai shrink-0 text-xs text-ink-faint hover:text-indoor-warm">{en ? "delete" : "ลบ"}</button>
                </li>
              );
            })}
          </ul>
        </div>
      </section>
    </main>
  );
}
