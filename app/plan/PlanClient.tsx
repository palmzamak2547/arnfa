"use client";

import { Fragment, Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useLang } from "@/lib/i18n/useLang";
import { Masthead } from "@/components/Masthead";
import { SiteFooter } from "@/components/SiteFooter";
import { clsx } from "clsx";
import { bkkNow } from "@/lib/bkkNow";
import {
  buildPlan,
  type SeedDistrict,
  type BuiltPlan,
  type TasteVector,
} from "@/lib/plan/buildPlan";
import { DISTRICT_KEYS, districtMeta, loadDistrict } from "@/lib/poi/districts";
import type { HourlyForecast } from "@/lib/weather/types";
import { injectRainAt } from "@/lib/plan/rainInject";
import { decodePlanState, encodePlanState, DEFAULT_PLAN_STATE } from "@/lib/plan/shareState";
import { availableDays, startIndexForDay } from "@/lib/plan/days";
import { scoreDays, pickBestWorst } from "@/lib/core/dayScores";
import { loadTaste } from "@/lib/plan/taste";
import { recordFeedback } from "@/lib/plan/feedback";
import { applyCrowdRows, type CrowdRow } from "@/lib/poi/crowdApply";
import { CROWD_ENABLED } from "@/lib/poi/crowdEnabled";
import { getSupabase } from "@/lib/supabase/client";
import { StopFeedback } from "@/components/StopFeedback";
import { filterByGroups, availableGroups } from "@/lib/plan/categories";
import { categoryLabel } from "@/lib/plan/categoryLabel";
import { CategoryFilter } from "@/components/CategoryFilter";
import { dayAdvisory } from "@/lib/core/advisory";
import type { AirReading } from "@/lib/air/air4thai";
import { fetchActiveDeals, dealMatchesWeather, type Deal } from "@/lib/deals/deals";
import { TodayAdvisory } from "@/components/TodayAdvisory";
import { MerchantCTA } from "@/components/MerchantCTA";
import { BmaGreenSpaces } from "@/components/BmaGreenSpaces";
import { CoolingNearby } from "@/components/CoolingNearby";
import { SkyTimeline } from "@/components/SkyTimeline";
import { TransitNearby } from "@/components/TransitNearby";
import { RestAreasNearby } from "@/components/RestAreasNearby";
import { CityReports } from "@/components/CityReports";
import { GoThere } from "@/components/GoThere";
import { SkyAround } from "@/components/SkyAround";
import { LiveCompanion } from "@/components/LiveCompanion";
import { SkyChip } from "@/components/SkyChip";
import { SwapCard } from "@/components/SwapCard";
import { walkMinutes } from "@/lib/transport/route";
import { PlanSkeleton } from "@/components/PlanSkeleton";
import { AirChip } from "@/components/AirChip";
import { PoiPhoto } from "@/components/PoiPhoto";
import { mapsPoiUrl, mapsTripUrl } from "@/lib/poi/photo";
import { ShareButton } from "@/components/ShareButton";
import { TasteQuiz } from "@/components/TasteQuiz";
import { AreaHighlights } from "@/components/AreaHighlights";
import { SatelliteHaze } from "@/components/SatelliteHaze";
import { BeachConditions } from "@/components/BeachConditions";
import { hopEstimate, hopLabel, routedHopLabel } from "@/lib/plan/transit";
import { useAuth } from "@/lib/auth/useAuth";
import { saveTrip, loadCloudTaste, saveCloudTaste } from "@/lib/plan/trips";
import { DistrictPicker } from "@/components/DistrictPicker";

const PlanMap = dynamic(() => import("@/components/PlanMap").then((m) => m.PlanMap), {
  ssr: false,
  loading: () => <div className="h-full w-full rounded-3xl border border-hairline bg-surface/60 animate-pulse" />,
});

const BUDGETS = [
  { th: "แวบเดียว", en: "Quick", min: 150 },
  { th: "ครึ่งวัน", en: "Half day", min: 240 },
  { th: "เต็มวัน", en: "Full day", min: 420 },
];

function PlanInner() {
  // SSR + first paint = Thai (hydration-safe); flips to the chosen language after
  // global hydration, with no flash on client navigation. See lib/i18n/useLang.
  const { en, lang } = useLang();
  // Start from defaults so SSR and the first client render MATCH (no hydration
  // mismatch). The URL is read in an effect after mount and applied below.
  const [districtKey, setDistrictKey] = useState(DEFAULT_PLAN_STATE.district);
  const [budgetMin, setBudgetMin] = useState(DEFAULT_PLAN_STATE.budgetMin);
  const [dayOffset, setDayOffset] = useState(DEFAULT_PLAN_STATE.day);
  const [urlApplied, setUrlApplied] = useState(false);

  useEffect(() => {
    const q = window.location.search.slice(1);
    const s = decodePlanState(q, DISTRICT_KEYS);
    setDistrictKey(s.district);
    setBudgetMin(s.budgetMin);
    setDayOffset(s.day);
    setUrlApplied(true);
  }, []);
  const [forecast, setForecast] = useState<HourlyForecast[] | null>(null);
  const [provider, setProvider] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rainSlot, setRainSlot] = useState<number | null>(null);
  const [taste, setTaste] = useState<TasteVector | null>(null);
  const [quizOpen, setQuizOpen] = useState(false);
  const { user } = useAuth();
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");

  // District POIs load lazily (one chunk per district) so the bundle stays small
  // across all of Bangkok. Centre comes from the registry metadata (mean of the
  // district's POIs) and is available synchronously, so the forecast can fetch
  // immediately while the POI list streams in.
  const [districtData, setDistrictData] = useState<SeedDistrict | null>(null);
  const meta = districtMeta(districtKey);
  const districtTh = meta?.th ?? "";
  const districtEn = meta?.en ? meta.en.charAt(0).toUpperCase() + meta.en.slice(1) : "";
  const center = useMemo(() => ({ lat: meta?.lat ?? 13.7402, lng: meta?.lng ?? 100.5731 }), [meta?.lat, meta?.lng]);

  useEffect(() => {
    let cancelled = false;
    setDistrictData(null);
    loadDistrict(districtKey)
      .then((d) => { if (!cancelled) setDistrictData(d); })
      .catch(() => { if (!cancelled) setError("โหลดข้อมูลย่านไม่ได้ ลองใหม่นะ"); });
    return () => { cancelled = true; };
  }, [districtKey]);

  // Flywheel READ-BACK: pull the crowd aggregate (arnfa.poi_crowd, public read) for
  // this area's POIs, so the plan ranks on crowd-refined profiles and each stop can
  // show "เรียนรู้จาก N ครั้ง". Best-effort — no rows / no Supabase = seed profiles.
  const [crowdRows, setCrowdRows] = useState<CrowdRow[] | null>(null);
  useEffect(() => {
    if (!CROWD_ENABLED) return;
    let cancelled = false;
    setCrowdRows(null);
    if (!districtData) return;
    const sb = getSupabase();
    if (!sb) return;
    const ids = districtData.pois.map((p) => p.id);
    void sb.from("poi_crowd").select("poi_id, n, ok, bad, rain_ok, rain_bad").in("poi_id", ids)
      .then((res: { data: CrowdRow[] | null }) => { if (!cancelled) setCrowdRows(res.data ?? null); });
    return () => { cancelled = true; };
  }, [districtData]);

  // Real Air4Thai reading for this area — drives BOTH the chip and the day advisory
  // (and, when PM2.5 is unhealthy, the planner's outdoor penalty). One fetch.
  const [air, setAir] = useState<AirReading | null>(null);
  useEffect(() => {
    let cancelled = false;
    setAir(null);
    fetch(`/api/air?lat=${center.lat}&lng=${center.lng}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => { if (!cancelled) setAir(d); })
      .catch(() => { if (!cancelled) setAir(null); });
    return () => { cancelled = true; };
  }, [center.lat, center.lng]);

  // Real merchant deals (arnfa.deal) — keyed by POI id. Empty today; a chip shows
  // only when a real, weather-matching deal exists. Never fabricated.
  const [deals, setDeals] = useState<Map<string, Deal>>(new Map());
  useEffect(() => {
    let cancelled = false;
    fetchActiveDeals().then((m) => { if (!cancelled) setDeals(m); });
    return () => { cancelled = true; };
  }, []);

  // "อยากเที่ยวแนวไหน" — hard category-group filter the user controls.
  const [catGroups, setCatGroups] = useState<Set<string>>(new Set());
  const groupsHere = useMemo(() => availableGroups(districtData?.pois ?? []), [districtData]);
  // drop any selected group the new area doesn't have (keeps the filter honest)
  useEffect(() => {
    setCatGroups((prev) => {
      const next = new Set([...prev].filter((g) => groupsHere.has(g)));
      return next.size === prev.size ? prev : next;
    });
  }, [groupsHere]);
  const planDistrict = useMemo(() => {
    if (!districtData) return null;
    const pois = filterByGroups(districtData.pois, catGroups);
    // overlay crowd feedback so the engine ranks on refined profiles (the moat)
    return applyCrowdRows({ ...districtData, pois }, crowdRows);
  }, [districtData, catGroups, crowdRows]);

  // Load saved taste once; if none and the user hasn't dismissed, offer the quiz.
  useEffect(() => {
    const saved = loadTaste();
    if (saved) setTaste(saved);
    else if (typeof localStorage !== "undefined" && !localStorage.getItem("arnfa.taste.skipped")) {
      setQuizOpen(true);
    }
  }, []);

  // When signed in, the cloud taste wins (syncs across devices); close the quiz.
  useEffect(() => {
    if (!user) return;
    loadCloudTaste().then((v) => { if (v && Object.keys(v).length) { setTaste(v); setQuizOpen(false); } });
  }, [user]);

  async function doSave() {
    if (!user || !activePlan || activePlan.stops.length === 0) return;
    setSaveState("saving");
    const title = `${districtTh}${dayOffset ? ` · ${days.find((d) => d.offset === dayOffset)?.th ?? ""}` : ""}`;
    const stops = activePlan.stops.map((s) => ({ poiId: s.poi.id, slotIso: s.arrivalHourISO, score: s.score }));
    const id = await saveTrip(user.id, districtKey, budgetMin, dayOffset, title, stops);
    setSaveState(id ? "saved" : "idle");
  }
  // re-arm the Save button whenever the plan inputs change
  useEffect(() => { setSaveState("idle"); }, [districtKey, budgetMin, dayOffset, rainSlot]);

  // Fetch forecast for the district centroid.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setRainSlot(null);
    fetch(`/api/forecast?lat=${center.lat}&lng=${center.lng}&hours=168`)
      .then((r) => { if (!r.ok) throw new Error(`forecast ${r.status}`); return r.json(); })
      .then((data) => { if (!cancelled) { setForecast(data.hours); setProvider(data.providerUsed ?? ""); } })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : String(e)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [districtKey, center.lat, center.lng]);

  // Keep the URL in sync (shareable, back-button friendly) — replaceState, no reload.
  // Wait until the initial URL has been applied so we don't clobber ?y=... with defaults.
  useEffect(() => {
    if (typeof window === "undefined" || !urlApplied) return;
    const qs = encodePlanState({ district: districtKey, budgetMin, rain: rainSlot !== null, day: dayOffset });
    window.history.replaceState(null, "", `${window.location.pathname}?${qs}`);
  }, [districtKey, budgetMin, rainSlot, dayOffset, urlApplied]);

  // Which days the forecast covers (today..+6) and the start-hour index for the
  // chosen day — so you can plan "this weekend", not just today.
  const days = useMemo(() => (forecast ? availableDays(forecast, bkkNow()) : []), [forecast]);
  // "ไปวันไหนดี" — score each day's sky from the loaded forecast (no extra fetch) so the
  // selector can flag the best + worst day this week and dot each day by its sky.
  const dayScores = useMemo(() => (forecast ? scoreDays(forecast, bkkNow()) : []), [forecast]);
  const dayVerdictByOffset = useMemo(() => new Map(dayScores.map((d) => [d.offset, d.verdict])), [dayScores]);
  const { best: bestDay, worst: worstDay } = useMemo(() => pickBestWorst(dayScores), [dayScores]);
  const startHourIndex = useMemo(
    () => (forecast ? startIndexForDay(forecast, dayOffset, bkkNow()) : 0),
    [forecast, dayOffset],
  );

  // "เตรียมตัววันนี้" — outfit + packing + safety, from the trip-window forecast +
  // real PM2.5. Its outdoorPenalty is the safety lever fed to the planner below.
  const advisory = useMemo(() => {
    if (!forecast) return null;
    const window = forecast.slice(startHourIndex, startHourIndex + Math.ceil(budgetMin / 60) + 1);
    return dayAdvisory(window.length ? window : forecast, air ? { pm25: air.pm25, level: air.level } : null);
  }, [forecast, startHourIndex, budgetMin, air]);
  const outdoorPenalty = advisory?.outdoorPenalty ?? 0;

  const basePlan: BuiltPlan | null = useMemo(() => {
    if (!forecast || !planDistrict) return null;
    return buildPlan(planDistrict, forecast, { startHourIndex, budgetMin, start: center, taste: taste ?? undefined, outdoorPenalty });
  }, [planDistrict, forecast, startHourIndex, budgetMin, center, taste, outdoorPenalty]);

  const rainedPlan: BuiltPlan | null = useMemo(() => {
    if (!forecast || !planDistrict || rainSlot === null) return null;
    return buildPlan(planDistrict, forecast, { startHourIndex, budgetMin, start: center, taste: taste ?? undefined, outdoorPenalty, forecastOverride: injectRainAt(forecast, rainSlot, 2) });
  }, [planDistrict, forecast, rainSlot, startHourIndex, budgetMin, center, taste, outdoorPenalty]);

  const activePlan = rainedPlan ?? basePlan;

  // Upgrade the displayed hops to EXACT OpenRouteService walking times when an ORS key is
  // configured (dormant otherwise — the road-realistic estimate stays). Keyed by the index
  // of the stop the hop leads INTO.
  const [routedHops, setRoutedHops] = useState<Record<number, { minutes: number; meters: number }>>({});
  useEffect(() => {
    setRoutedHops({});
    const stops = activePlan?.stops ?? [];
    if (stops.length < 2) return;
    let cancelled = false;
    const legs = stops.slice(1).map((s, i) => [[stops[i].poi.lng, stops[i].poi.lat], [s.poi.lng, s.poi.lat]]);
    fetch("/api/route", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ legs }) })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        if (cancelled || !d?.available) return;
        const map: Record<number, { minutes: number; meters: number }> = {};
        (d.legs ?? []).forEach((leg: { minutes: number; meters: number } | null, i: number) => { if (leg) map[i + 1] = leg; });
        setRoutedHops(map);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [activePlan]);

  const swap = useMemo(() => {
    if (!basePlan || !rainedPlan) return null;
    // Primary: the planner genuinely reordered — a stop dropped, a new one added.
    const baseIds = new Set(basePlan.stops.map((s) => s.poi.id));
    const rainedIds = new Set(rainedPlan.stops.map((s) => s.poi.id));
    const dropped = basePlan.stops.find((s) => !rainedIds.has(s.poi.id));
    const added = rainedPlan.stops.find((s) => !baseIds.has(s.poi.id));
    if (dropped && added) return { dropped, added };

    // Fallback so the signature moment ALWAYS fires when rain is triggered:
    // take the most-exposed stop in the plan and name the best nearby indoor
    // alternative not already on the itinerary (covered + rain-friendly).
    if (basePlan.stops.length === 0) return null;
    let exposed = basePlan.stops[0];
    for (const s of basePlan.stops) if (s.poi.profile.outdoorness > exposed.poi.profile.outdoorness) exposed = s;
    const onPlan = new Set(basePlan.stops.map((s) => s.poi.id));
    let indoor: typeof exposed["poi"] | null = null;
    let bestScore = -1;
    for (const p of planDistrict?.pois ?? []) {
      if (onPlan.has(p.id)) continue;
      const score = p.profile.indoorness * 0.6 + p.profile.rainEnjoyment * 0.4 + p.profile.covered * 0.2;
      if (score > bestScore) { bestScore = score; indoor = p; }
    }
    if (!indoor || exposed.poi.profile.outdoorness < 0.3) return null;
    return {
      dropped: exposed,
      added: { ...exposed, poi: indoor, skyState: "clear" as const, reason: "ในร่มแบบดีตอนฝน หลบสบาย" },
    };
  }, [basePlan, rainedPlan, planDistrict]);

  const rainTargetSlot = useMemo(() => {
    if (!basePlan || basePlan.stops.length === 0) return null;
    let best = basePlan.stops[0];
    for (const s of basePlan.stops) if (s.poi.profile.outdoorness > best.poi.profile.outdoorness) best = s;
    const idx = forecast?.findIndex((f) => f.hourISO === best.arrivalHourISO) ?? -1;
    return idx >= 0 ? idx : null;
  }, [basePlan, forecast]);

  const shareUrl = useMemo(
    () => `/plan?${encodePlanState({ district: districtKey, budgetMin, rain: rainSlot !== null, day: dayOffset })}`,
    [districtKey, budgetMin, rainSlot, dayOffset],
  );

  function finishQuiz(v: TasteVector) {
    setTaste(v);
    setQuizOpen(false);
    if (user) saveCloudTaste(user.id, v); // sync taste to the account
  }
  function skipQuiz() {
    setQuizOpen(false);
    try { localStorage.setItem("arnfa.taste.skipped", "1"); } catch { /* ignore */ }
  }

  return (
    <main className="relative z-10 min-h-screen">
      <Masthead />

      {/* Controls */}
      <section className="arnfa-grid">
        <div className="col-content">
          <h1 className="font-thai-serif fs-h2 font-light text-ink mb-2 text-balance">
            {lang === "zh" ? "规划行程" : en ? "Plan a trip" : "วางแผนทริป"} — <span className="italic text-ink-muted">{en ? districtEn : districtTh}</span>
          </h1>
          <div className="flex items-center gap-3 mb-7">
            <AirChip lat={center.lat} lng={center.lng} reading={air} />
            {provider && <span className="hidden font-thai text-xs text-ink-faint sm:inline">{en ? `sky via ${provider}` : `ฟ้าจาก ${provider}`}</span>}
            {!taste && !quizOpen && (
              <button type="button" onClick={() => setQuizOpen(true)} className="font-thai text-sm text-rain hover:underline min-h-[44px]">
                {en ? "Tune to your taste →" : "ปรับให้ตรงใจ →"}
              </button>
            )}
            {taste && (
              <span className="font-thai text-xs text-ink-faint">{en ? "tuned to your taste" : "ปรับตามรสนิยมคุณแล้ว"}</span>
            )}
          </div>

          {quizOpen && (
            <div className="mb-8 max-w-2xl">
              <TasteQuiz onDone={finishQuiz} onSkip={skipQuiz} />
            </div>
          )}

          <div className="flex flex-wrap gap-x-8 gap-y-5">
            <div>
              <p className="font-thai text-xs uppercase tracking-wider text-ink-faint mb-2">{lang === "zh" ? "区域" : en ? "Area" : "ย่าน"}</p>
              <DistrictPicker value={districtKey} onChange={setDistrictKey} />
            </div>
            <div>
              <p className="font-thai text-xs uppercase tracking-wider text-ink-faint mb-2">{lang === "zh" ? "时间" : en ? "Time" : "เวลา"}</p>
              <div className="flex gap-2">
                {BUDGETS.map((b) => (
                  <button key={b.min} type="button" onClick={() => setBudgetMin(b.min)}
                    className={clsx("font-thai rounded-full px-4 py-2 text-sm transition-colors duration-[var(--dur-fast)] min-h-[44px]", b.min === budgetMin ? "bg-ink text-paper" : "border border-hairline text-ink hover:bg-surface")}>
                    {en ? b.en : b.th}
                  </button>
                ))}
              </div>
            </div>
            {days.length > 1 && (
              <div>
                <p className="font-thai text-xs uppercase tracking-wider text-ink-faint mb-2">{lang === "zh" ? "日期" : en ? "Day" : "วัน"}</p>
                {bestDay && worstDay && (
                  <button type="button" onClick={() => setDayOffset(bestDay.offset)}
                    className="font-thai mb-2.5 inline-flex items-center gap-2 rounded-full border border-success/40 bg-success/[0.07] px-3.5 py-1.5 text-xs text-ink-muted transition-colors hover:bg-success/[0.12]">
                    <span aria-hidden>💡</span>
                    {en
                      ? <>Best sky this week: <span className="font-medium text-ink">{days.find((d) => d.offset === bestDay.offset)?.en}</span> — avoid {days.find((d) => d.offset === worstDay.offset)?.en}</>
                      : <>ฟ้าดีสุดสัปดาห์นี้ <span className="font-medium text-ink">{days.find((d) => d.offset === bestDay.offset)?.th}</span> — เลี่ยง {days.find((d) => d.offset === worstDay.offset)?.th}</>}
                  </button>
                )}
                <div className="flex flex-wrap gap-2">
                  {days.map((d) => {
                    const v = dayVerdictByOffset.get(d.offset);
                    const dot = v ? ({ clearish: "var(--arnfa-success)", ok: "var(--arnfa-accent-sun)", closing: "var(--arnfa-accent-rain)", poor: "var(--arnfa-accent-indoor-warm)" } as Record<string, string>)[v] : null;
                    return (
                      <button key={d.offset} type="button" onClick={() => setDayOffset(d.offset)}
                        className={clsx("font-thai inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm transition-colors duration-[var(--dur-fast)] min-h-[44px]", d.offset === dayOffset ? "bg-ink text-paper" : "border border-hairline text-ink hover:bg-surface")}>
                        {dot && <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: dot }} aria-hidden />}
                        {en ? d.en : d.th}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="mt-5">
            <CategoryFilter available={groupsHere} selected={catGroups} onChange={setCatGroups} />
          </div>
        </div>
      </section>

      {/* Today's prep + microclimate compare + live companion — all from real data */}
      {advisory && (
        <section className="arnfa-grid mt-1">
          <div className="col-content grid items-start gap-4 lg:grid-cols-2 max-w-4xl">
            <TodayAdvisory advisory={advisory} lat={center.lat} lng={center.lng} dayOffset={dayOffset} />
            <div className="grid gap-4">
              <BeachConditions lat={center.lat} lng={center.lng} />
              <SkyAround currentKey={districtKey} lat={center.lat} lng={center.lng} onPick={setDistrictKey} />
              <LiveCompanion pois={districtData?.pois ?? []} />
              <SatelliteHaze lat={center.lat} lng={center.lng} airLevel={air?.level} />
            </div>
          </div>
        </section>
      )}

      {/* Results */}
      <section className="arnfa-grid section-minor">
        <div className="col-content">
          {error && (
            <div className="font-thai rounded-2xl border border-hairline bg-surface p-6 text-ink-muted">
              {en ? `Can't read the sky right now — ${error}. Try again (we never guess the weather).` : `ดูฟ้าตอนนี้ไม่ได้ — ${error}. ลองใหม่อีกครั้งนะ (เราไม่เดาฟ้าให้)`}
            </div>
          )}

          {(!activePlan || loading) && !error && (
            <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
              <div>
                <p className="font-thai text-sm text-ink-faint mb-4">{en ? `Reading the sky — ${districtEn}` : `กำลังอ่านฟ้า ${districtTh}`}</p>
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
                    <span className="font-medium text-rain">{en ? "Try:" : "ลองดู:"}</span> {en ? "what if it rains this afternoon?" : "ถ้าฝนตกตอนบ่าย Arnfah จะทำยังไง?"} →
                  </button>
                )}

                {swap && rainSlot !== null && (
                  <div className="mb-5">
                    <SwapCard active
                      from={{ name: swap.dropped.poi.name, skyState: "storm", arrivalLabel: swap.dropped.arrivalLabel, reason: lang === "zh" ? `${swap.dropped.arrivalLabel} 有雨` : en ? `rain by ${swap.dropped.arrivalLabel}` : `ฝนเข้า ${swap.dropped.arrivalLabel}` }}
                      to={{ name: swap.added.poi.name, skyState: swap.added.skyState, arrivalLabel: swap.added.arrivalLabel, walkMin: Math.max(1, Math.round(walkMinutes(swap.dropped.poi.lat, swap.dropped.poi.lng, swap.added.poi.lat, swap.added.poi.lng))), why: lang === "zh" ? "适合避雨的舒适室内" : en ? "a comfy indoor spot for the rain" : "ในร่มแบบดีตอนฝน หลบสบาย" }}
                      onAccept={() => {
                        // flywheel: user took the rain-swap suggestion → that POI fits rain
                        recordFeedback(swap.added.poi.id, "accept_swap", { inRain: true, context: { from: swap.dropped.poi.id, district: districtKey } });
                        setRainSlot(null);
                      }}
                      onDismiss={() => {
                        recordFeedback(swap.added.poi.id, "dismiss", { context: { from: swap.dropped.poi.id, district: districtKey } });
                        setRainSlot(null);
                      }} />
                  </div>
                )}

                <SkyTimeline forecast={forecast ?? []} stops={activePlan.stops} startHourIndex={startHourIndex} />

                <ol className="space-y-3">
                  {activePlan.stops.map((stop, i) => {
                    const deal = deals.get(stop.poi.id);
                    const showDeal = !!deal && dealMatchesWeather(deal.weatherTrigger, stop.skyState);
                    const prev = i > 0 ? activePlan.stops[i - 1] : null;
                    return (
                    <Fragment key={stop.poi.id}>
                    {prev && (
                      <li className="-my-1 flex items-center gap-3 pl-[10px] font-thai text-xs text-ink-faint" aria-hidden>
                        <span className="flex w-6 justify-center"><span className="h-7 w-px bg-hairline" /></span>
                        <span>{routedHops[i] ? `🧭 ${routedHopLabel(routedHops[i].minutes, routedHops[i].meters, en)}` : hopLabel(hopEstimate(prev.poi.lat, prev.poi.lng, stop.poi.lat, stop.poi.lng), en)}</span>
                      </li>
                    )}
                    <li className="flex items-start gap-4 rounded-2xl border border-hairline border-l-[3px] bg-surface/70 p-4"
                      style={{ borderLeftColor: ({ clear: "var(--arnfa-accent-sun)", partly: "var(--arnfa-success)", cloudy: "var(--arnfa-hairline)", rain: "var(--arnfa-accent-rain)", storm: "var(--arnfa-accent-indoor-warm)", night: "#4A5878" } as Record<string, string>)[stop.skyState] ?? "var(--arnfa-hairline)" }}>
                      <div className="relative shrink-0">
                        <PoiPhoto poi={stop.poi} skyState={stop.skyState} className="h-14 w-14" />
                        <span className="absolute -top-1.5 -left-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-ink text-paper text-xs font-semibold ring-2 ring-surface">{i + 1}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <h3 className="font-thai font-medium text-ink truncate">{stop.poi.name}</h3>
                          <SkyChip state={stop.skyState} arrivalLabel={stop.arrivalLabel} tempC={stop.tempC} rainProb={stop.rainProb} size="sm" />
                        </div>
                        <p className="font-thai text-sm text-ink-muted mt-1">
                          {categoryLabel(stop.poi.category, en)} — {stop.reason}
                        </p>
                        {showDeal && deal && (
                          <a {...(deal.url ? { href: deal.url, target: "_blank", rel: "noopener noreferrer" } : {})}
                            className="font-thai mt-1.5 inline-flex items-center gap-1.5 rounded-full border border-sun/40 bg-sun/[0.08] px-2.5 py-1 text-xs text-ink">
                            <span aria-hidden>🏷️</span>
                            <span className="font-medium">{deal.title}</span>
                            <span className="text-ink-faint">· {deal.merchantName}</span>
                          </a>
                        )}
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                          {stop.openStatus === "open" && <span className="text-success">{en ? "open now" : "เปิดอยู่"}</span>}
                          {stop.openStatus === "closed" && <span className="text-indoor-warm">{en ? "closed now" : "ปิดตอนนี้"}</span>}
                          {stop.openStatus === "unknown" && <span className="text-ink-faint">{en ? "hours unclear" : "เวลาเปิดไม่แน่ชัด"}</span>}
                          {stop.poi.crowd && stop.poi.crowd.n >= 3 ? (
                            <span className="inline-flex items-center gap-1 text-success" title={en ? "refined by real visitors" : "ปรับจากฟีดแบ็กจริงของคนที่ไปมา"}>
                              <span aria-hidden>✦</span>{en ? `learned from ${stop.poi.crowd.n}` : `เรียนรู้จาก ${stop.poi.crowd.n} ครั้ง`}, {Math.round(stop.poi.crowd.okRate * 100)}% {en ? "ok" : "โอเค"}
                            </span>
                          ) : stop.poi.profile.confidence < 0.5 ? (
                            <span className="text-ink-faint">{en ? "profile unsure" : "โปรไฟล์ยังไม่ชัด"}</span>
                          ) : null}
                          <a href={mapsPoiUrl(stop.poi.lat, stop.poi.lng, stop.poi.name)} target="_blank" rel="noopener noreferrer" className="text-rain hover:underline">{en ? "navigate ↗" : "นำทาง ↗"}</a>
                          {stop.poi.website && <a href={stop.poi.website} target="_blank" rel="noopener noreferrer" className="text-rain hover:underline">{en ? "website ↗" : "เว็บไซต์ ↗"}</a>}
                        </div>
                        {CROWD_ENABLED && <StopFeedback poiId={stop.poi.id} skyState={stop.skyState} rainProb={stop.rainProb} district={districtKey} en={en} />}
                      </div>
                    </li>
                    </Fragment>
                  ); })}
                </ol>

                {activePlan.stops.length === 0 && (
                  <p className="font-thai text-ink-faint py-8 text-center">{en ? "Nothing fits right now — try more time, another area, or a different vibe." : "ไม่มีที่แนะนำในเวลานี้ — ลองเพิ่มเวลา เปลี่ยนย่าน หรือเปลี่ยนแนวดู"}</p>
                )}

                {activePlan.stops.length > 0 && (
                  <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2">
                    <ShareButton url={shareUrl} />
                    {user ? (
                      <button type="button" onClick={doSave} disabled={saveState !== "idle"}
                        className="font-thai inline-flex h-11 items-center gap-1.5 rounded-full bg-ink px-5 text-sm text-paper transition-colors hover:bg-ink-muted disabled:opacity-60">
                        {saveState === "saved" ? (en ? "Saved ✓" : "บันทึกแล้ว ✓") : saveState === "saving" ? (en ? "Saving…" : "กำลังเซฟ…") : (en ? "Save trip" : "เซฟทริป")}
                      </button>
                    ) : (
                      <Link href="/trips" className="font-thai inline-flex h-11 items-center rounded-full border border-hairline px-5 text-sm text-ink transition-colors hover:bg-surface">
                        {en ? "Sign in to save" : "เข้าสู่ระบบเพื่อเซฟ"}
                      </Link>
                    )}
                    <a href={mapsTripUrl(activePlan.stops.map((s) => ({ lat: s.poi.lat, lng: s.poi.lng })))} target="_blank" rel="noopener noreferrer"
                      className="font-thai inline-flex h-11 items-center gap-1.5 rounded-full border border-hairline px-5 text-sm text-ink transition-colors hover:bg-surface">
                      {en ? "Open in Google Maps ↗" : "เปิดใน Google Maps ↗"}
                    </a>
                  </div>
                )}
                <div className="mt-6 space-y-4">
                  <TransitNearby lat={center.lat} lng={center.lng} />
                  <GoThere districtKey={districtKey} areaTh={districtTh} areaEn={districtEn} stayIn={outdoorPenalty > 0.25} />
                  {/* Rest stops are a road-trip thing → only for drive-to destinations, not walkable city areas */}
                  {(meta?.tier === "province" || meta?.tier === "spot") && <RestAreasNearby lat={center.lat} lng={center.lng} />}
                  <CoolingNearby lat={center.lat} lng={center.lng} active={outdoorPenalty > 0.15 || (!!air && (air.pm25 ?? 0) > 37.5)} />
                  <BmaGreenSpaces lat={center.lat} lng={center.lng} />
                  <CityReports lat={center.lat} lng={center.lng} />
                </div>
                <div className="mt-6 border-t border-hairline pt-5">
                  <MerchantCTA />
                </div>
              </div>

              <div className="h-[420px] lg:h-auto lg:min-h-[520px] lg:sticky lg:top-6">
                <PlanMap stops={activePlan.stops} center={center} />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Real photos of notable, photo-linked places in this area (Wikimedia Commons) */}
      {districtData && <AreaHighlights pois={districtData.pois} />}

      <SiteFooter />
    </main>
  );
}

export function PlanClient() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <PlanInner />
    </Suspense>
  );
}
