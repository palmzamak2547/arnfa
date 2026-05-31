import { ImageResponse } from "next/og";

/**
 * Per-plan OG image — when someone shares /plan?y=silom&t=420, the link preview
 * shows a card for THAT plan ("สีลม · เต็มวัน"), not the generic one. This is the
 * viral multiplier: a share carries the specific day, so friends see the actual
 * trip, not a brochure.
 *
 * Node runtime (NOT edge) — per memory: edge OG + headers()/middleware can fail
 * page-data collection in Next 16. System fonts only (Thai font files break OG
 * rendering); the district name is drawn from a Latin transliteration map so the
 * card always renders, while the live page shows real Thai.
 *
 * searchParams: y = district key, t = time-budget minutes.
 */

import { DISTRICTS } from "@/lib/poi/registry.generated";

export const alt = "แพลนทริปจาก อ่านฟ้า · Arnfa";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Latin labels so the OG renders without a Thai font file (the page itself is Thai).
// Sourced from the district registry so every Bangkok district has a real name.
const DISTRICT_LATIN: Record<string, string> = Object.fromEntries(DISTRICTS.map((d) => [d.key, d.en]));
const BUDGET_LATIN: Record<string, string> = {
  "150": "a quick stop",
  "240": "a half day",
  "420": "a full day",
};

export default function PlanOG({ searchParams }: { searchParams?: Record<string, string | string[]> }) {
  const y = typeof searchParams?.y === "string" ? searchParams.y : "thonglor";
  const t = typeof searchParams?.t === "string" ? searchParams.t : "240";
  const district = DISTRICT_LATIN[y] ?? "Bangkok";
  const budget = BUDGET_LATIN[t] ?? "a day";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px",
          backgroundImage: "linear-gradient(160deg, #A8C6E8 0%, #C9D6E4 38%, #F4EFE6 100%)",
          fontFamily: "Georgia, serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <svg width="56" height="56" viewBox="0 0 48 48">
            <circle cx="24" cy="22" r="13" fill="#F2A65A" />
            <path d="M8 40 a8 8 0 0 1 1.5 -15.7 a11 11 0 0 1 21 1.5 a7 7 0 0 1 -1.5 14.2 Z" fill="#1A1F2B" />
            <line x1="6" y1="40" x2="42" y2="40" stroke="#5B7FB8" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          <div style={{ display: "flex", fontSize: 28, letterSpacing: "0.3em", color: "#4B5263", textTransform: "uppercase" }}>
            Arnfa
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <div style={{ display: "flex", fontSize: 34, color: "#4B5263" }}>A weather-fit plan for</div>
          <div style={{ display: "flex", fontSize: 96, lineHeight: 1.0, color: "#1A1F2B", fontWeight: 500 }}>
            {district}
          </div>
          <div style={{ display: "flex", fontSize: 40, color: "#4B5263", fontStyle: "italic" }}>
            {budget}, read from today&apos;s sky.
          </div>
        </div>

        <div style={{ display: "flex", fontSize: 22, color: "#8A8F9B" }}>
          Open the link to see the live plan · Open-Meteo · OpenStreetMap · Air4Thai
        </div>
      </div>
    ),
    { ...size },
  );
}
