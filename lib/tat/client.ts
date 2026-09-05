/**
 * client.ts — TAT (Tourism Authority of Thailand) Data API client.
 * Uses the official tatdataapi.io v2 endpoints to fetch real places, events, and routes.
 * Server-only — TAT_API_KEY is never exposed to the client.
 *
 * NOTE: We use Node.js `https` module instead of `fetch()` because Cloudflare's
 * anti-bot layer blocks the undici User-Agent that Node.js native fetch sends.
 *
 * Caching: in-memory cache (5 min TTL) to avoid hammering the API.
 */

import https from "https";

const TAT_BASE = "https://tatdataapi.io/api/v2";

function tatKey(): string {
  return process.env.TAT_API_KEY ?? "";
}

export function tatConfigured(): boolean {
  return !!tatKey();
}

// ── simple in-memory cache (server module scope → lives across requests) ────
type CacheEntry<T> = { data: T; ts: number };
const cache = new Map<string, CacheEntry<unknown>>();
const TTL = 5 * 60_000; // 5 minutes

function cached<T>(key: string): T | null {
  const e = cache.get(key);
  if (!e) return null;
  if (Date.now() - e.ts > TTL) { cache.delete(key); return null; }
  return e.data as T;
}
function setCache<T>(key: string, data: T) {
  cache.set(key, { data, ts: Date.now() });
}

/** Honest result: an upstream failure is NOT an empty list. Callers must be able to tell
 *  "TAT says there is nothing here" apart from "we could not reach TAT". */
export type TatResult<T> = { ok: true; items: T[] } | { ok: false; reason: TatFailReason };
export type TatFailReason = "no_key" | "timeout" | "http_error" | "bad_payload" | "network";

// ── Node.js https-based fetch (bypasses Cloudflare undici block) ────────────
// 4.5s, not 8s: this sits on a user-facing render path, so a stalled upstream must fail
// fast rather than hold the page hostage (a hung TAT was costing 8.4s on every request).
const REQ_TIMEOUT = 4500;

function httpsGet<T>(url: string, apiKey: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { "x-api-key": apiKey } }, (res) => {
      const status = res.statusCode ?? 0;
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        if (status < 200 || status >= 300) { reject(new Error(`http_${status}`)); return; }
        try { resolve(JSON.parse(data) as T); }
        catch { reject(new Error("bad_payload")); }
      });
    });
    req.on("error", (e) => reject(new Error(`network:${e.message}`)));
    req.setTimeout(REQ_TIMEOUT, () => { req.destroy(); reject(new Error("timeout")); });
  });
}

// ── negative cache ──────────────────────────────────────────────────────────
// When TAT is down/rate-limited it STALLS rather than erroring, so without this every
// request pays the full timeout. Remember a failure briefly and fail instantly instead.
const FAIL_TTL = 60_000;
let failUntil = 0;
let failReason: TatFailReason = "network";

function classify(e: unknown): TatFailReason {
  const m = e instanceof Error ? e.message : String(e);
  if (m === "timeout") return "timeout";
  if (m === "bad_payload") return "bad_payload";
  if (m.startsWith("http_")) return "http_error";
  return "network";
}

/** True while we're inside a recent-failure window (upstream considered down). */
export function tatDegraded(): boolean {
  return Date.now() < failUntil;
}

// ── shared fetch helper ─────────────────────────────────────────────────────
async function tatFetch<T>(path: string, params: Record<string, string | number> = {}): Promise<{ ok: true; data: T } | { ok: false; reason: TatFailReason }> {
  const key = tatKey();
  if (!key) return { ok: false, reason: "no_key" };

  const url = new URL(`${TAT_BASE}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));

  const cacheKey = url.toString();
  const hit = cached<T>(cacheKey);
  if (hit) return { ok: true, data: hit };

  // upstream recently failed → don't stall this request too
  if (tatDegraded()) return { ok: false, reason: failReason };

  try {
    const d = await httpsGet<T>(url.toString(), key);
    setCache(cacheKey, d);
    failUntil = 0; // recovered
    return { ok: true, data: d };
  } catch (e) {
    failReason = classify(e);
    failUntil = Date.now() + FAIL_TTL;
    console.error("TAT fetch failed", path, failReason);
    return { ok: false, reason: failReason };
  }
}

// ── Types ───────────────────────────────────────────────────────────────────

export interface TatPlace {
  placeId: string;
  name: string;
  introduction: string | null;
  latitude: string;
  longitude: string;
  thumbnailUrl: string[];
  tags: string[];
  viewer: number;
  slug: string;
  category: { categoryId: number; name: string };
  sha: { name?: string; detail?: string; thumbnailUrl?: string } | null;
  location: {
    address: string | null;
    province: { provinceId: number; name: string };
    district: { districtId: number; name: string };
  };
}

export interface TatEvent {
  eventId: number;
  name: string;
  introduction: string;
  startDate: string;
  endDate: string;
  latitude: number;
  longitude: number;
  thumbnailUrl: string;
  location: { province: { provinceId: number; name: string } };
}

export interface TatRoute {
  routeId: number;
  name: string;
  introduction: string;
  numberOfDays: number;
  thumbnailUrl: string;
  placeImageUrls: string[];
  provinceWithDay: { id: number; name: string; day: number }[];
}

// ── Public API ──────────────────────────────────────────────────────────────

/** Nearby places from TAT, sorted by distance. */
export async function tatNearbyPlaces(lat: number, lng: number, opts: { limit?: number; radius?: number } = {}): Promise<TatResult<TatPlace>> {
  const r = await tatFetch<{ data: TatPlace[] }>("/places", {
    latitude: lat,
    longitude: lng,
    radius: opts.radius ?? 10,
    limit: opts.limit ?? 10,
  });
  return r.ok ? { ok: true, items: r.data?.data ?? [] } : r;
}

/** Current/upcoming events, optionally near a location. */
export async function tatEvents(opts: { lat?: number; lng?: number; limit?: number } = {}): Promise<TatResult<TatEvent>> {
  const params: Record<string, string | number> = { limit: opts.limit ?? 6, page: 1 };
  if (opts.lat && opts.lng) {
    params.latitude = opts.lat;
    params.longitude = opts.lng;
  }
  const r = await tatFetch<{ data: TatEvent[] }>("/events", params);
  return r.ok ? { ok: true, items: r.data?.data ?? [] } : r;
}

/** Recommended travel routes from TAT. */
export async function tatRoutes(opts: { limit?: number } = {}): Promise<TatResult<TatRoute>> {
  const r = await tatFetch<{ data: TatRoute[] }>("/routes", { limit: opts.limit ?? 6, page: 1 });
  return r.ok ? { ok: true, items: r.data?.data ?? [] } : r;
}
