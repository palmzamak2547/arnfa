/**
 * egat.ts — EGAT (การไฟฟ้าฝ่ายผลิต) live dam cameras. Discovered via the national water portal's
 * CCTV feed (api-v3.thaiwater.net/.../analyst/cctv → filter cctv_url for egatwater). The image is a
 * direct https JPEG that overwrites in place (~1-min cadence), no auth/CORS. Verified reachable from
 * Vercel (egatwater is NOT geo-blocked, unlike RID/ONWR). The 5 below were verified live (Last-Modified
 * ≈ now); 3 other EGAT dams were stale/dead and are intentionally omitted (Iron Rule 0 — no stale cams).
 *
 * These are major dam/reservoir cams (spillway + reservoir surface) at popular tourist dams — a real
 * "water + sky at the dam" view, NOT urban Bangkok floodgates (RID's on-site floodgate cams are dead
 * from outside Thailand). Attribution: "ภาพจาก กฟผ. (EGAT)".
 */

export type WaterCam = { code: string; th: string; en: string; lat: number; lng: number };

export const WATER_CAMS: WaterCam[] = [
  { code: "SNR", th: "เขื่อนศรีนครินทร์", en: "Srinagarind Dam", lat: 14.4079, lng: 99.1287 },
  { code: "VRK", th: "เขื่อนวชิราลงกรณ์", en: "Vajiralongkorn Dam", lat: 14.7974, lng: 98.5928 },
  { code: "BB", th: "เขื่อนภูมิพล", en: "Bhumibol Dam", lat: 17.2441, lng: 98.9727 },
  { code: "SK", th: "เขื่อนสิริกิติ์", en: "Sirikit Dam", lat: 17.7651, lng: 100.5648 },
  { code: "BLG", th: "เขื่อนบางลาง", en: "Bang Lang Dam", lat: 6.3203, lng: 101.2758 },
];

/** The live snapshot image URL for a dam (angle 1). Cache-bust with ?t= when displaying. */
export function egatImageUrl(code: string): string {
  return `https://egatwater.egat.co.th/assets/CCTV/images/${code}/1.jpg`;
}
