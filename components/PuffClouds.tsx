"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * PuffClouds — self-contained low-poly clouds, NO external texture.
 *
 * drei's <Cloud> fetches a cloud.png from a third-party CDN (githack) at runtime
 * — that breaks under our Content-Security-Policy AND violates "own your assets,
 * no random CDNs". So we build clouds from clustered low-poly spheres (icosahedron
 * geometry) with soft, flat lambert shading. Drifts along x at wind-speed; recycles.
 * Honest, offline-capable, CSP-clean, on-brand (soft paper-white cumulus).
 *
 * Reduced-motion: drift speed = 0 (clouds still present, just still).
 */

type Puff = { x: number; y: number; z: number; r: number; speed: number; phase: number };

function makeCluster(seed: number): Puff[] {
  // deterministic pseudo-random from seed (no Math.random — SSR-safe, stable)
  let s = seed * 9301 + 49297;
  const rand = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  const n = 5 + Math.floor(rand() * 3);
  const baseX = (rand() - 0.5) * 26;
  const baseY = 2.5 + rand() * 4;
  const baseZ = -4 - rand() * 9;
  const speed = 0.12 + rand() * 0.12;
  const puffs: Puff[] = [];
  for (let i = 0; i < n; i++) {
    puffs.push({
      x: baseX + (rand() - 0.5) * 4.5,
      y: baseY + (rand() - 0.5) * 1.1,
      z: baseZ + (rand() - 0.5) * 2,
      r: 0.9 + rand() * 1.4,
      speed,
      phase: rand() * Math.PI * 2,
    });
  }
  return puffs;
}

export function PuffClouds({ reduced = false, clusters = 4 }: { reduced?: boolean; clusters?: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const puffs = useMemo(
    () => Array.from({ length: clusters }, (_, i) => makeCluster(i + 1)).flat(),
    [clusters],
  );

  const geo = useMemo(() => new THREE.IcosahedronGeometry(1, 1), []);
  const mat = useMemo(
    () =>
      new THREE.MeshLambertMaterial({
        color: "#FFFFFF",
        transparent: true,
        opacity: 0.9,
        flatShading: true,
      }),
    [],
  );

  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((_, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    for (let i = 0; i < puffs.length; i++) {
      const p = puffs[i];
      if (!reduced) {
        p.x += p.speed * delta;
        if (p.x > 18) p.x = -18;
      }
      dummy.position.set(p.x, p.y, p.z);
      dummy.scale.setScalar(p.r);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <group ref={groupRef}>
      <instancedMesh ref={meshRef} args={[geo, mat, puffs.length]} frustumCulled={false} />
    </group>
  );
}
