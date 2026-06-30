"use client";

import { useEffect } from "react";
import Link from "next/link";

/** Segment error boundary for /plan (PlanMap + many panels) — degrades to a localized card that
 *  keeps the nav, instead of taking down the whole route shell. */
export default function PlanError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("[arnfa] plan error:", error); }, [error]);
  return (
    <main className="relative z-10 flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="font-thai-serif text-2xl font-light text-ink">วางแผนสะดุดนิดหน่อย</h1>
      <p className="max-w-sm font-thai text-ink-muted">ลองใหม่อีกครั้ง หรือเลือกย่านจากหน้า “ไปไหนดี” — something hiccuped while planning; try again or pick an area.</p>
      <div className="flex gap-3">
        <button type="button" onClick={reset} className="font-thai inline-flex h-11 items-center rounded-full bg-ink px-6 text-sm font-medium text-paper transition-colors hover:bg-ink-muted">ลองใหม่ Retry</button>
        <Link href="/where" className="font-thai inline-flex h-11 items-center rounded-full border border-hairline px-6 text-sm font-medium text-ink transition-colors hover:bg-surface">ไปไหนดี →</Link>
      </div>
    </main>
  );
}
