import Link from "next/link";

/** 404 — on-brand, not the default Next page. */
export default function NotFound() {
  return (
    <main className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <p className="font-display text-xs uppercase tracking-[0.28em] text-ink-faint mb-4">
        404
      </p>
      <h1 className="font-thai-serif text-4xl sm:text-5xl font-light text-ink mb-4">
        ฟ้าไม่มีหน้านี้
      </h1>
      <p className="font-thai text-lg text-ink-muted max-w-md mb-2">
        ลิงก์อาจเก่าหรือพิมพ์ผิด — กลับไปเริ่มวางแผนวันนี้กันดีกว่า
      </p>
      <p className="font-thai text-base text-ink-faint max-w-md mb-8">
        This page isn't in the sky — the link may be old or mistyped. Let's plan today instead.
      </p>
      <Link
        href="/"
        className="font-thai inline-flex h-11 items-center rounded-full bg-ink px-7 text-sm font-medium text-paper transition-colors hover:bg-ink-muted"
      >
        กลับหน้าแรก Home
      </Link>
    </main>
  );
}
