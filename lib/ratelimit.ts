/**
 * Tiny per-IP sliding-window rate limiter (in-memory). Best-effort: Vercel can run several
 * serverless instances so a determined distributed flood isn't fully stopped, but this stops
 * the single-source curl flood that could drain the NVIDIA / Longdo / NASA free quotas and take
 * the live demo offline during judging — which is the real threat. No external store needed.
 */
type Bucket = { count: number; reset: number };
const store = new Map<string, Bucket>();

/** Returns { ok:false, retryAfter } when the caller has exceeded `limit` in `windowMs`. */
export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  // opportunistic sweep so the Map can't grow unbounded
  if (store.size > 5000) for (const [k, b] of store) if (now > b.reset) store.delete(k);
  const b = store.get(key);
  if (!b || now > b.reset) { store.set(key, { count: 1, reset: now + windowMs }); return { ok: true, retryAfter: 0 }; }
  if (b.count >= limit) return { ok: false, retryAfter: Math.max(1, Math.ceil((b.reset - now) / 1000)) };
  b.count++;
  return { ok: true, retryAfter: 0 };
}

/** Best client IP from the proxy headers. */
export function clientIp(req: Request): string {
  const h = req.headers;
  return (h.get("x-forwarded-for") || "").split(",")[0].trim() || h.get("x-real-ip") || "unknown";
}

/** A 429 with the right headers — `no-store` is mandatory so a CDN never caches+replays the 429. */
export function tooMany(retryAfter: number): Response {
  return new Response(JSON.stringify({ error: "rate_limited", retryAfter }), {
    status: 429,
    headers: { "Content-Type": "application/json", "Retry-After": String(retryAfter), "Cache-Control": "no-store" },
  });
}
