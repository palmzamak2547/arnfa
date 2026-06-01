"use client";

import { useLang } from "@/lib/i18n/useLang";
import type { Advisory } from "@/lib/core/advisory";
import { GoldenHour } from "./GoldenHour";

/**
 * TodayAdvisory — "เตรียมตัววันนี้": what to wear, what to pack, what to watch.
 * Driven entirely by the real forecast window + real Air4Thai PM2.5 (lib/core/
 * advisory.ts). Safety flags use the indoor-warm signal colour; nothing here is
 * invented — if a signal is absent the row simply doesn't show.
 */

const SAFETY_STYLE: Record<Advisory["safety"][number]["level"], string> = {
  danger: "border-indoor-warm/30 bg-indoor-warm/[0.06] text-indoor-warm",
  warn: "border-sun/40 bg-sun/[0.07] text-ink-muted",
  info: "border-hairline bg-surface text-ink-muted",
};

export function TodayAdvisory({ advisory, lat, lng, dayOffset = 0 }: { advisory: Advisory | null; lat?: number; lng?: number; dayOffset?: number }) {
  const { en } = useLang();
  if (!advisory) return null;
  const { outfit, packing, safety } = advisory;

  return (
    <section aria-label={en ? "Today's prep" : "เตรียมตัววันนี้"} className="rounded-3xl border border-hairline bg-surface/70 p-5 sm:p-6">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-thai-serif text-lg font-light text-ink">{en ? "Getting out today" : "เตรียมตัววันนี้"}</h2>
        <span className="font-thai text-[0.7rem] uppercase tracking-wider text-ink-faint">{en ? "from today's sky" : "อ่านจากฟ้าวันนี้"}</span>
      </div>

      {/* Safety flags first — they matter most */}
      {safety.length > 0 && (
        <ul className="mt-4 space-y-2">
          {safety.map((f, i) => (
            <li key={i} className={`font-thai flex items-start gap-2 rounded-2xl border px-3.5 py-2.5 text-sm ${SAFETY_STYLE[f.level]}`}>
              <span aria-hidden className="mt-[0.15rem] text-xs">{f.level === "danger" ? "▲" : f.level === "warn" ? "●" : "·"}</span>
              <span>{en ? f.en : f.th}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Outfit line */}
      <div className="mt-4 flex items-start gap-2.5">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" className="mt-0.5 shrink-0 text-ink-faint" aria-hidden>
          <path d="M8 3 5 6v3l2 1v9h10v-9l2-1V6l-3-3-2 2h-4L8 3Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
        <p className="font-thai text-sm text-ink">{en ? outfit.en : outfit.th}</p>
      </div>

      {/* Packing chips */}
      {packing.length > 0 && (
        <div className="mt-4">
          <p className="font-thai mb-2 text-xs uppercase tracking-wider text-ink-faint">{en ? "Worth carrying" : "พกไปด้วยดีกว่า"}</p>
          <ul className="flex flex-wrap gap-2">
            {packing.map((p) => (
              <li key={p.id} className="font-thai inline-flex items-center gap-1.5 rounded-full border border-hairline bg-paper px-3 py-1.5 text-sm text-ink">
                <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-success" />
                {en ? p.en : p.th}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Sun line — sunrise · sunset · golden hour (computed locally, no API) */}
      {lat != null && lng != null && <GoldenHour lat={lat} lng={lng} dayOffset={dayOffset} />}
    </section>
  );
}
