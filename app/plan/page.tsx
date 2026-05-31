"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { clsx } from "clsx";
import thonglor from "@/data/seed/thonglor.json";
import ari from "@/data/seed/ari.json";
import silom from "@/data/seed/silom.json";
import siam from "@/data/seed/siam.json";
import ekkamai from "@/data/seed/ekkamai.json";
import phranakhon from "@/data/seed/phranakhon.json";
import {
  buildPlan,
  districtCentroid,
  type SeedDistrict,
  type BuiltPlan,
  type TasteVector,
} from "@/lib/plan/buildPlan";
import type { HourlyForecast } from "@/lib/weather/types";
import { injectRainAt } from "@/lib/plan/rainInject";
import { decodePlanState, encodePlanState } from "@/lib/plan/shareState";
import { loadTaste } from "@/lib/plan/taste";
import { SkyChip } from "@/components/SkyChip";
import { SwapCard } from "@/components/SwapCard";
import { PlanSkeleton } from "@/components/PlanSkeleton";
import { AirChip } from "@/components/AirChip";
import { PoiVisual } from "@/components/PoiVisual";
import { ShareButton } from "@/components/ShareButton";
import { TasteQuiz } from "@/components/TasteQuiz";
import { Logo } from "@/components/Logo";

const PlanMap = dynamic(() => import("@/components/PlanMap").then((m) => m.PlanMap), {
  ssr: false,
  loading: () => <div className="h-full w-full rounded-3xl border border-hairline bg-surface/60 animate-pulse" />,
});

const DISTRICTS: Record<string, SeedDistrict> = {
  thonglor: thonglor as SeedDistrict,
  ari: ari as SeedDistrict,
  silom: silom as SeedDistrict,
  siam: siam as SeedDistrict,
  ekkamai: ekkamai as SeedDistrict,
  phranakhon: phranakhon as SeedDistrict,
};
const DISTRICT_KEYS = Object.keys(DISTRICTS);

const BUDGETS = [
  { label: "แวบเดียว", min: 150 },
  { label: "ครึ่งวัน", min: 240 },
  { label: "เต็มวัน", min: 420 },
];

function PlanInner() {
  // Initial state from URL (so a shared link reproduces the exact plan).
  const initial = useMemo(() => {
    const q = typeof window !== "undefined" ? window.location.search.slice(1) : "";
    return decodePlanState(q, DISTRICT_KEYS);
  }, []);

  const [districtKey, setDistrictKey] = useState(initial.district);
  const [budgetMin, setBudgetMin] = useState(initial.budgetMin);
  const [forecast, setForecast] = useState<HourlyForecast[] | null>(null);
  const [provider, setProvider] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rainSlot, setRainSlot] = useState<number | null>(null);
  const [taste, setTaste] = useState<TasteVector | null>(null);
  const [quizOpen, setQuizOpen] = useState(false);

  const district = DISTRICTS[districtKey];
  const center = useMemo(() => districtCentroid(district), [district]);

  // Load saved taste once; if none and the user hasn't dismissed, offer the quiz.
  useEffect(() => {
    const saved = loadTaste();
    if (saved) setTaste(saved);
    else if (typeof localStorage !== "undefined" && !localStorage.getItem("arnfa.taste.skipped")) {
      setQuizOpen(true);
    }
  }, []);

  // Fetch forecast for the district centroid.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setRainSlot(null);
    fetch(`/api/forecast?lat=${center.lat}&lng=${center.lng}&hours=24`)
      .then((r) => { if (!r.ok) throw new Error(`forecast ${r.status}`); return r.json(); })
      .then((data) => { if (!cancelled) { setForecast(data.hours); setProvider(data.providerUsed ?? ""); } })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : String(e)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [districtKey, center.lat, center.lng]);

  // Keep the URL in sync (shareable, back-button friendly) — replaceState, no reload.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const qs = encodePlanState({ district: districtKey, budgetMin, rain: rainSlot !== null });
    window.history.replaceState(null, "", `${window.location.pathname}?${qs}`);
  }, [districtKey, budgetMin, rainSlot]);

  const startHourIndex = useMemo(() => {
    if (!forecast) return 0;
    const nowHour = new Date().getHours();
    const startHour = nowHour >= 9 && nowHour <= 16 ? nowHour : 10;
    const idx = forecast.findIndex((f) => new Date(f.hourISO).getHours() === startHour);
    return idx >= 0 ? idx : 0;
  }, [forecast]);

  const basePlan: BuiltPlan | null = useMemo(() => {
    if (!forecast) return null;
    return buildPlan(district, forecast, { startHourIndex, budgetMin, start: center, taste: taste ?? undefined });
  }, [district, forecast, startHourIndex, budgetMin, center, taste]);

  const rainedPlan: BuiltPlan | null = useMemo(() => {
    if (!forecast || rainSlot === null) return null;
    return buildPlan(district, forecast, { startHourIndex, budgetMin, start: center, taste: taste ?? undefined, forecastOverride: injectRainAt(forecast, rainSlot, 2) });
  }, [district, forecast, rainSlot, startHourIndex, budgetMin, center, taste]);

  const activePlan = rainedPlan ?? basePlan;

  const swap = useMemo(() => {
    if (!basePlan || !rainedPlan) return null;
    const baseIds = new Set(basePlan.stops.map((s) => s.poi.id));
    const rainedIds = new Set(rainedPlan.stops.map((s) => s.poi.id));
    const dropped = basePlan.stops.find((s) => !rainedIds.has(s.poi.id));
    const added = rainedPlan.stops.find((s) => !baseIds.has(s.poi.id));
    if (!dropped || !added) return null;
    return { dropped, added };
  }, [basePlan, rainedPlan]);

  const rainTargetSlot = useMemo(() => {
    if (!basePlan || basePlan.stops.length === 0) return null;
    let best = basePlan.stops[0];
    for (const s of basePlan.stops) if (s.poi.profile.outdoorness > best.poi.profile.outdoorness) best = s;
    const idx = forecast?.findIndex((f) => f.hourISO === best.arrivalHourISO) ?? -1;
    return idx >= 0 ? idx : null;
  }, [basePlan, forecast]);

  const shareUrl = useMemo(
    () => `/plan?${encodePlanState({ district: districtKey, budgetMin, rain: rainSlot !== null })}`,
    [districtKey, budgetMin, rainSlot],
  );

  function finishQuiz(v: TasteVector) {
    setTaste(v);
    setQuizOpen(false);
  }
  function skipQuiz() {
    setQuizOpen(false);
    try { localStorage.setItem("arnfa.taste.skipped", "1"); } catch { /* ignore */ }
  }

  return (
    <main className="relative z-10 min-h-screen">
      {/* Header */}
      <header className="arnfa-grid section-minor pad-safe-t">
        <div className="col-content flex items-center justify-between">
          <Link href="/" className="text-ink hover:text-ink-muted transition-colors">
            <Logo className="text-xl" animate={false} />
          </Link>
          <span className="font-thai text-sm text-ink-faint">{provider && `ฟ้าจาก ${provider}`}</span>
        </div>
      </header>

      {/* Controls */}
      <section className="arnfa-grid">
        <div className="col-content">
          <h1 className="font-thai-serif fs-h2 font-light text-ink mb-2 text-balance">
            วางแผนทริป — <span className="italic text-ink-muted">{district.districtTh}</span>
          </h1>
          <div className="flex items-center gap-3 mb-7">
            <AirChip lat={center.lat} lng={center.lng} />
            {!taste && !quizOpen && (
              <button type="button" onClick={() => setQuizOpen(true)} className="font-thai text-sm text-rain hover:underline min-h-[44px]">
                ปรับให้ตรงใจ →
              </button>
            )}
            {taste && (
              <span className="font-thai text-xs text-ink-faint">ปรับตามรสนิยมคุณแล้ว</span>
            )}
          </div>

          {quizOpen && (
            <div className="mb-8 max-w-2xl">
              <TasteQuiz onDone={finishQuiz} onSkip={skipQuiz} />
            </div>
          )}

          <div className="flex flex-wrap gap-x-8 gap-y-5">
            <div>
              <p className="font-thai text-xs uppercase tracking-wider text-ink-faint mb-2">ย่าน</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(DISTRICTS).map(([key, d]) => (
                  <button key={key} type="button" onClick={() => setDistrictKey(key)}
                    className={clsx("font-thai rounded-full px-4 py-2 text-sm transition-colors duration-[var(--dur-fast)] min-h-[44px]", key === districtKey ? "bg-ink text-paper" : "border border-hairline text-ink hover:bg-surface")}>
                    {d.districtTh}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="font-thai text-xs uppercase tracking-wider text-ink-faint mb-2">เวลา</p>
              <div className="flex gap-2">
                {BUDGETS.map((b) => (
                  <button key={b.min} type="button" onClick={() => setBudgetMin(b.min)}
                    className={clsx("font-thai rounded-full px-4 py-2 text-sm transition-colors duration-[var(--dur-fast)] min-h-[44px]", b.min === budgetMin ? "bg-ink text-paper" : "border border-hairline text-ink hover:bg-surface")}>
                    {b.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Results */}
      <section className="arnfa-grid section-minor">
        <div className="col-content">
          {error && (
            <div className="font-thai rounded-2xl border border-hairline bg-surface p-6 text-ink-muted">
              ดูฟ้าตอนนี้ไม่ได้ — {error}. ลองใหม่อีกครั้งนะ (เราไม่เดาฟ้าให้)
            </div>
          )}

          {loading && (
            <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
              <div>
                <p className="font-thai text-sm text-ink-faint mb-4">กำลังอ่านฟ้า {district.districtTh}</p>
                <PlanSkeleton />
              </div>
              <div className="hidden lg:block h-[520px] rounded-3xl border border-hairline bg-surface/50 animate-pulse" />
            </div>
          )}

          {activePlan && !loading && (
            <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
              <div>
                {rainTargetSlot !== null && rainSlot === null && (
                  <button type="button" onClick={() => setRainSlot(rainTargetSlot)}
                    className="font-thai mb-5 w-full rounded-2xl border border-dashed border-rain/40 bg-rain/5 px-5 py-4 text-left text-sm text-ink-muted transition-colors hover:bg-rain/10 min-h-[44px]">
                    <span className="font-medium text-rain">ลองดู:</span> ถ้าฝนตกตอนบ่าย Arnfa จะทำยังไง? →
                  </button>
                )}

                {swap && rainSlot !== null && (
                  <div className="mb-5">
                    <SwapCard active
                      from={{ name: swap.dropped.poi.name, skyState: "storm", arrivalLabel: swap.dropped.arrivalLabel, reason: `ฝนเข้า ${swap.dropped.arrivalLabel}` }}
                      to={{ name: swap.added.poi.name, skyState: swap.added.skyState, arrivalLabel: swap.added.arrivalLabel, walkMin: 5, why: swap.added.reason }}
                      onAccept={() => setRainSlot(null)} onDismiss={() => setRainSlot(null)} />
                  </div>
                )}

                <ol className="space-y-3">
                  {activePlan.stops.map((stop, i) => (
                    <li key={stop.poi.id} className="flex items-start gap-4 rounded-2xl border border-hairline bg-surface/70 p-4">
                      <div className="relative shrink-0">
                        <PoiVisual id={stop.poi.id} category={stop.poi.category} skyState={stop.skyState} className="h-12 w-12" />
                        <span className="absolute -top-1.5 -left-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-ink text-paper text-xs font-semibold ring-2 ring-surface">{i + 1}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <h3 className="font-thai font-medium text-ink truncate">{stop.poi.name}</h3>
                          <SkyChip state={stop.skyState} arrivalLabel={stop.arrivalLabel} tempC={stop.tempC} rainProb={stop.rainProb} size="sm" />
                        </div>
                        <p className="font-thai text-sm text-ink-muted mt-1">
                          {categoryTh(stop.poi.category)} — {stop.reason}
                        </p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                          {stop.openStatus === "open" && <span className="text-success">เปิดอยู่</span>}
                          {stop.openStatus === "closed" && <span className="text-indoor-warm">ปิดตอนนี้</span>}
                          {stop.openStatus === "unknown" && <span className="text-ink-faint">เวลาเปิดไม่แน่ชัด</span>}
                          {stop.poi.profile.confidence < 0.5 && <span className="text-ink-faint">โปรไฟล์ยังไม่ชัด</span>}
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>

                {activePlan.stops.length === 0 && (
                  <p className="font-thai text-ink-faint py-8 text-center">ไม่มีที่แนะนำในเวลานี้ — ลองเพิ่มเวลาหรือเปลี่ยนย่านดู</p>
                )}

                {activePlan.stops.length > 0 && (
                  <div className="mt-6 flex items-center gap-3">
                    <ShareButton url={shareUrl} />
                    <span className="font-thai text-xs text-ink-faint">ส่งให้เพื่อนเปิดแพลนเดียวกัน</span>
                  </div>
                )}
              </div>

              <div className="h-[420px] lg:h-auto lg:min-h-[520px] lg:sticky lg:top-6">
                <PlanMap stops={activePlan.stops} center={center} />
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

export default function PlanPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <PlanInner />
    </Suspense>
  );
}

function categoryTh(cat: string): string {
  const map: Record<string, string> = {
    cafe: "คาเฟ่", restaurant: "ร้านอาหาร", bar: "บาร์", park: "สวน", garden: "สวน",
    market: "ตลาด", mall: "ห้าง", museum: "พิพิธภัณฑ์", gallery: "แกลเลอรี",
    library: "ห้องสมุด", viewpoint: "จุดชมวิว", playground: "สนามเด็กเล่น", other: "สถานที่",
  };
  return map[cat] ?? "สถานที่";
}
