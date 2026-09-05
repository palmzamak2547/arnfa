"use client";

import { useEffect, useState } from "react";

type RecommendedPoi = {
  id: string;
  name: string;
  nameTh?: string;
  category: string;
  recommendReason: string;
  score: number;
};

type MlRecommendationsProps = {
  districtKey: string;
  sky: string;
  vibes: string[];
  en: boolean;
};

export function MlRecommendations({ districtKey, sky, vibes, en }: MlRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<RecommendedPoi[]>([]);
  const [method, setMethod] = useState<"nvidia" | "tfidf" | null>(null);
  const [loading, setLoading] = useState(false);

  // `vibes` is a fresh array on every parent render, so depending on it re-fired this fetch on
  // every render (a request storm, and a late response could overwrite a newer district's).
  // Depend on the serialised value and drop stale responses instead.
  const vibesParam = vibes.join(",");
  useEffect(() => {
    if (!districtKey) return;
    let cancelled = false;
    setLoading(true);
    fetch(`/api/recommend?district=${districtKey}&sky=${sky}&vibes=${vibesParam}`)
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then((d: { recommendations: RecommendedPoi[]; method?: "nvidia" | "tfidf" }) => {
        if (cancelled) return;
        setRecommendations(d.recommendations ?? []);
        setMethod(d.method ?? null);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [districtKey, sky, vibesParam]);

  if (loading) {
    return (
      <section className="arnfa-grid mt-4 mb-2">
        <div className="col-content">
          <div className="h-4 w-40 rounded bg-ink/10 animate-pulse mb-3" />
          <div className="grid gap-4 sm:grid-cols-3">
            {[0, 1, 2].map(i => (
              <div key={i} className="h-28 rounded-2xl border border-hairline bg-surface/50 animate-pulse" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (recommendations.length === 0) return null;

  return (
    <section className="arnfa-grid mt-4 mb-2">
      <div className="col-content">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-base">✨</span>
          <h3 className="font-display text-[0.7rem] uppercase tracking-[0.2em] text-ink-faint">
            {en ? "Recommended for you (ML)" : "แนะนำเฉพาะคุณด้วย ML"}
          </h3>
          {/* Name the ranking that ACTUALLY ran. The NVIDIA embedding file is gitignored, so in
              production this is the TF-IDF path — claiming "NVIDIA embeddings" there would be a
              false statement about how the result was produced. */}
          <span className="ml-auto font-thai text-[0.55rem] text-ink-faint">
            {method === "nvidia"
              ? (en ? "NVIDIA embeddings, cosine similarity" : "เวกเตอร์ NVIDIA (cosine similarity)")
              : (en ? "keyword similarity (TF-IDF)" : "จัดอันดับตามคำใกล้เคียง (TF-IDF)")}
          </span>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {recommendations.map(poi => (
            <div
              key={poi.id}
              className="bg-white/80 rounded-2xl border border-hairline p-4 shadow-sm hover:shadow transition-shadow flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <h4 className="font-thai font-semibold text-sm text-ink line-clamp-1">
                    {poi.name}
                  </h4>
                  <span className="inline-block rounded-full bg-ink/5 px-2 py-0.5 font-thai text-[0.6rem] text-ink-muted shrink-0 capitalize">
                    {poi.category}
                  </span>
                </div>
                <p className="font-thai text-xs text-ink-muted bg-surface/40 border-l-2 border-sun/60 px-2.5 py-1.5 rounded-r-md leading-relaxed">
                  {poi.recommendReason}
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-hairline/40 flex items-center justify-between">
                <span className="font-thai text-[0.6rem] text-ink-faint">
                  {en ? `Match Score: ${(poi.score * 100).toFixed(0)}%` : `ความตรงใจ: ${(poi.score * 100).toFixed(0)}%`}
                </span>
                <span className="text-[0.65rem] text-sun">★</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
