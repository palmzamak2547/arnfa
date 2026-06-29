"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { useLang } from "@/lib/i18n/useLang";

/**
 * ArnfaRibbon — the mockup's "next six hours" strip: a temperature CURVE with a sky-glyph + temp
 * at each hour (line = temperature, marker = the sky). Every point is the REAL Bangkok forecast
 * (Open-Meteo); the caption is derived from that data, never hard-coded. If the forecast is down
 * it hides rather than draw a fake sky (Iron Rule 0).
 */
type Hour = { label: string; tempC: number; rainProb: number; cloudCover: number };
type Sky = "sun" | "partly" | "cloud" | "rain";

const BKK = { lat: 13.7563, lng: 100.5018 };
const SKY_COLOR: Record<Sky, string> = { sun: "#F2A65A", partly: "#7BA68A", cloud: "#4B5263", rain: "#5B7FB8" };

function skyOf(h: Hour): Sky {
  if (h.rainProb > 0.4) return "rain";
  if (h.cloudCover > 0.65) return "cloud";
  if (h.cloudCover > 0.3) return "partly";
  return "sun";
}

// Catmull-Rom → cubic bezier, for a soft temp curve through the points.
function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return "";
  let d = `M ${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6, c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6, c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }
  return d;
}

function caption(hours: Hour[], en: boolean): string {
  if (!hours.length) return "";
  const rainy = hours.filter((h) => h.rainProb > 0.4);
  if (rainy.length) {
    return en
      ? `Bright spells, but a shower slips through around ${rainy[0].label}–${rainy[rainy.length - 1].label} — then it opens back up.`
      : `ฟ้าเปิดเป็นช่วง ๆ แต่มีฝนแวะผ่านราว ${rainy[0].label}–${rainy[rainy.length - 1].label} แล้วค่อยกลับมาใส`;
  }
  if (hours.some((h) => h.rainProb > 0.2)) return en ? "A few passing clouds, mostly dry the next six hours." : "มีเมฆผ่านบ้าง แต่ส่วนใหญ่แห้งตลอด 6 ชั่วโมงข้างหน้า";
  if (hours.filter((h) => skyOf(h) === "sun").length >= 4) return en ? "Clear and warm the next six hours." : "ฟ้าเปิดและอุ่นตลอด 6 ชั่วโมงข้างหน้า";
  return en ? "Soft cloud but dry — easy hours ahead." : "ฟ้าครึ้มอ่อน ๆ แต่ไม่มีฝน — สบาย ๆ";
}

// one bespoke 18×18 line glyph per sky state (1.4px stroke, round caps) — never an emoji
function Glyph({ sky, x, y }: { sky: Sky; x: number; y: number }) {
  const c = SKY_COLOR[sky];
  const t = `translate(${x - 14},${y - 14}) scale(1.55)`;
  const common = { fill: "none", stroke: c, strokeWidth: 1.4, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <g transform={t} {...common}>
      {sky === "sun" && (<>
        <circle cx="9" cy="9" r="3.3" /><line x1="9" y1="1.5" x2="9" y2="3" /><line x1="9" y1="15" x2="9" y2="16.5" /><line x1="1.5" y1="9" x2="3" y2="9" /><line x1="15" y1="9" x2="16.5" y2="9" /><line x1="3.6" y1="3.6" x2="4.7" y2="4.7" /><line x1="13.3" y1="13.3" x2="14.4" y2="14.4" /><line x1="3.6" y1="14.4" x2="4.7" y2="13.3" /><line x1="13.3" y1="4.7" x2="14.4" y2="3.6" />
      </>)}
      {sky === "partly" && (<>
        <circle cx="6.5" cy="6.5" r="2.4" /><line x1="6.5" y1="1.7" x2="6.5" y2="2.9" /><line x1="1.7" y1="6.5" x2="2.9" y2="6.5" /><line x1="3.1" y1="3.1" x2="4" y2="4" /><path d="M5 13 a3 3 0 0 1 3 -3 a3.4 3.4 0 0 1 6.4 1 a2.4 2.4 0 0 1 -0.5 4.6 H6 a2.5 2.5 0 0 1 -1 -2.6Z" />
      </>)}
      {sky === "cloud" && (<path d="M4 12 a3 3 0 0 1 0.5 -5.9 a4 4 0 0 1 7.5 0.6 a2.6 2.6 0 0 1 -0.5 5.3 H4.5Z" />)}
      {sky === "rain" && (<>
        <path d="M4 9.5 a3 3 0 0 1 0.5 -5.9 a4 4 0 0 1 7.5 0.6 a2.6 2.6 0 0 1 -0.5 5.3 H4.5Z" /><line x1="6.5" y1="12.5" x2="5.5" y2="15.5" /><line x1="10" y1="12.5" x2="9" y2="15.5" />
      </>)}
    </g>
  );
}

export function ArnfaRibbon() {
  const id = useId();
  const { en } = useLang();
  const [hours, setHours] = useState<Hour[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/forecast?lat=${BKK.lat}&lng=${BKK.lng}&hours=12`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        if (cancelled) return;
        const next6: Hour[] = (d.hours ?? []).slice(0, 6).map((f: { hourISO: string; tempC: number; rainProb: number; cloudCover: number }) => ({
          label: `${f.hourISO.slice(11, 13)}:00`, tempC: Math.round(f.tempC), rainProb: f.rainProb, cloudCover: f.cloudCover,
        }));
        if (next6.length) setHours(next6); else setFailed(true);
      })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, []);

  const W = 1000, H = 178, baseY = 150;
  const geo = useMemo(() => {
    const list = hours ?? [];
    if (!list.length) return null;
    const xs = list.map((_, i) => 80 + (i * 840) / Math.max(1, list.length - 1));
    const temps = list.map((h) => h.tempC);
    const tMin = Math.min(...temps) - 1, tMax = Math.max(...temps) + 1, span = Math.max(1, tMax - tMin);
    const pts = list.map((h, i) => ({ x: xs[i], y: 108 - ((h.tempC - tMin) / span) * 54 })); // higher temp = higher on chart
    return { xs, pts, curve: smoothPath(pts), area: `${smoothPath(pts)} L ${pts[pts.length - 1].x.toFixed(1)},${baseY} L ${pts[0].x.toFixed(1)},${baseY} Z` };
  }, [hours]);

  if (failed) return null;
  if (!hours || !geo) return <div className="h-[150px] w-full animate-pulse rounded-2xl bg-surface/40" aria-hidden />;

  return (
    <div className="w-full" role="img" aria-label={en ? "Temperature and sky for the next six hours" : "อุณหภูมิและสภาพฟ้า 6 ชั่วโมงข้างหน้า"}>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#F2A65A" stopOpacity="0.26" /><stop offset="1" stopColor="#F2A65A" stopOpacity="0" /></linearGradient>
          <linearGradient id={`${id}-stroke`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#F2A65A" /><stop offset="0.45" stopColor="#7C92B0" /><stop offset="1" stopColor="#F2A65A" /></linearGradient>
        </defs>
        <line x1="40" y1={baseY} x2="960" y2={baseY} stroke="var(--arnfa-hairline)" strokeWidth="1" />
        <path d={geo.area} fill={`url(#${id}-fill)`} />
        <path d={geo.curve} fill="none" stroke={`url(#${id}-stroke)`} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {hours.map((h, i) => {
          const p = geo.pts[i], sky = skyOf(h), color = SKY_COLOR[sky];
          return (
            <g key={i}>
              <Glyph sky={sky} x={p.x} y={p.y - 42} />
              <text x={p.x} y={p.y - 16} textAnchor="middle" style={{ font: "600 19px var(--font-ui-en), system-ui, sans-serif" }} fill="var(--arnfa-ink)">{h.tempC}°</text>
              <circle cx={p.x} cy={p.y} r="4.5" fill={color} />
            </g>
          );
        })}
        <g style={{ font: "500 14px var(--font-ui-en), system-ui, sans-serif" }} fill="var(--arnfa-ink-faint)" textAnchor="middle">
          {hours.map((h, i) => (<text key={i} x={geo.xs[i]} y="172">{h.label}</text>))}
        </g>
      </svg>
      <p className="mt-3 max-w-[62ch] font-thai text-sm text-ink-muted">{caption(hours, en)}</p>
      <p className="mt-1 font-thai text-[0.7rem] text-ink-faint">{en ? "The line is the temperature; the marker at each hour is the sky." : "เส้นคืออุณหภูมิ ส่วนสัญลักษณ์แต่ละชั่วโมงคือสภาพฟ้า"}</p>
    </div>
  );
}
