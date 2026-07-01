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

// ── Node.js https-based fetch (bypasses Cloudflare undici block) ────────────
function httpsGet<T>(url: string, apiKey: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { "x-api-key": apiKey } }, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        try { resolve(JSON.parse(data) as T); }
        catch { reject(new Error(`TAT parse error: ${data.slice(0, 200)}`)); }
      });
    });
    req.on("error", reject);
    req.setTimeout(8000, () => { req.destroy(); reject(new Error("TAT timeout")); });
  });
}

// ── shared fetch helper ─────────────────────────────────────────────────────
async function tatFetch<T>(path: string, params: Record<string, string | number> = {}): Promise<T | null> {
  const key = tatKey();
  if (!key) return null;

  const url = new URL(`${TAT_BASE}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));

  const cacheKey = url.toString();
  const hit = cached<T>(cacheKey);
  if (hit) return hit;

  try {
    const d = await httpsGet<T>(url.toString(), key);
    setCache(cacheKey, d);
    return d;
  } catch (e) {
    console.error("TAT fetch failed", path, e);
    return null;
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
export async function tatNearbyPlaces(lat: number, lng: number, opts: { limit?: number; radius?: number } = {}): Promise<TatPlace[]> {
  const d = await tatFetch<{ data: TatPlace[] }>("/places", {
    latitude: lat,
    longitude: lng,
    radius: opts.radius ?? 10,
    limit: opts.limit ?? 10,
  });
  return d?.data ?? [];
}

/** Current/upcoming events, optionally near a location. */
export async function tatEvents(opts: { lat?: number; lng?: number; limit?: number } = {}): Promise<TatEvent[]> {
  const params: Record<string, string | number> = { limit: opts.limit ?? 6, page: 1 };
  if (opts.lat && opts.lng) {
    params.latitude = opts.lat;
    params.longitude = opts.lng;
  }
  const d = await tatFetch<{ data: TatEvent[] }>("/events", params);
  return d?.data ?? [];
}

/** Recommended travel routes from TAT. */
export async function tatRoutes(opts: { limit?: number } = {}): Promise<TatRoute[]> {
  const d = await tatFetch<{ data: TatRoute[] }>("/routes", { limit: opts.limit ?? 6, page: 1 });
  return d?.data ?? [];
}
