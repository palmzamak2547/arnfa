"use client";

import { useEffect, useState } from "react";
import { SwapCard } from "@/components/SwapCard";
import { useLang } from "@/lib/i18n/useLang";

/**
 * SwapMomentSection — "จังหวะสลับ": the brand's signature wow moment, faithful to the mockup.
 * The real SwapCard auto-cycles clear↔rain so the warm-shift demos itself, but the moment you
 * Accept/Stay it stops cycling and you drive it. Reduced-motion shows the swapped (terracotta)
 * state statically — the colour IS the point, so it must survive (brand rule).
 */
export function SwapMomentSection() {
  const { en } = useLang();
  const [active, setActive] = useState(false);
  const [auto, setAuto] = useState(true);

  useEffect(() => {
    if (!auto) return;
    if (typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches) { setActive(true); return; }
    const id = setInterval(() => setActive((a) => !a), 4200);
    return () => clearInterval(id);
  }, [auto]);

  const from = en
    ? { name: "the rooftop café", skyState: "clear" as const, arrivalLabel: "15:00", reason: "loses its view in the squall" }
    : { name: "รูฟท็อปคาเฟ่", skyState: "clear" as const, arrivalLabel: "15:00", reason: "วิวหายตอนฝนกระหน่ำ" };
  const to = en
    ? { name: "Bangkok CityCity Gallery", skyState: "rain" as const, arrivalLabel: "15:20", walkMin: 6, why: "a quiet show that's better in the rain" }
    : { name: "หอศิลป์ Bangkok CityCity", skyState: "rain" as const, arrivalLabel: "15:20", walkMin: 6, why: "นิทรรศการเงียบ ๆ ที่ดีขึ้นเมื่อฝนตก" };

  return (
    <section className="relative z-10 overflow-hidden" style={{ background: "linear-gradient(180deg,rgba(255,255,255,0.45),rgba(244,239,230,0))" }}>
      <div className="mx-auto max-w-[1360px] px-4 py-[clamp(40px,6vw,82px)] sm:px-[clamp(16px,4vw,46px)]">
        <div className="grid items-center gap-[clamp(28px,5vw,72px)] md:grid-cols-2">
          <div>
            <p className="mb-4 font-display text-[0.72rem] uppercase tracking-[0.24em] text-indoor-warm">{en ? "The swap moment" : "จังหวะสลับ"}</p>
            <h2 className="font-thai-serif font-light leading-[1.12] tracking-tight text-ink" style={{ fontSize: "clamp(2rem,1.1rem + 3.2vw,3.4rem)" }}>
              {en ? (<>When the sky changes its mind, <em className="not-italic text-indoor-warm">so do we.</em></>) : (<>ฟ้าเปลี่ยนใจเมื่อไหร่ <em className="not-italic text-indoor-warm">เราเปลี่ยนให้ทันที</em></>)}
            </h2>
            <p className="mt-5 max-w-[46ch] font-thai leading-relaxed text-ink-muted">
              {en
                ? (<>Watch the card. When rain rolls in it doesn&apos;t just warn you — it warm-shifts to terracotta and names a place that&apos;s <em className="not-italic font-medium text-ink">better in the rain</em>. The colour is the explanation.</>)
                : (<>ดูที่การ์ด พอฝนมา มันไม่ได้แค่เตือน — แต่เปลี่ยนเป็นสีดินเผา แล้วบอกที่ที่ <em className="not-italic font-medium text-ink">ดีขึ้นเมื่อฝนตก</em> สีคือคำอธิบาย</>)}
            </p>
            <p className="mt-[18px] flex items-center gap-2.5 font-display text-[0.74rem] uppercase tracking-[0.16em] text-ink-faint">
              <span className="af-blink h-2 w-2 rounded-full bg-indoor-warm" aria-hidden />
              {en ? "live demo · drive it yourself" : "เดโมสด · กดเล่นเองได้"}
            </p>
          </div>
          <div className="relative">
            <div aria-hidden className="pointer-events-none absolute -inset-6 rounded-[2rem]" style={{ background: "radial-gradient(120% 100% at 50% 0%,rgba(217,83,74,0.10),transparent 70%)" }} />
            <div className="relative">
              <SwapCard from={from} to={to} active={active} onAccept={() => { setAuto(false); setActive(true); }} onDismiss={() => { setAuto(false); setActive(false); }} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
