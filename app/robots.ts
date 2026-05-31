import type { MetadataRoute } from "next";

const BASE = "https://arnfa.vercel.app";

/** robots.txt — allow all, point to sitemap, keep API out of the index. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: "/api/" }],
    sitemap: `${BASE}/sitemap.xml`,
  };
}
