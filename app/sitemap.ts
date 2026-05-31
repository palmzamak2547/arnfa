import type { MetadataRoute } from "next";

const BASE = "https://arnfa.vercel.app";

/** sitemap.xml — the two real public routes. /plan is interactive but indexable. */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${BASE}/`, changeFrequency: "daily", priority: 1 },
    { url: `${BASE}/plan`, changeFrequency: "daily", priority: 0.8 },
  ];
}
