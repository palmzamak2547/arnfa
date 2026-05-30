import type { NextConfig } from "next";

/**
 * Security headers — strong defaults, tuned for Arnfa's real dependencies:
 *   - MapLibre GL spins workers from blob: URLs        → worker-src blob:
 *   - R3F/three render to canvas/WebGL                 → no extra CSP needed
 *   - next/font (Google) self-hosts at build           → fonts from 'self'
 *   - external data: Open-Meteo, MET Norway, Overpass, OpenFreeMap, RainViewer
 *   - real place imagery from Wikimedia Commons        → img-src wikimedia
 *
 * script-src uses 'unsafe-inline' (Next injects inline bootstrap). Upgrading to
 * a nonce-based CSP via middleware is the documented Phase-2 hardening.
 */

const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "worker-src 'self' blob:",
  "child-src 'self' blob:",
  "img-src 'self' data: blob: https://tiles.openfreemap.org https://*.openfreemap.org https://upload.wikimedia.org https://commons.wikimedia.org https://*.basemaps.cartocdn.com",
  "connect-src 'self' https://api.open-meteo.com https://api.met.no https://overpass-api.de https://tiles.openfreemap.org https://*.openfreemap.org https://api.rainviewer.com https://tilecache.rainviewer.com https://query.wikidata.org",
  "manifest-src 'self'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), payment=(), geolocation=(self)" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

const nextConfig: NextConfig = {
  transpilePackages: ["three", "@react-three/fiber", "@react-three/drei"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
