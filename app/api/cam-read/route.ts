import { NextRequest, NextResponse } from "next/server";
import { vlmConfigured, vlmRead, parseCamRead, assessFlood, type CamRead, type FloodVerdict } from "@/lib/ai/vlm";
import { rateLimit, clientIp, tooMany } from "@/lib/ratelimit";

/**
 * POST /api/cam-read — read ONE camera frame with a NVIDIA VLM → an honest, gated assessment.
 * Body: { image: "data:image/jpeg;base64,...", camId, lat?, lng? }. The frame is grabbed
 * client-side from the already-playing <video> (canvas), so it's never re-hosted; we forward it
 * once to NVIDIA and KEEP NOTHING (faces/plates → no DB, no log of the image).
 *
 * Iron Rule 0 — the VLM is badly calibrated, so we DON'T trust its confidence. The street-flood
 * flag is gated on REAL signals, not the model's say-so:
 *   · night → suppress flood/sky claims (night is the #1 failure mode)
 *   · flood claim must be corroborated by real recent rain (Open-Meteo); else it's "possibly a
 *     reflection — go verify", never asserted as fact.
 */
export const runtime = "nodejs";
export const maxDuration = 30;

type Cached = { read: CamRead; flood: FloodVerdict; frameAt: number };
const cache = new Map<string, Cached>(); // key = camId:10min-bucket; in-memory, best-effort

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
}

/** Real recent rain near the camera (Open-Meteo) — the corroboration gate for a flood claim. */
async function recentRain(lat: number, lng: number): Promise<boolean | null> {
  try {
    const u = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=precipitation&hourly=precipitation&past_hours=3&forecast_hours=1&timezone=Asia%2FBangkok`;
    const r = await fetch(u, { signal: AbortSignal.timeout(4000) });
    if (!r.ok) return null;
    const d = (await r.json()) as { current?: { precipitation?: number }; hourly?: { precipitation?: (number | null)[] } };
    const cur = Number(d.current?.precipitation) || 0;
    const recent = (d.hourly?.precipitation ?? []).slice(0, 4).some((v) => Number(v) >= 0.2);
    return cur >= 0.1 || recent;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const rl = rateLimit(`camread:${clientIp(req)}`, 6, 60_000);
  if (!rl.ok) return tooMany(rl.retryAfter);
  if (!vlmConfigured()) return json({ available: false, reason: "no_key" });

  let body: { image?: unknown; camId?: unknown; lat?: unknown; lng?: unknown };
  try { body = await req.json(); } catch { return json({ error: "bad_body" }, 400); }
  const image = typeof body.image === "string" ? body.image : "";
  const camId = typeof body.camId === "string" ? body.camId.slice(0, 120) : "";
  const lat = Number(body.lat), lng = Number(body.lng);
  if (!image.startsWith("data:image/jpeg;base64,") && !image.startsWith("data:image/png;base64,")) {
    return json({ error: "bad_image" }, 400);
  }
  if (image.length > 950_000) return json({ error: "too_large" }, 413); // a 640px JPEG q0.7 ≈ 60–120KB

  // 10-min cache per camera — a frame doesn't change meaningfully every second, and re-reading the
  // same cam burns the free NIM quota.
  const ck = `${camId}:${Math.floor(Date.now() / 600_000)}`;
  if (camId) {
    const hit = cache.get(ck);
    if (hit) return json({ available: true, ...hit, cached: true });
  }

  const hasLatLng = Number.isFinite(lat) && Number.isFinite(lng);
  const [raw, hadRain] = await Promise.all([
    vlmRead(image, { deadlineMs: Date.now() + 24_000 }),
    hasLatLng ? recentRain(lat, lng) : Promise.resolve(null),
  ]);
  if (!raw) return json({ available: true, read: null, reason: "model_unavailable" }, 503);
  const read = parseCamRead(raw);
  if (!read) return json({ available: true, read: null, reason: "unparseable" }, 502);

  const flood = assessFlood(read, hadRain);
  const out = { read, flood, frameAt: Date.now() };
  if (camId && cache.size < 4000) cache.set(ck, out);
  return json({ available: true, ...out });
}
