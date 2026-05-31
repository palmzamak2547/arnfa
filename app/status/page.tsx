"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { Logo } from "@/components/Logo";
import { DISTRICTS } from "@/lib/poi/districts";

/**
 * /status — honest system status. Every row is a REAL client-side probe of a live
 * endpoint (timed), not a hardcoded "all good". Coverage numbers come straight from
 * the registry. No uptime is fabricated; if an endpoint is down it says so.
 */

type Status = "checking" | "ok" | "slow" | "down";
type Check = { status: Status; ms: number };

const SERVICES = [
  { key: "forecast", th: "พยากรณ์อากาศ", en: "Forecast", url: "/api/forecast?lat=13.7563&lng=100.5018&hours=3" },
  { key: "air", th: "ฝุ่น PM2.5 (Air4Thai)", en: "Air quality (Air4Thai)", url: "/api/air?lat=13.7563&lng=100.5018" },
  { key: "nowcast", th: "ฝนใน 2 ชม.", en: "Rain nowcast", url: "/api/nowcast?lat=13.7563&lng=100.5018" },
  { key: "radar", th: "เรดาร์ฝน", en: "Rain radar", url: "/api/radar" },
];

const SOURCES = ["Open-Meteo", "MET Norway", "OpenStreetMap", "OpenFreeMap", "Air4Thai (PCD)", "RainViewer"];

const DOT: Record<Status, string> = {
  checking: "var(--arnfa-ink-faint)", ok: "var(--arnfa-success)",
  slow: "var(--arnfa-accent-sun)", down: "var(--arnfa-accent-indoor-warm)",
};

export default function StatusPage() {
  const { i18n } = useTranslation();
  const [checks, setChecks] = useState<Record<string, Check>>({});
  const [checkedAt, setCheckedAt] = useState<string>("");
  const [mounted, setMounted] = useState(false);
  // Gate language on mount so SSR + first paint match (no React #418).
  const en = mounted && i18n.language === "en";

  const runChecks = useCallback(async () => {
    setChecks(Object.fromEntries(SERVICES.map((s) => [s.key, { status: "checking" as Status, ms: 0 }])));
    await Promise.all(
      SERVICES.map(async (s) => {
        const t0 = performance.now();
        let status: Status = "down";
        try {
          const r = await fetch(s.url, { cache: "no-store" });
          const ms = Math.round(performance.now() - t0);
          status = r.ok ? (ms > 2500 ? "slow" : "ok") : "down";
          setChecks((c) => ({ ...c, [s.key]: { status, ms } }));
          return;
        } catch {
          setChecks((c) => ({ ...c, [s.key]: { status: "down", ms: Math.round(performance.now() - t0) } }));
        }
      }),
    );
    setCheckedAt(new Date().toLocaleTimeString(en ? "en-GB" : "th-TH", { hour: "2-digit", minute: "2-digit" }));
  }, [en]);

  useEffect(() => { setMounted(true); runChecks(); }, [runChecks]);

  const statuses = Object.values(checks).map((c) => c.status);
  const allOk = mounted && statuses.length === SERVICES.length && statuses.every((s) => s === "ok");
  const anyDown = statuses.some((s) => s === "down");
  const overall: Status = !mounted || statuses.includes("checking") ? "checking" : anyDown ? "down" : allOk ? "ok" : "slow";

  const totalPois = DISTRICTS.reduce((a, d) => a + d.count, 0);
  const provinces = DISTRICTS.filter((d) => d.tier === "province").length;
  const regions = new Set(DISTRICTS.map((d) => d.zone)).size;

  return (
    <main className="relative z-10 min-h-screen">
      <header className="arnfa-grid section-minor pad-safe-t">
        <div className="col-content flex items-center justify-between">
          <Link href="/" className="text-ink hover:text-ink-muted transition-colors"><Logo className="text-xl" animate={false} /></Link>
          <Link href="/plan" className="font-thai text-sm text-rain hover:underline">{en ? "Plan a trip →" : "วางแผนทริป →"}</Link>
        </div>
      </header>

      <section className="arnfa-grid">
        <div className="col-content max-w-2xl">
          <h1 className="font-thai-serif fs-h2 font-light text-ink mb-2">{en ? "System status" : "สถานะระบบ"}</h1>
          <div className="flex items-center gap-2.5 mb-8">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: DOT[overall] }} aria-hidden />
            <p className="font-thai text-ink-muted">
              {overall === "checking" ? (en ? "Checking…" : "กำลังตรวจสอบ…")
                : overall === "ok" ? (en ? "All systems normal" : "ทุกระบบทำงานปกติ")
                : overall === "down" ? (en ? "Some services are down" : "บางบริการมีปัญหา")
                : (en ? "Running slow" : "บางบริการช้ากว่าปกติ")}
            </p>
          </div>

          {/* live service probes */}
          <ul className="rounded-3xl border border-hairline bg-surface/70 divide-y divide-hairline overflow-hidden">
            {SERVICES.map((s) => {
              const c = checks[s.key];
              const st = c?.status ?? "checking";
              return (
                <li key={s.key} className="flex items-center justify-between gap-3 px-5 py-3.5">
                  <span className="flex items-center gap-2.5 min-w-0">
                    <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: DOT[st] }} aria-hidden />
                    <span className="font-thai text-sm text-ink truncate">{en ? s.en : s.th}</span>
                  </span>
                  <span className="font-thai shrink-0 text-xs tabular-nums text-ink-faint">
                    {st === "checking" ? "…" : st === "down" ? (en ? "down" : "ขัดข้อง") : `${c.ms} ms`}
                  </span>
                </li>
              );
            })}
          </ul>

          <div className="mt-4 flex items-center gap-3">
            <button type="button" onClick={runChecks} className="font-thai inline-flex min-h-[40px] items-center rounded-full border border-hairline px-4 text-sm text-ink transition-colors hover:bg-surface">
              {en ? "Re-check" : "ตรวจอีกครั้ง"}
            </button>
            {checkedAt && <span className="font-thai text-xs text-ink-faint">{en ? `checked at ${checkedAt}` : `ตรวจเมื่อ ${checkedAt} น.`}</span>}
          </div>

          {/* coverage — straight from the registry, never fabricated */}
          <h2 className="font-thai-serif text-lg font-light text-ink mt-12 mb-4">{en ? "Coverage" : "ความครอบคลุม"}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-6 rounded-3xl border border-hairline bg-surface/70 p-6">
            {[
              { n: DISTRICTS.length, th: "พื้นที่", en: "areas" },
              { n: provinces, th: "จังหวัด", en: "provinces" },
              { n: regions, th: "กลุ่มภูมิภาค", en: "regions" },
              { n: totalPois, th: "สถานที่จริง", en: "real places" },
            ].map((s) => (
              <div key={s.en}>
                <div className="font-display text-3xl text-ink tabular-nums">{s.n.toLocaleString()}</div>
                <p className="font-thai text-xs text-ink-faint mt-1">{en ? s.en : s.th}</p>
              </div>
            ))}
          </div>

          <h2 className="font-thai-serif text-lg font-light text-ink mt-12 mb-3">{en ? "Data sources" : "แหล่งข้อมูล"}</h2>
          <div className="flex flex-wrap gap-2">
            {SOURCES.map((s) => (
              <span key={s} className="font-thai inline-flex items-center rounded-full border border-hairline bg-paper px-3 py-1.5 text-xs text-ink-muted">{s}</span>
            ))}
          </div>
          <p className="font-thai text-xs text-ink-faint mt-4">
            {en ? "Every status here is a live probe — we never fake uptime, and never fabricate a forecast." : "สถานะทุกอย่างเช็คสดจริง — เราไม่ปลอม uptime และไม่กุพยากรณ์อากาศ"}
          </p>
        </div>
      </section>
    </main>
  );
}
