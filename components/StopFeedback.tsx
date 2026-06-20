"use client";

import { useState } from "react";
import { recordFeedback } from "@/lib/plan/feedback";
import type { SkyState } from "@/lib/core/skyState";

/**
 * StopFeedback — the flywheel's WRITE surface, on every stop. "ฟ้าตรงไหมตรงนี้?" → 👍/👎.
 * This is what turns Arnfah from a static lookup into a dataset that compounds with use:
 * each verdict bumps arnfa.poi_crowd (instantly), refining that POI's profile for the
 * next person. The "ฉลาดขึ้นอีกนิด" reply makes the loop FELT. Best-effort, anonymous.
 */
export function StopFeedback({
  poiId, skyState, rainProb, district, en,
}: {
  poiId: string;
  skyState: SkyState;
  rainProb: number; // 0–1
  district: string;
  en: boolean;
}) {
  const [voted, setVoted] = useState<null | "ok" | "bad">(null);
  const inRain = skyState === "rain" || skyState === "storm" || rainProb > 0.4;

  function vote(kind: "weather_ok" | "weather_bad") {
    setVoted(kind === "weather_ok" ? "ok" : "bad");
    void recordFeedback(poiId, kind, {
      inRain,
      context: { skyState, rainProb: Math.round(rainProb * 100), district },
    });
  }

  if (voted) {
    return (
      <p className="font-thai mt-2 text-xs text-success">
        {en ? "Thanks — Arnfah just got a little sharper." : "ขอบคุณ — Arnfah ฉลาดขึ้นอีกนิดแล้ว"}
      </p>
    );
  }

  return (
    <div className="mt-2 flex items-center gap-2 text-xs">
      <span className="font-thai text-ink-faint">{en ? "Sky right here?" : "ฟ้าตรงไหมตรงนี้?"}</span>
      <button
        type="button"
        onClick={() => vote("weather_ok")}
        className="font-thai inline-flex items-center gap-1 rounded-full border border-hairline px-2.5 py-1 text-ink-muted transition-colors hover:border-success/50 hover:text-success min-h-[32px]"
        aria-label={en ? "Sky matched" : "ฟ้าตรง"}
      >
        <span aria-hidden>👍</span> {en ? "yes" : "ตรง"}
      </button>
      <button
        type="button"
        onClick={() => vote("weather_bad")}
        className="font-thai inline-flex items-center gap-1 rounded-full border border-hairline px-2.5 py-1 text-ink-muted transition-colors hover:border-indoor-warm/50 hover:text-indoor-warm min-h-[32px]"
        aria-label={en ? "Sky was off" : "ฟ้าไม่ตรง"}
      >
        <span aria-hidden>👎</span> {en ? "off" : "ไม่ตรง"}
      </button>
    </div>
  );
}
