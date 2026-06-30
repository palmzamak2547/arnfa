"use client";

import { useEffect } from "react";
import Link from "next/link";

/** Segment error boundary for /skymap (heavy MapLibre/WebGL) — a render error here degrades to a
 *  localized card that keeps the nav and points at the same live ranking, instead of blowing away
 *  the route shell. Mirrors SkyMapView's honest /where fallback. */
export default function SkymapError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("[arnfa] skymap error:", error); }, [error]);
  return (
    <main className="relative z-10 flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="font-thai-serif text-2xl font-light text-ink">แผนที่สะดุดนิดหน่อย</h1>
      <p className="max-w-sm font-thai text-ink-muted">ดูอันดับฟ้าทั่วไทยแบบรายการชุดเดียวกันได้เลย — the map hiccuped; the same live ranking is on the list view.</p>
      <div className="flex gap-3">
        <button type="button" onClick={reset} className="font-thai inline-flex h-11 items-center rounded-full bg-ink px-6 text-sm font-medium text-paper transition-colors hover:bg-ink-muted">ลองใหม่ Retry</button>
        <Link href="/where" className="font-thai inline-flex h-11 items-center rounded-full border border-hairline px-6 text-sm font-medium text-ink transition-colors hover:bg-surface">ไปไหนดี →</Link>
      </div>
    </main>
  );
}
