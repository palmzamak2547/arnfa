"use client";

import { useEffect, useRef } from "react";

/**
 * HeroVideo — real Bangkok sky footage behind the front-page nameplate (the redesign's
 * marquee upgrade). A 109KB webp poster paints instantly (the LCP); the muted/looping
 * 3.2MB MP4 fades in over it once it can play, and only while the hero is on-screen
 * (IntersectionObserver play/pause saves battery + data). Under prefers-reduced-motion the
 * video is never even fetched (preload="none" + we skip play) — the static poster stays.
 * Masked to melt into the warm-paper page; decorative → aria-hidden, never interactive.
 */
export function HeroVideo() {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches) return; // poster only

    let started = false;
    const play = () => {
      v.preload = "auto";
      const p = v.play();
      if (p && p.catch) p.catch(() => {});
    };
    const onReady = () => v.classList.add("is-ready");
    v.addEventListener("loadeddata", onReady);
    v.addEventListener("canplay", play);

    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          if (!started) { started = true; play(); } else play();
        } else {
          v.pause();
        }
      },
      { threshold: 0.12 },
    );
    io.observe(v);

    return () => {
      io.disconnect();
      v.removeEventListener("loadeddata", onReady);
      v.removeEventListener("canplay", play);
    };
  }, []);

  return (
    <div aria-hidden className="hero-video-wrap pointer-events-none absolute inset-x-0 top-0 z-0 overflow-hidden">
      {/* poster paints instantly + stays under reduced-motion */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/hero-poster.webp" alt="" className="hero-poster" decoding="async" fetchPriority="high" />
      <video
        ref={ref}
        className="hero-video"
        muted
        loop
        playsInline
        preload="none"
        poster="/hero-poster.webp"
        disablePictureInPicture
        tabIndex={-1}
      >
        <source src="/hero-bangkok.mp4" type="video/mp4" />
      </video>
      {/* warm-paper wash at the base so the nameplate reads cleanly over the footage */}
      <div className="hero-video-scrim" />
    </div>
  );
}
