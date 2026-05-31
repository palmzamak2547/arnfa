import { NextResponse, type NextRequest } from "next/server";

/**
 * Security headers via middleware (not next.config headers()).
 *
 * Why middleware: in Next 16 + Turbopack, an async `headers()` in next.config
 * conflicts with next/font handling and 500s the dev server. Middleware is the
 * supported, robust path for security headers + CSP and runs on every response.
 *
 * CSP is tuned for Arnfa's REAL dependencies:
 *   - MapLibre GL creates Web Workers from blob: URLs   → worker-src blob:
 *   - R3F / three render WebGL to canvas                 → fine under default
 *   - 'unsafe-eval' is dev-only (Turbopack HMR + wasm); production drops it
 *   - data: forecast/POI/tiles/radar/wikidata + Wikimedia real imagery
 */
const isDev = process.env.NODE_ENV !== "production";

function csp(): string {
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    // Turbopack/HMR needs eval in dev; three/wasm wants wasm-unsafe-eval.
    `script-src 'self' 'unsafe-inline' ${isDev ? "'unsafe-eval'" : "'wasm-unsafe-eval'"}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "worker-src 'self' blob:",
    "child-src 'self' blob:",
    "img-src 'self' data: blob: https://tiles.openfreemap.org https://*.openfreemap.org https://upload.wikimedia.org https://commons.wikimedia.org https://*.basemaps.cartocdn.com https://*.tile.openstreetmap.org https://gibs.earthdata.nasa.gov",
    "connect-src 'self' https://api.open-meteo.com https://api.met.no https://overpass-api.de https://tiles.openfreemap.org https://*.openfreemap.org https://api.rainviewer.com https://tilecache.rainviewer.com https://www.wikidata.org https://query.wikidata.org https://commons.wikimedia.org https://gibs.earthdata.nasa.gov https://dcrbtlpiumqpiegzucpp.supabase.co wss://dcrbtlpiumqpiegzucpp.supabase.co",
    "manifest-src 'self'",
    "upgrade-insecure-requests",
  ].join("; ");
}

export function proxy(_req: NextRequest) {
  const res = NextResponse.next();
  res.headers.set("Content-Security-Policy", csp());
  res.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), payment=(), geolocation=(self)");
  res.headers.set("X-DNS-Prefetch-Control", "on");
  return res;
}

export const config = {
  // Apply to all routes except Next internals + static assets (faster, and the
  // OG image / static files don't need the CSP recomputed).
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|manifest.webmanifest|sw.js).*)"],
};
