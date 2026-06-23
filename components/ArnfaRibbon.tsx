"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { useLang } from "@/lib/i18n/useLang";

/**
 * ArnfaRibbon — signature 6-hour brushstroke of the REAL Bangkok sky (thickness =
 * humidity, warmth = sun, fade + rain-strokes = rain chance). Fetches live forecast;
 * the caption is DERIVED from that data, never hard-coded. If the forecast is down it
 * hides rather than show a fake sky (Iron Rule 0).
 */
export type HourSample = { hourISO: string; humidity: number; rainProb: number; sunStrength: number };

const BKK = { lat: 13.7563, lng: 100.5018 };

function warmColor(s: number): string {
  if (s > 0.6) return "#F2A65A";
  if (s > 0.3) return "#C9A284";
  if (s > 0.1) return "#8A8FA0";
  return "#4A5878";
}

function caption(s: HourSample[], en: boolean): string {
  if (!s.length) return "";
  const rainy = s.filter((x) => x.rainProb > 0.4);
  const maxRain = Math.max(...s.map((x) => x.rainProb));
  if (rainy.length) {
    const from = rainy[0].hourISO, to = rainy[rainy.length - 1].hourISO;
    return en ? `Rain likely ${from}–${to} — keep a cover in reach.` : `ฝนน่าจะมาช่วง ${from}–${to} เผื่อที่หลบไว้`;
  }
  if (maxRain > 0.2) return en ? "A few passing showers, mostly fine." : "อาจมีฝนปรอยบ้าง แต่ส่วนใหญ่ออกได้";
  if (s.filter((x) => x.sunStrength > 0.5).length >= 4) return en ? "Clear skies the next 6 hours." : "ฟ้าเปิดตลอด 6 ชั่วโมงข้างหน้า";
  return en ? "Cloudy but dry." : "ฟ้าครึ้มแต่ไม่มีฝน";
}

export function ArnfaRibbon() {
  const id = useId();
  const { en } = useLang();
  const [hours, setHours] = useState<HourSample[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/forecast?lat=${BKK.lat}&lng=${BKK.lng}&hours=12`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        if (cancelled) return;
        const next6 = (d.hours ?? []).slice(0, 6).map((f: { hourISO: string; humidity: number; rainProb: number; cloudCover: number; uvIndex: number }) => ({
          hourISO: `${f.hourISO.slice(11, 13)}:00`,
          humidity: f.humidity,
          rainProb: f.rainProb,
          sunStrength: f.uvIndex > 0 ? Math.max(0, 1 - f.cloudCover) : Math.max(0, 0.25 - f.cloudCover * 0.25),
        }));
        if (next6.length) setHours(next6); else setFailed(true);
      })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, []);

  const W = 1000, H = 120, padX = 24, innerW = W - padX * 2, baseY = H * 0.55;
  const list = hours ?? [];
  const xs = useMemo(() => list.map((_, i) => padX + (i + 0.5) * (innerW / Math.max(1, list.length))), [list, innerW]);
  const segs = useMemo(() => list.map((h, i) => {
    const width = 10 + h.humidity * 30;
    return { key: `${id}-seg-${i}`, x: xs[i], width, height: width * 0.62, color: warmColor(h.sunStrength), dashOpacity: h.rainProb > 0.4 ? 0.25 : 0.95, sample: h };
  }), [list, xs, id]);

  if (failed) return null;
  if (!hours) return <div className="w-full h-[120px] rounded-2xl bg-surface/40 animate-pulse" aria-hidden />;

  return (
    <div className="w-full" role="img" aria-label={en ? "Next 6 hours forecast" : "พยากรณ์ 6 ชั่วโมงข้างหน้า"}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" preserveAspectRatio="none">
        <defs>
          <filter id={`${id}-grain`}>
            <feTurbulence type="fractalNoise" baseFrequency="1.2" numOctaves="2" seed="3" />
            <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.35 0" />
            <feComposite in2="SourceGraphic" operator="in" />
          </filter>
        </defs>
        <line x1={padX} y1={baseY + 22} x2={W - padX} y2={baseY + 22} stroke="var(--arnfa-hairline)" strokeWidth="1" />
        {segs.map((s) => (
          <g key={s.key} opacity={s.dashOpacity}>
            <ellipse cx={s.x} cy={baseY} rx={s.width * 0.85} ry={s.height} fill={s.color} filter={`url(#${id}-grain)`} opacity={0.9} />
            {s.sample.rainProb > 0.4 && (
              <g>
                <line x1={s.x - 8} y1={baseY - 36} x2={s.x + 8} y2={baseY - 20} stroke="var(--arnfa-accent-rain)" strokeWidth="2" strokeLinecap="round" />
                <line x1={s.x - 4} y1={baseY - 28} x2={s.x + 12} y2={baseY - 12} stroke="var(--arnfa-accent-rain)" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
              </g>
            )}
          </g>
        ))}
        {segs.map((s, i) => (
          <text key={`${s.key}-l`} x={s.x} y={baseY + 44} textAnchor="middle" className="fill-[var(--arnfa-ink-faint)]" style={{ font: '11px var(--font-ui-en), system-ui, sans-serif', letterSpacing: "0.06em" }}>
            {list[i].hourISO}
          </text>
        ))}
      </svg>
      <p className="font-thai text-sm text-ink-muted mt-2">{caption(list, en)}</p>
      <p className="font-thai text-[0.7rem] text-ink-faint mt-1">
        {en ? "thickness = humidity · warmth = sun · rain strokes = rain chance" : "ความหนา = ความชื้น · สีอุ่น = แดด · เส้นฝน = โอกาสฝน"}
      </p>
    </div>
  );
}
