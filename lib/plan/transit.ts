import { haversineKm } from "@/lib/satellite/fires";

/**
 * transit.ts — a rough "how do I get between stops" estimate. Straight-line distance
 * + a walk/ride time guess (no routing key needed, always works). HONEST: it's an
 * as-the-crow-flies estimate, so everything is prefixed "~". A real routed time is a
 * future upgrade (OpenRouteService, key-gated) — we don't pretend this is routed.
 */

export type Hop = { km: number; min: number; mode: "walk" | "ride" };

export function hopEstimate(aLat: number, aLng: number, bLat: number, bLng: number): Hop {
  const km = haversineKm(aLat, aLng, bLat, bLng);
  if (km <= 1.5) return { km, min: Math.max(1, Math.round((km / 4.5) * 60)), mode: "walk" }; // ~4.5 km/h
  return { km, min: Math.max(1, Math.round((km / 18) * 60)), mode: "ride" }; // ~18 km/h urban
}

export function hopLabel(h: Hop, en: boolean): string {
  const dist = h.km < 1 ? `~${Math.round(h.km * 1000)} ${en ? "m" : "ม."}` : `~${h.km.toFixed(1)} ${en ? "km" : "กม."}`;
  if (h.mode === "walk") return en ? `walk ~${h.min} min · ${dist}` : `เดิน ~${h.min} นาที · ${dist}`;
  return en ? `~${h.min} min by car · ${dist}` : `นั่งรถ ~${h.min} นาที · ${dist}`;
}
