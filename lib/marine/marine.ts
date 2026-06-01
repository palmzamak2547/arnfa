import { haversineKm } from "@/lib/satellite/fires";

/**
 * marine.ts — "เล่นน้ำได้ไหม". Coastal-only beach conditions from Open-Meteo Marine
 * (wave height + sea-surface temp). Two honesty gates: a curated coastal set (so we
 * never call the marine API for Chiang Mai), AND a distance check in the API (if the
 * nearest sea cell is >25 km from the area centre, the area isn't really beachside).
 */

export const COASTAL_AREAS = new Set<string>([
  // beach destinations (centroid is on/at the beach)
  "ao-nang", "bang-saen", "hua-hin", "khao-lak", "ko-chang", "ko-lanta", "ko-pha-ngan", "ko-samet", "ko-samui", "patong", "pattaya",
  // seaside province capitals
  "phuket", "songkhla", "rayong", "prachuap-khiri-khan", "chumphon", "ranong", "trat", "satun", "narathiwat", "pattani",
  "phetchaburi", "samut-prakan", "samut-sakhon", "samut-songkhram", "chon-buri", "krabi", "phang-nga", "trang", "surat-thani", "nakhon-si-thammarat", "chanthaburi",
]);

export const isCoastal = (key: string) => COASTAL_AREAS.has(key);

export type SwimLevel = "calm" | "gentle" | "moderate" | "rough" | "high";

export function swimVerdict(waveM: number): SwimLevel {
  if (waveM < 0.5) return "calm";
  if (waveM < 1.0) return "gentle";
  if (waveM < 1.5) return "moderate";
  if (waveM < 2.5) return "rough";
  return "high";
}

export const SWIM_TH: Record<SwimLevel, string> = {
  calm: "น้ำนิ่ง เล่นน้ำสบาย", gentle: "คลื่นเบาๆ เล่นน้ำได้", moderate: "คลื่นปานกลาง ระวังหน่อย", rough: "คลื่นแรง ระวัง", high: "คลื่นสูง เลี่ยงลงน้ำ",
};
export const SWIM_EN: Record<SwimLevel, string> = {
  calm: "calm — great for a swim", gentle: "gentle waves", moderate: "moderate — take care", rough: "rough — be careful", high: "high surf — stay out",
};

export const SWIM_DOT: Record<SwimLevel, string> = {
  calm: "var(--arnfa-success)", gentle: "var(--arnfa-success)", moderate: "var(--arnfa-accent-sun)", rough: "var(--arnfa-accent-rain)", high: "var(--arnfa-accent-indoor-warm)",
};

/** km from an area centre to the marine grid cell the forecast actually used. */
export function seaDistanceKm(reqLat: number, reqLng: number, cellLat: number, cellLng: number): number {
  return haversineKm(reqLat, reqLng, cellLat, cellLng);
}
