import type { MetadataRoute } from "next";

const BASE = "https://arnfa.vercel.app";

/** sitemap.xml — the public, indexable routes. (/status + /trips are noindex.) */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${BASE}/`, changeFrequency: "daily", priority: 1 },
    { url: `${BASE}/plan`, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE}/where`, changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE}/ai`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE}/data`, changeFrequency: "weekly", priority: 0.6 },
  ];
}
