"use client";

import { useLang } from "@/lib/i18n/useLang";

/**
 * GoThere — the "getting there" monetization layer (business model v3): every journey gets a
 * partner CTA. MuvMi (the mentor's EV tuk-tuk, shown only in its service zones) + Grab (ride, when
 * it's far/raining) + LINE MAN (food, when the verdict is stay-in). These open the REAL partner
 * apps (honest — not a fake "booked" deep-link; destination-prefill needs a signed partnership,
 * and affiliate IDs slot in when signed). Rail + Maps routing live elsewhere (TransitNearby + the
 * map). This is the demand-routing model made tangible on the demo.
 */

// Areas where MuvMi's on-demand EV actually operates (kept conservative = honest; Grab is city-wide).
const MUVMI_ZONES = new Set(["ari", "thonglor", "ekkamai", "phayathai", "sathorn", "silom", "siam", "samyan", "chula"]);

export function GoThere({ districtKey, areaTh, areaEn, stayIn }: { districtKey: string; areaTh: string; areaEn: string; stayIn: boolean }) {
  const { en } = useLang();
  const muvmi = MUVMI_ZONES.has(districtKey);
  const area = en ? areaEn : areaTh;

  return (
    <section className="rounded-2xl border border-hairline bg-surface/50 p-4">
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <h3 className="font-thai-serif text-lg font-light text-ink">{en ? "Getting there" : "ไปย่านนี้ยังไง"}</h3>
        <span className="font-display text-[0.65rem] uppercase tracking-[0.18em] text-ink-faint">{en ? "partners" : "พาร์ทเนอร์"}</span>
      </div>
      <p className="mb-3 font-thai text-xs text-ink-muted">
        {en ? "Door-to-door options for the trip — rail + walking are on the map above." : "ทางเลือกถึงที่หมาย — รถไฟฟ้า + เดิน ดูบนแผนที่ด้านบน"}
      </p>

      <div className="flex flex-wrap gap-2">
        {muvmi && (
          <a href="https://www.muvmi.co/" target="_blank" rel="noopener noreferrer"
            className="group inline-flex items-center gap-2 rounded-full border border-hairline bg-paper/50 px-4 py-2 font-thai text-sm text-ink transition-colors hover:bg-surface">
            <span aria-hidden>🛺</span>{en ? `MuvMi EV to ${area}` : `ไป${area}ด้วย MuvMi (รถ EV)`}
          </a>
        )}
        <a href="https://www.grab.com/th/transport/" target="_blank" rel="noopener noreferrer"
          className="group inline-flex items-center gap-2 rounded-full border border-hairline bg-paper/50 px-4 py-2 font-thai text-sm text-ink transition-colors hover:bg-surface">
          <span aria-hidden>🚗</span>{en ? "Call a Grab" : "เรียก Grab"}
        </a>
        {stayIn && (
          <a href="https://lineman.line.me/" target="_blank" rel="noopener noreferrer"
            className="group inline-flex items-center gap-2 rounded-full px-4 py-2 font-thai text-sm text-paper transition-colors"
            style={{ background: "var(--arnfa-accent-indoor-warm)" }}>
            <span aria-hidden>🍜</span>{en ? "Raining? Order in with LINE MAN" : "ฝนตก? อยู่บ้านสั่ง LINE MAN"}
          </a>
        )}
      </div>

      <p className="mt-3 font-thai text-[0.7rem] text-ink-faint">
        {en ? "Partner mobility — MuvMi (EV) · Grab · LINE MAN. Free for you." : "พาร์ทเนอร์เดินทาง — MuvMi (EV) · Grab · LINE MAN ฟรีสำหรับคุณ"}
      </p>
    </section>
  );
}
