"use client";

import { clsx } from "clsx";

/** SkyChip — signature "forecast at arrival time" badge. Spec: 01-design-lock § Signature 2 */

export type SkyState = "clear" | "partly" | "cloudy" | "rain" | "storm" | "night";

export type SkyChipProps = {
  state: SkyState;
  arrivalLabel: string;
  tempC?: number;
  rainProb?: number;
  size?: "sm" | "md";
  className?: string;
};

const STATE_COPY: Record<SkyState, { th: string; stroke: string; bg: string }> = {
  clear:  { th: "ฟ้าเปิด", stroke: "var(--arnfa-accent-sun)",         bg: "rgba(242,166,90,0.10)" },
  partly: { th: "โปร่ง",   stroke: "var(--arnfa-success)",            bg: "rgba(123,166,138,0.10)" },
  cloudy: { th: "ครึ้ม",   stroke: "var(--arnfa-ink-muted)",          bg: "rgba(75,82,99,0.08)" },
  rain:   { th: "ฝนพรำ",   stroke: "var(--arnfa-accent-rain)",        bg: "rgba(91,127,184,0.12)" },
  storm:  { th: "ฝนหนัก",  stroke: "var(--arnfa-accent-indoor-warm)", bg: "rgba(217,83,74,0.12)" },
  night:  { th: "กลางคืน", stroke: "var(--arnfa-accent-rain)",        bg: "rgba(74,88,120,0.14)" },
};

function StateGlyph({ state, color }: { state: SkyState; color: string }) {
  const c = { stroke: color, strokeWidth: 1.5, fill: "none", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (state) {
    case "clear":
      return (
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
          <circle cx="9" cy="9" r="3.4" {...c} />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => {
            const r = (a * Math.PI) / 180;
            return <line key={a} x1={9 + Math.cos(r) * 5.5} y1={9 + Math.sin(r) * 5.5} x2={9 + Math.cos(r) * 7.2} y2={9 + Math.sin(r) * 7.2} {...c} />;
          })}
        </svg>
      );
    case "partly":
      return (
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
          <circle cx="6.5" cy="6.5" r="2.6" {...c} />
          <path d="M5 12 a3 3 0 0 1 3 -3 a3.4 3.4 0 0 1 6.5 1 a2.4 2.4 0 0 1 -0.5 4.7 H6 a2.5 2.5 0 0 1 -1 -2.7Z" {...c} />
        </svg>
      );
    case "cloudy":
      return (
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
          <path d="M4 12 a3 3 0 0 1 0.5 -5.9 a4 4 0 0 1 7.5 0.6 a2.6 2.6 0 0 1 -0.5 5.3 H4.5Z" {...c} />
        </svg>
      );
    case "rain":
      return (
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
          <path d="M4 9.5 a3 3 0 0 1 0.5 -5.9 a4 4 0 0 1 7.5 0.6 a2.6 2.6 0 0 1 -0.5 5.3 H4.5Z" {...c} />
          <line x1="6.5" y1="12.5" x2="5.5" y2="15.5" {...c} />
          <line x1="10" y1="12.5" x2="9" y2="15.5" {...c} />
        </svg>
      );
    case "storm":
      return (
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
          <path d="M4 9 a3 3 0 0 1 0.5 -5.9 a4 4 0 0 1 7.5 0.6 a2.6 2.6 0 0 1 -0.5 5.3 H4.5Z" {...c} />
          <path d="M9 11 L7 14 H9 L7.5 16.5" {...c} />
        </svg>
      );
    case "night":
      return (
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
          <path d="M12.5 11.2 A5 5 0 1 1 7 5.5 a4 4 0 0 0 5.5 5.7Z" {...c} />
        </svg>
      );
  }
}

export function SkyChip({ state, arrivalLabel, tempC, rainProb, size = "md", className }: SkyChipProps) {
  const copy = STATE_COPY[state];
  const showRain = typeof rainProb === "number" && rainProb > 0.15;
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-2 rounded-full border border-hairline font-thai",
        size === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm",
        className,
      )}
      style={{ background: copy.bg }}
      title={`ฟ้าตอน ${arrivalLabel}: ${copy.th}`}
    >
      <StateGlyph state={state} color={copy.stroke} />
      <span className="font-medium text-ink">{copy.th}</span>
      <span className="text-ink-faint tabular-nums">{arrivalLabel}</span>
      {typeof tempC === "number" && <span className="text-ink-muted tabular-nums">{Math.round(tempC)}°</span>}
      {showRain && <span className="text-rain tabular-nums">{Math.round(rainProb! * 100)}%</span>}
    </span>
  );
}

export function skyStateFrom(o: { rainProb: number; rainIntensity: number; cloudCover: number; isNight: boolean }): SkyState {
  if (o.isNight) return "night";
  if (o.rainProb > 0.5 && o.rainIntensity > 0.6) return "storm";
  if (o.rainProb > 0.35) return "rain";
  if (o.cloudCover > 0.7) return "cloudy";
  if (o.cloudCover > 0.35) return "partly";
  return "clear";
}
