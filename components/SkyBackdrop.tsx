"use client";

import { useEffect, useState } from "react";
import { skyFrom, skyTone, type Sky } from "@/lib/core/skyTone";

/**
 * SkyBackdrop — the animated front-page sky from the Arnfa brand book, driven by the REAL
 * current Bangkok sky (not a toggle): a glowing sun with slowly-rotating rays when it's clear,
 * drifting clouds when overcast, clouds + falling rain-streaks when it's raining. Sits behind
 * the masthead + nameplate, AND lays a faint full-page wash so the whole page's mood breathes
 * with the actual weather (the brand's core idea). Decorative — all motion is dropped under
 * prefers-reduced-motion (handled in globals.css), and it never blocks interaction.
 */

const RAIN = [
  { l: "7%", t: 70, h: 26, d: "1.4s", dl: "0s" }, { l: "15%", t: 120, h: 22, d: "1.7s", dl: ".5s" },
  { l: "23%", t: 50, h: 30, d: "1.3s", dl: ".9s" }, { l: "31%", t: 160, h: 24, d: "1.6s", dl: ".2s" },
  { l: "39%", t: 90, h: 28, d: "1.8s", dl: "1.1s" }, { l: "47%", t: 200, h: 22, d: "1.5s", dl: ".7s" },
  { l: "55%", t: 60, h: 26, d: "1.45s", dl: ".35s" }, { l: "63%", t: 150, h: 30, d: "1.7s", dl: "1.3s" },
  { l: "71%", t: 100, h: 24, d: "1.35s", dl: ".15s" }, { l: "79%", t: 64, h: 28, d: "1.9s", dl: ".45s" },
  { l: "87%", t: 140, h: 22, d: "1.5s", dl: "1s" }, { l: "94%", t: 110, h: 26, d: "1.6s", dl: ".25s" },
];

export function SkyBackdrop() {
  const [sky, setSky] = useState<Sky | null>(null);

  useEffect(() => {
    let c = false;
    fetch("/api/forecast?lat=13.7563&lng=100.5018&hours=3")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => { if (!c && d.hours?.[0]) setSky(skyFrom(d.hours[0])); })
      .catch(() => { if (!c) setSky("clear"); });
    return () => { c = true; };
  }, []);

  return (
    <>
      {/* faint full-page wash — the whole page's mood breathes with the REAL current sky */}
      {sky && <div aria-hidden className="pointer-events-none fixed inset-0 z-0" style={{ background: skyTone(sky).wash }} />}

      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[560px] overflow-hidden"
      style={{ maskImage: "linear-gradient(to bottom, #000 68%, transparent)", WebkitMaskImage: "linear-gradient(to bottom, #000 68%, transparent)" }}>
      {/* SUN — glow + slow rotating rays */}
      {sky === "clear" && (
        <div className="absolute top-1.5 right-[5%] h-[min(34vw,400px)] w-[min(34vw,400px)]">
          <div className="af-spin absolute left-1/2 top-1/2 h-[148%] w-[148%] -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ background: "repeating-conic-gradient(from 0deg, rgba(242,166,90,.13) 0deg 4deg, rgba(242,166,90,0) 4deg 15deg)", WebkitMask: "radial-gradient(circle, rgba(0,0,0,0) 41%, #000 45%, rgba(0,0,0,0) 72%)", mask: "radial-gradient(circle, rgba(0,0,0,0) 41%, #000 45%, rgba(0,0,0,0) 72%)" }} />
          <div className="af-glow absolute inset-0 rounded-full" style={{ background: "radial-gradient(circle, rgba(242,166,90,.42) 0%, rgba(242,166,90,.12) 46%, rgba(242,166,90,0) 70%)" }} />
        </div>
      )}

      {/* CLOUDS — drifting */}
      {sky === "clouds" && (
        <>
          <img src="/cloud.png" alt="" className="af-cloud absolute left-0 top-[30px] w-[min(42vw,480px)] opacity-55" />
          <img src="/cloud.png" alt="" className="af-cloud absolute left-0 top-[140px] w-[min(28vw,320px)] opacity-40" style={{ animationDuration: "82s", animationDelay: "-30s" }} />
          <img src="/cloud.png" alt="" className="af-cloud absolute left-0 top-1.5 w-[min(20vw,240px)] opacity-30" style={{ animationDuration: "104s", animationDelay: "-64s" }} />
        </>
      )}

      {/* RAIN — clouds + streaks */}
      {sky === "rain" && (
        <>
          <img src="/cloud.png" alt="" className="af-cloud absolute left-0 top-[14px] w-[min(42vw,480px)] opacity-50" style={{ animationDuration: "64s" }} />
          <img src="/cloud.png" alt="" className="af-cloud absolute left-0 top-[96px] w-[min(26vw,300px)] opacity-[0.34]" style={{ animationDuration: "90s", animationDelay: "-40s" }} />
          {RAIN.map((r, i) => (
            <span key={i} className="af-rain absolute w-0.5 rounded-full"
              style={{ left: r.l, top: r.t, height: r.h, background: "linear-gradient(rgba(91,127,184,.7),rgba(91,127,184,0))", animationDuration: r.d, animationDelay: r.dl }} />
          ))}
        </>
      )}
      </div>
    </>
  );
}
