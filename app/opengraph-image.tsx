import { ImageResponse } from "next/og";

/**
 * Dynamic Open Graph image — the link-preview card people see when arnfa.vercel.app
 * is shared (LINE, IG, X, Messenger). The viral surface: a branded sky card.
 *
 * Edge-safe: uses only system-default fonts (no Thai font file loading in the
 * edge runtime, which is a common silent break) — Latin wordmark + the sun/horizon
 * motif carry the brand. Thai lives on the page itself.
 */

export const alt = "Arnfa — a decision engine that reads the sky for you";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OG() {
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
          // dusk sky → paper, the Open Sky palette
          backgroundImage:
            "linear-gradient(160deg, #A8C6E8 0%, #C9D6E4 38%, #F4EFE6 100%)",
          fontFamily: "Georgia, serif",
        }}
      >
        {/* top row: sun mark + wordmark */}
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <svg width="64" height="64" viewBox="0 0 48 48">
            <circle cx="24" cy="22" r="13" fill="#F2A65A" />
            <path
              d="M8 40 a8 8 0 0 1 1.5 -15.7 a11 11 0 0 1 21 1.5 a7 7 0 0 1 -1.5 14.2 Z"
              fill="#1A1F2B"
            />
            <line x1="6" y1="40" x2="42" y2="40" stroke="#5B7FB8" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          <div style={{ display: "flex", fontSize: 30, letterSpacing: "0.3em", color: "#4B5263", textTransform: "uppercase" }}>
            Arnfa
          </div>
        </div>

        {/* headline */}
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          <div style={{ display: "flex", fontSize: 84, lineHeight: 1.0, color: "#1A1F2B", fontWeight: 400 }}>
            Read the sky.
          </div>
          <div style={{ display: "flex", fontSize: 84, lineHeight: 1.0, color: "#4B5263", fontStyle: "italic" }}>
            Then go.
          </div>
        </div>

        {/* bottom row: tagline + provenance */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <div style={{ display: "flex", fontSize: 30, color: "#1A1F2B" }}>
            A decision engine for Thailand — when rain comes, it names a better place.
          </div>
          <div style={{ display: "flex", fontSize: 22, color: "#8A8F9B" }}>
            Open-Meteo · OpenStreetMap · Air4Thai · never a fabricated forecast
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
