"use client";

/**
 * Logo — "Sunrise-on-ฟ" wordmark for อ่านฟ้า (research direction A).
 *
 * The Thai word อ่านฟ้า set in the editorial serif voice, with a rising sun
 * arc over the ฟ and a hairline horizon rule under the whole word. The sun
 * uses accent-sun; the horizon uses accent-rain. Animatable (sun rises on load).
 *
 * Two forms:
 *   <Logo />        — full wordmark (header, footer)
 *   <LogoMark />    — circle-sun + cloud-bar glyph only (favicon/OG/compact)
 *
 * Spec: projects/arnfa/01-design-lock.md § Logo
 */

export function Logo({ className, animate = true }: { className?: string; animate?: boolean }) {
  return (
    <span className={`inline-flex items-center ${className ?? ""}`} aria-label="อ่านฟ้า">
      <span className="relative font-thai-serif font-medium tracking-tight leading-none">
        {/* rising sun arc over the ฟ (4th glyph) — positioned via the wrapper */}
        <span className="relative">
          อ่านฟ้า
          <svg
            className={`pointer-events-none absolute -top-[0.30em] right-[0.62em] h-[0.42em] w-[0.85em] overflow-visible ${animate ? "arnfa-sunrise" : ""}`}
            viewBox="0 0 40 22"
            aria-hidden
          >
            <path
              d="M2 20 A18 18 0 0 1 38 20"
              fill="none"
              stroke="var(--arnfa-accent-sun)"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
          </svg>
        </span>
      </span>
    </span>
  );
}

export function LogoMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className={className} role="img" aria-label="Arnfah">
      <defs>
        <clipPath id="arnfa-cloud-clip">
          <rect x="0" y="26" width="48" height="22" />
        </clipPath>
      </defs>
      {/* sun */}
      <circle cx="24" cy="22" r="13" fill="var(--arnfa-accent-sun)" />
      {/* cloud bar occluding the lower sun */}
      <g clipPath="url(#arnfa-cloud-clip)">
        <path
          d="M8 40 a8 8 0 0 1 1.5 -15.7 a11 11 0 0 1 21 1.5 a7 7 0 0 1 -1.5 14.2 Z"
          fill="var(--arnfa-ink)"
        />
      </g>
      {/* horizon */}
      <line x1="6" y1="40" x2="42" y2="40" stroke="var(--arnfa-accent-rain)" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
