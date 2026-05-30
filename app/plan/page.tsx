"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { clsx } from "clsx";
import thonglor from "@/data/seed/thonglor.json";
import ari from "@/data/seed/ari.json";
import silom from "@/data/seed/silom.json";
import { buildPlan, districtCentroid, type SeedDistrict, type BuiltPlan } from "@/lib/plan/buildPlan";
import type { HourlyForecast } from "@/lib/weather/types";
import { injectRainAt } from "@/lib/plan/rainInject";
import { SkyChip } from "@/components/SkyChip";
import { SwapCard } from "@/components/SwapCard";

const PlanMap = dynamic(() => import("@/components/PlanMap").then((m) => m.PlanMap), {
  ssr: false,
  loading: () => <div className="h-full w-full rounded-3xl border border-hairline bg-surface/60 animate-pulse" />,
});

const DISTRICTS: Record<string, SeedDistrict> = {
  thonglor: thonglor as SeedDistrict,
  ari: ari as SeedDistrict,
  silom: silom as SeedDistrict,
};

const BUDGETS = [
  { label: "ครึ่งวัน", min: 240 },
  { label: "เต็มวัน", min: 420 },
  { label: "แวบเดียว", min: 150 },
];

export default function PlanPage() {
  const [districtKey, setDistrictKey] = useState("thonglor");
  const [budgetMin, setBudgetMin] = useState(240);
  const [forecast, setForecast] = useState<HourlyForecast[] | null>(null);
  const [provider, setProvider] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rainSlot, setRainSlot] = useState<number | null>(null);

  const district = DISTRICTS[districtKey];
  const center = useMemo(() => districtCentroid(district), [district]);

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

  const startHourIndex = useMemo(() => {
    if (!forecast) return 0;
    const nowHour = new Date().getHours();
    const startHour = nowHour >= 9 && nowHour <= 16 ? nowHour : 10;
    const idx = forecast.findIndex((f) => new Date(f.hourISO).getHours() === startHour);
    return idx >= 0 ? idx : 0;
  }, [forecast]);

  const basePlan: BuiltPlan | null = useMemo(() => {
    if (!forecast) return null;
    return buildPlan(district, forecast, { startHourIndex, budgetMin, start: center });
  }, [district, forecast, startHourIndex, budgetMin, center]);

  const rainedPlan: BuiltPlan | null = useMemo(() => {
    if (!forecast || rainSlot === null) return null;
    return buildPlan(district, forecast, { startHourIndex, budgetMin, start: center, forecastOverride: injectRainAt(forecast, rainSlot, 2) });
  }, [district, forecast, rainSlot, startHourIndex, budgetMin, center]);

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

  return (
    <main className="relative z-10 min-h-screen px-5 py-8 sm:px-10 lg:px-16">
      <div className="mx-auto max-w-7xl">
        <div className="flex items-center justify-between mb-8">
          <Link href="/" className="font-display text-xl text-ink hover:text-ink-muted transition-colors">อ่านฟ้า</Link>
          <span className="font-thai text-sm text-ink-faint">{provider && `ฟ้าจาก ${provider}`}</span>
        </div>

        <section className="mb-8">
          <h1 className="font-display text-3xl sm:text-4xl font-light text-ink mb-6">
            วางแผนทริป — <span className="italic text-ink-muted">{district.districtTh}</span>
          </h1>
          <div className="flex flex-wrap gap-6">
            <div>
              <p className="font-thai text-xs uppercase tracking-wider text-ink-faint mb-2">ย่าน</p>
              <div className="flex gap-2">
                {Object.entries(DISTRICTS).map(([key, d]) => (
                  <button key={key} type="button" onClick={() => setDistrictKey(key)}
                    className={clsx("font-thai rounded-full px-4 py-2 text-sm transition-colors duration-[var(--dur-fast)]", key === districtKey ? "bg-ink text-paper" : "border border-hairline text-ink hover:bg-surface")}>
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
                    className={clsx("font-thai rounded-full px-4 py-2 text-sm transition-colors duration-[var(--dur-fast)]", b.min === budgetMin ? "bg-ink text-paper" : "border border-hairline text-ink hover:bg-surface")}>
                    {b.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {error && <div className="font-thai rounded-2xl border border-hairline bg-surface p-6 text-ink-muted">ดูฟ้าตอนนี้ไม่ได้ — {error}. ลองใหม่อีกครั้งนะ</div>}
        {loading && <div className="font-thai text-ink-faint py-12 text-center animate-pulse">กำลังอ่านฟ้า {district.districtTh}…</div>}

        {activePlan && !loading && (
          <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
            <section>
              {rainTargetSlot !== null && rainSlot === null && (
                <button type="button" onClick={() => setRainSlot(rainTargetSlot)}
                  className="font-thai mb-5 w-full rounded-2xl border border-dashed border-rain/40 bg-rain/5 px-5 py-4 text-left text-sm text-ink-muted transition-colors hover:bg-rain/10">
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
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink text-paper text-sm font-semibold">{i + 1}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <h3 className="font-thai font-medium text-ink truncate">{stop.poi.name}</h3>
                        <SkyChip state={stop.skyState} arrivalLabel={stop.arrivalLabel} tempC={stop.tempC} rainProb={stop.rainProb} size="sm" />
                      </div>
                      <p className="font-thai text-sm text-ink-muted mt-1">
                        {categoryTh(stop.poi.category)} · {stop.reason}
                        {stop.poi.profile.confidence < 0.5 && <span className="text-ink-faint"> · โปรไฟล์ยังไม่ชัด</span>}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>

              {activePlan.stops.length === 0 && <p className="font-thai text-ink-faint py-8 text-center">ไม่มีที่แนะนำในเวลานี้ — ลองเพิ่มเวลาหรือเปลี่ยนย่านดู</p>}
            </section>

            <section className="h-[420px] lg:h-auto lg:min-h-[520px] lg:sticky lg:top-8">
              <PlanMap stops={activePlan.stops} center={center} />
            </section>
          </div>
        )}
      </div>
    </main>
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
