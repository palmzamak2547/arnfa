"use client";

import { useId, useMemo } from "react";

/** ArnfaRibbon — signature 6-hour brushstroke (thickness=humidity, dashes=rain, warmth=sun). Spec: 01-design-lock § Signature 3 */

export type HourSample = { hourISO: string; humidity: number; rainProb: number; sunStrength: number };

const MOCK_NEXT_6H: HourSample[] = [
  { hourISO: "13:00", humidity: 0.55, rainProb: 0.08, sunStrength: 0.85 },
  { hourISO: "14:00", humidity: 0.6,  rainProb: 0.12, sunStrength: 0.9  },
  { hourISO: "15:00", humidity: 0.7,  rainProb: 0.35, sunStrength: 0.7  },
  { hourISO: "16:00", humidity: 0.78, rainProb: 0.55, sunStrength: 0.4  },
  { hourISO: "17:00", humidity: 0.75, rainProb: 0.4,  sunStrength: 0.3  },
  { hourISO: "18:00", humidity: 0.62, rainProb: 0.15, sunStrength: 0.15 },
];

function warmColor(s: number): string {
  if (s > 0.6) return "#F2A65A";
  if (s > 0.3) return "#C9A284";
  if (s > 0.1) return "#8A8FA0";
  return "#4A5878";
}

export function ArnfaRibbon({ hours = MOCK_NEXT_6H }: { hours?: HourSample[] }) {
  const id = useId();
  const W = 1000, H = 120, padX = 24, innerW = W - padX * 2, baseY = H * 0.55;
  const xs = useMemo(() => hours.map((_, i) => padX + (i + 0.5) * (innerW / hours.length)), [hours, innerW]);

  const segs = useMemo(() => hours.map((h, i) => {
    const width = 10 + h.humidity * 30;
    return { key: `${id}-seg-${i}`, x: xs[i], width, height: width * 0.62, color: warmColor(h.sunStrength), dashOpacity: h.rainProb > 0.4 ? 0.25 : 0.95, sample: h };
  }), [hours, xs, id]);

  return (
    <div className="w-full" role="img" aria-label="พยากรณ์ 6 ชั่วโมงข้างหน้า">
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
          <text key={`${s.key}-l`} x={s.x} y={baseY + 44} textAnchor="middle" className="fill-[var(--arnfa-ink-faint)]" style={{ font: '11px var(--font-inter-tight), system-ui, sans-serif', letterSpacing: "0.06em" }}>
            {hours[i].hourISO}
          </text>
        ))}
      </svg>
      <p className="font-thai text-sm text-ink-muted mt-2">
        บ่ายเริ่มครึ้ม ฝนพรำ <span className="font-medium">15:00 – 17:00</span> — ค่อยกลับมาฟ้าใสตอน <span className="font-medium">18:00</span>
      </p>
    </div>
  );
}
