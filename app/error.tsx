"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * Route error boundary — catches render errors in any route segment.
 * Stays on-brand (Open Sky editorial), no stack trace shown to users, offers
 * a retry + home path. Logs to console for diagnostics.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[arnfa] route error:", error);
  }, [error]);

  return (
    <main className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <p className="font-display text-xs uppercase tracking-[0.28em] text-ink-faint mb-4">
        เมฆบังชั่วคราว
      </p>
      <h1 className="font-thai-serif text-4xl sm:text-5xl font-light text-ink mb-4">
        ฟ้าครึ้มไปนิด
      </h1>
      <p className="font-thai text-lg text-ink-muted max-w-md mb-2">
        มีบางอย่างสะดุด — ไม่ใช่ความผิดของคุณ. ลองใหม่อีกครั้งได้เลย
        เราไม่เก็บอะไรที่เสียหายไว้
      </p>
      <p className="font-thai text-base text-ink-faint max-w-md mb-8">
        Something hiccuped — not your fault, and nothing broken is kept. Try again.
      </p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={reset}
          className="font-thai inline-flex h-11 items-center rounded-full bg-ink px-7 text-sm font-medium text-paper transition-colors hover:bg-ink-muted"
        >
          ลองอีกครั้ง Retry
        </button>
        <Link
          href="/"
          className="font-thai inline-flex h-11 items-center rounded-full border border-hairline px-7 text-sm font-medium text-ink transition-colors hover:bg-surface"
        >
          กลับหน้าแรก Home
        </Link>
      </div>
    </main>
  );
}
