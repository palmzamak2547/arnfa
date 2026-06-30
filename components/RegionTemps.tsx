"use client";

import { useEffect, useState } from "react";
import { useLang } from "@/lib/i18n/useLang";

/**
 * RegionTemps — the mockup's Coverage region strip: one live temperature per Thai region + a
 * "Bangkok live" cell. REAL data (Iron Rule 0): each region's value is its top-ranked area's
 * current temp + sky verdict from /api/where (the same ranking the home pick + /where use), so
 * nothing is fabricated. Renders nothing until the data lands (no placeholder temps).
 */
type Area = { key: string; th: string; en: string; zone: string; tempC: number; rainProb: number; verdict: string };

const REGIONS = [
  { zone: "ภาคเหนือ", th: "เหนือ", en: "North" },
  // the registry labels the Northeast zone "ภาคอีสาน" (not "ภาคตะวันออกเฉียงเหนือ")
  { zone: "ภาคอีสาน", th: "อีสาน", en: "Northeast" },
  { zone: "ภาคกลาง", th: "กลาง", en: "Central" },
  { zone: "ภาคตะวันออก", th: "ตะวันออก", en: "East" },
  { zone: "ภาคตะวันตก", th: "ตะวันตก", en: "West" },
  { zone: "ภาคใต้", th: "ใต้", en: "South" },
];
const VDOT: Record<string, string> = {
  clearish: "var(--arnfa-success)", ok: "var(--arnfa-accent-sun)",
  closing: "var(--arnfa-accent-rain)", poor: "var(--arnfa-accent-indoor-warm)",
};

export function RegionTemps() {
  const { en } = useLang();
  const [areas, setAreas] = useState<Area[] | null>(null);

  useEffect(() => {
    let c = false;
    fetch("/api/where?day=0")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => { if (!c) setAreas(d.areas ?? []); })
      .catch(() => {});
    return () => { c = true; };
  }, []);

  if (!areas || !areas.length) return null; // honest: never show a fabricated temp

  // areas are sorted clearest-first, so the first match per zone is that region's best sky
  const topOf = (zone: string) => areas.find((a) => a.zone === zone);
  const cells = REGIONS.map((r) => ({ ...r, a: topOf(r.zone) })).filter((x): x is typeof x & { a: Area } => !!x.a);
  const bkk = areas.find((a) => a.zone === "ย่านยอดนิยม") ?? topOf("ภาคกลาง");
  if (!cells.length) return null;

  return (
    <div className="mt-8 flex flex-wrap items-end gap-x-[clamp(16px,2.4vw,30px)] gap-y-4 border-t border-hairline pt-6">
      {cells.map(({ th, en: enL, a }) => (
        <div key={th} className="flex min-w-[78px] flex-[1_0_auto] flex-col gap-1.5">
          <span className="font-display text-[0.64rem] uppercase tracking-[0.16em] text-ink-faint">{en ? enL : th}</span>
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 flex-none rounded-full" style={{ background: VDOT[a.verdict] ?? "var(--arnfa-ink-faint)" }} aria-hidden />
            <span className="font-thai-serif text-[1.32rem] font-light tabular-nums text-ink">{a.tempC}°</span>
          </span>
        </div>
      ))}
      {bkk && (
        <div className="flex min-w-[124px] flex-[2_0_auto] flex-col gap-1.5 border-l border-hairline pl-[clamp(16px,2.4vw,30px)]">
          <span className="font-display text-[0.64rem] uppercase tracking-[0.16em] text-indoor-warm">{en ? "Bangkok today" : "กรุงเทพฯ วันนี้"}</span>
          <span className="flex items-baseline gap-2">
            <span className="font-thai-serif text-[1.32rem] font-light tabular-nums text-ink">{bkk.tempC}°</span>
            <span className="font-thai text-[0.8rem] text-ink-muted">{en ? "day's high, by area" : "สูงสุด รายย่าน"}</span>
          </span>
        </div>
      )}
    </div>
  );
}
