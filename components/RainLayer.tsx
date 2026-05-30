"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * RainLayer — GPU rain via a single instancedMesh (interaction research #1:
 * wow 9 / effort 2, exact stack match to Codrops R3F weather tutorial).
 *
 * The drop count scales with REAL rain probability — the hero literally shows
 * you the forecast. This is info-carrying motion, so under prefers-reduced-motion
 * we keep a reduced, frozen set rather than removing it entirely.
 * Per memory/feedback_reduce-motion-blanket-disable-trap.
 */

export function RainLayer({
  intensity,
  reduced = false,
}: {
  /** 0-1 — typically rainProb × rainIntensity */
  intensity: number;
  reduced?: boolean;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const count = reduced
    ? Math.round(40 * intensity)
    : Math.round(700 * intensity);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const drops = useMemo(() => {
    return Array.from({ length: Math.max(count, 1) }, () => ({
      x: (Math.random() - 0.5) * 30,
      y: Math.random() * 18 - 2,
      z: (Math.random() - 0.5) * 12 - 2,
      speed: 0.12 + Math.random() * 0.10,
    }));
  }, [count]);

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh || count === 0) return;
    for (let i = 0; i < drops.length; i++) {
      const d = drops[i];
      if (!reduced) {
        d.y -= d.speed;
        if (d.y < -3) {
          d.y = 16;
          d.x = (Math.random() - 0.5) * 30;
        }
      }
      dummy.position.set(d.x, d.y, d.z);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  if (count === 0) return null;

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]} frustumCulled={false}>
      <cylinderGeometry args={[0.012, 0.012, 0.55, 5]} />
      <meshBasicMaterial color="#9FB4D4" transparent opacity={0.45} />
    </instancedMesh>
  );
}
