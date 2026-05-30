"use client";

import { Canvas } from "@react-three/fiber";
import { Sky, Cloud, Clouds } from "@react-three/drei";
import { Suspense, useMemo } from "react";
import * as THREE from "three";

/** SkyHero — R3F drei <Sky> with sun-position bound to real Bangkok clock. Spec: 01-design-lock § Hero */

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

export function SkyHero() {
  const sunPos = useMemo(() => sunPositionForBangkok(new Date()), []);
  if (typeof window !== "undefined") paintBodyGradient(sunPos[1]);
  const sunVec = useMemo(() => new THREE.Vector3(...sunPos), [sunPos]);

  return (
    <div className="absolute inset-0 arnfa-sky-surface" aria-label="ฟ้ากรุงเทพ ตามเวลา">
      <Canvas camera={{ position: [0, 5, 12], fov: 55, near: 0.1, far: 1000 }} dpr={[1, 1.5]} gl={{ antialias: true, alpha: true }} style={{ position: "absolute", inset: 0 }}>
        <Suspense fallback={null}>
          <Sky sunPosition={sunVec} turbidity={6} rayleigh={2.5} mieCoefficient={0.005} mieDirectionalG={0.85} />
          <ambientLight intensity={0.35} />
          <Clouds material={THREE.MeshBasicMaterial} limit={48}>
            <Cloud seed={1} segments={28} bounds={[10, 2, 2]} volume={6} color="#FFFFFF" fade={50} position={[-8, 3, -5]} opacity={0.55} />
            <Cloud seed={9} segments={24} bounds={[8, 1.6, 2]} volume={5} color="#FFFFFF" fade={40} position={[6, 4.5, -8]} opacity={0.45} />
            <Cloud seed={17} segments={20} bounds={[6, 1.4, 1.8]} volume={4} color="#FFFFFF" fade={30} position={[0, 2.2, -12]} opacity={0.4} />
          </Clouds>
        </Suspense>
      </Canvas>

      {/* Readability scrim — paper fades up so editorial copy always sits on near-paper. */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[72%]"
        style={{
          background: "linear-gradient(to bottom, rgba(244,239,230,0) 0%, rgba(244,239,230,0.35) 32%, rgba(244,239,230,0.82) 60%, rgba(244,239,230,0.98) 100%)",
        }}
      />
    </div>
  );
}
