"use client";

import { useEffect, useRef } from "react";
import { useLang } from "@/lib/i18n/useLang";

/**
 * BandVideo — the editorial "One city, every sky" intermission band (mockup). Real Bangkok day
 * footage in an ultra-wide band with a top eyebrow + a bottom italic caption. Lazy: the ~2MB mp4
 * is only fetched + played once the band scrolls into view, and never under prefers-reduced-motion
 * (the poster stays). Decorative → aria-hidden video.
 */
export function BandVideo() {
  const { en } = useLang();
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let started = false;
    const play = () => { v.preload = "auto"; const p = v.play(); if (p && p.catch) p.catch(() => {}); };
    const onReady = () => v.classList.add("is-ready");
    v.addEventListener("loadeddata", onReady);
    const io = new IntersectionObserver(
      // only pause once it's actually buffered (readyState ≥ 3) — pausing an in-flight
      // load on a fast scroll-past aborts the range request (a benign but ugly ERR_FAILED).
      ([e]) => { if (e.isIntersecting) { if (!started) { started = true; play(); } else play(); } else if (v.readyState >= 3) v.pause(); },
      { threshold: 0.1 },
    );
    io.observe(v);
    return () => { io.disconnect(); v.removeEventListener("loadeddata", onReady); };
  }, []);

  return (
    <section aria-label={en ? "One city, every sky" : "เมืองเดียว ทุกสภาพฟ้า"} className="relative z-10">
      <div className="relative w-full overflow-hidden bg-ink" style={{ aspectRatio: "1920 / 520", minHeight: 230, maxHeight: "62vh" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/hero-poster.webp" alt="" aria-hidden className="band-poster" decoding="async" />
        <video ref={ref} className="hero-video" muted loop playsInline preload="none" poster="/hero-poster.webp" disablePictureInPicture tabIndex={-1} aria-hidden>
          <source src="/hero-band.mp4" type="video/mp4" />
        </video>
        <div className="pointer-events-none absolute inset-x-0 top-0 p-[clamp(16px,3vw,30px)]" style={{ background: "linear-gradient(180deg,rgba(26,31,43,0.5),transparent)" }}>
          <p className="font-display text-[0.72rem] uppercase tracking-[0.24em]" style={{ color: "rgba(244,239,230,0.85)" }}>
            {en ? "One city, every sky" : "เมืองเดียว ทุกสภาพฟ้า"}
          </p>
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 p-[clamp(18px,3vw,34px)]" style={{ background: "linear-gradient(0deg,rgba(26,31,43,0.74),transparent)" }}>
          <p className="max-w-[38ch] font-thai-serif text-paper" style={{ fontSize: "clamp(1.1rem,0.9rem + 1vw,1.7rem)", lineHeight: 1.32 }}>
            {en ? "Bangkok wears a different sky every hour — Arnfah reads them all." : "กรุงเทพฯ เปลี่ยนฟ้าทุกชั่วโมง — อ่านฟ้าอ่านครบทุกแบบ"}
          </p>
        </div>
      </div>
    </section>
  );
}
