"use client";

import { Canvas } from "@react-three/fiber";
import { Sky, Stars, Cloud, Clouds } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { RainLayer } from "./RainLayer";

/**
 * Soft volumetric clouds use drei <Cloud>, but pointed at a SELF-HOSTED texture
 * (/cloud.png, downloaded into public/) instead of drei's default githack CDN —
 * so they're CSP-clean + offline-capable but keep the fluffy look (not low-poly).
 */
const CLOUD_TEXTURE = "/cloud.png";

/**
 * SkyHero — R3F drei <Sky> with sun-position bound to the real Bangkok clock,
 * plus rain particles whose density reflects the REAL current rain probability.
 * Night → stars instead of sun. Spec: 01-design-lock § Hero + interaction research.
 */

const BKK = { lat: 13.7563, lng: 100.5018 };

function sunPositionForBangkok(now: Date): [number, number, number] {
  const bkk = new Date(now.getTime() + (now.getTimezoneOffset() + 7 * 60) * 60_000);
  const minutes = bkk.getHours() * 60 + bkk.getMinutes();
  const t = (minutes - 360) / 720;
  const t01 = Math.max(-0.15, Math.min(1.15, t));
  const angle = t01 * Math.PI;
  return [Math.cos(angle) * 300, Math.sin(angle) * 300, 0.15 * 300];
}

function paintBodyGradient(sunY: number) {
  if (typeof document === "undefined") return;
  let from = "#F4D9B8", to = "#C9D6E4";
  if (sunY > 220) { from = "#A8C6E8"; to = "#F4EFE6"; }
  else if (sunY > 80) { from = "#F4D9B8"; to = "#C9D6E4"; }
  else if (sunY > -20) { from = "#E89B6C"; to = "#4A5878"; }
  else { from = "#1F2638"; to = "#0F1320"; }
  document.documentElement.style.setProperty("--sky-from", from);
  document.documentElement.style.setProperty("--sky-to", to);
}

function prefersReduced(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

export function SkyHero() {
  const sunPos = useMemo(() => sunPositionForBangkok(new Date()), []);
  if (typeof window !== "undefined") paintBodyGradient(sunPos[1]);
  const sunVec = useMemo(() => new THREE.Vector3(...sunPos), [sunPos]);
  const isNight = sunPos[1] < -20;
  const reduced = useMemo(prefersReduced, []);

  // Real current rain probability → hero rain density (the page shows the weather).
  const [rainIntensity, setRainIntensity] = useState(0);
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/forecast?lat=${BKK.lat}&lng=${BKK.lng}&hours=3`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d?.hours?.length) return;
        const f = d.hours[0];
        setRainIntensity(Math.min(1, f.rainProb * Math.max(0.4, f.rainIntensity)));
      })
      .catch(() => { /* hero rain is decorative-adjacent; silent */ });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 arnfa-sky-surface" aria-label="ฟ้ากรุงเทพ ตามเวลา">
      {/* Purely decorative sky — pointer-events:none so it never intercepts taps on
          the hero buttons (a WebGL canvas hit-tests touch differently than mouse,
          which silently swallowed taps on touchscreens). */}
      <Canvas camera={{ position: [0, 5, 12], fov: 55, near: 0.1, far: 1000 }} dpr={[1, 1.5]} gl={{ antialias: true, alpha: true }} style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        <Suspense fallback={null}>
          {isNight ? (
            <Stars radius={120} depth={50} count={2200} factor={4} saturation={0} fade speed={reduced ? 0 : 0.4} />
          ) : (
            <Sky sunPosition={sunVec} turbidity={6} rayleigh={2.5} mieCoefficient={0.005} mieDirectionalG={0.85} />
          )}
          {/* Very bright, even lighting so the cloud texture reads as airy white cumulus, never storm-grey. */}
          <ambientLight intensity={1.35} />
          <hemisphereLight args={["#FFFFFF", "#EEF3FA", 1.1]} />
          {/* Clouds lifted high (y≈6) and pushed back so they sit ABOVE the headline band, lower opacity = soft. */}
          <Clouds texture={CLOUD_TEXTURE} material={THREE.MeshLambertMaterial} limit={50}>
            <Cloud seed={1} segments={24} bounds={[13, 1.6, 1.4]} volume={4.5} smallestVolume={0.3} concentrate="outside" color="#FFFFFF" fade={24} position={[-5, 6.2, -8]} opacity={0.4} growth={5} speed={reduced ? 0 : 0.12} />
            <Cloud seed={9} segments={20} bounds={[11, 1.5, 1.4]} volume={3.8} smallestVolume={0.25} concentrate="outside" color="#FFFFFF" fade={20} position={[8, 7.2, -11]} opacity={0.32} growth={4.5} speed={reduced ? 0 : 0.09} />
            <Cloud seed={17} segments={16} bounds={[9, 1.3, 1.2]} volume={3} smallestVolume={0.25} concentrate="outside" color="#FFFFFF" fade={18} position={[2, 5.4, -14]} opacity={0.26} growth={4} speed={reduced ? 0 : 0.07} />
          </Clouds>
          {rainIntensity > 0.08 && <RainLayer intensity={rainIntensity} reduced={reduced} />}
        </Suspense>
      </Canvas>

      {/*
        Readability scrim — paper fades up so editorial copy always sits on
        near-paper. At NIGHT the sky behind is dark (#1F2638→#0F1320), which bled
        into the headline; so the night scrim is taller + denser (paper rises
        sooner, ~0.95 through the copy band) while the top quarter stays clear for
        stars. Day keeps its airy ramp.
      */}
      <div
        className={`pointer-events-none absolute inset-x-0 bottom-0 ${isNight ? "h-[90%]" : "h-[72%]"}`}
        style={{
          background: isNight
            ? "linear-gradient(to bottom, rgba(244,239,230,0) 0%, rgba(244,239,230,0.5) 26%, rgba(244,239,230,0.85) 48%, rgba(244,239,230,0.96) 70%, rgba(244,239,230,1) 100%)"
            : "linear-gradient(to bottom, rgba(244,239,230,0) 0%, rgba(244,239,230,0.35) 32%, rgba(244,239,230,0.82) 60%, rgba(244,239,230,0.98) 100%)",
        }}
      />
    </div>
  );
}
