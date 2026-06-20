import Link from "next/link";
import { rankAreasForDay } from "@/lib/where/today";
import { Reveal } from "@/components/motion/Reveal";

/**
 * TodayPick — the home page's REAL "today's pick" (replaces a hand-written mockup
 * that fabricated specific numbers). Server component, ISR-cached via the page's
 * `revalidate`. Iron Rule 0: if the forecast call fails, fall back to concept copy
 * with NO invented numbers — never fabricate a pick.
 */

const VERDICT_PROSE: Record<string, string> = {
  clearish: "ฟ้าโปร่ง เหมาะกับกลางแจ้ง",
  ok: "ฟ้ากำลังดี ออกได้สบาย",
  closing: "ฟ้าเริ่มปิด เผื่อแผนในร่มไว้",
  poor: "ฟ้าปิด ฝนเยอะ วันนี้เน้นในร่ม",
};

export async function TodayPick() {
  const ranked = await rankAreasForDay(0);
  const top = ranked?.areas?.[0];

  return (
    <section className="arnfa-grid section-major">
      <Reveal className="col-content col-left-7">
        <p className="font-display text-xs uppercase tracking-[0.25em] text-ink-faint mb-6">
          วันนี้ฟ้าโปร่งสุด · Clearest today
        </p>

        {top ? (
          <>
            <h2 className="font-thai-serif fs-h2 font-light text-ink leading-[1.08] mb-6 text-balance">
              บ่ายนี้ไป <span className="font-display italic text-sun">{top.en}</span> — {top.th} ฟ้าเปิดสุดในไทย
            </h2>
            <p className="font-thai fs-lead text-ink-muted leading-relaxed max-w-[52ch] mb-7">
              {top.tempC}° · ฝนเฉลี่ย {top.rainProb}% ช่วงกลางวัน (08:00–18:00). {VERDICT_PROSE[top.verdict] ?? ""}
            </p>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              <Link
                href={`/plan?y=${top.key}`}
                className="font-thai inline-flex h-11 items-center rounded-full bg-ink px-7 text-paper text-base font-medium transition-colors hover:bg-ink-muted"
              >
                วางแผนทริปที่ {top.th} →
              </Link>
              <Link href="/where" className="font-thai text-sm text-rain hover:underline">
                ดูอันดับฟ้าทั่วไทย
              </Link>
            </div>
            <p className="font-thai text-[0.7rem] text-ink-faint mt-6">
              จัดอันดับจากพยากรณ์จริง Open-Meteo อัปเดตทุก ~30 นาที เรียงตามฟ้า (ยังไม่รวมฝุ่น)
            </p>
          </>
        ) : (
          // Honest fallback — no fabricated numbers when the forecast isn't available
          <>
            <h2 className="font-thai-serif fs-h2 font-light text-ink leading-[1.08] mb-6 text-balance">
              ทุกบ่ายฟ้ากรุงเทพไม่เหมือนกัน — Arnfah อ่านฟ้า <span className="font-display italic text-sun">ณ เวลาที่คุณจะไปถึง</span>.
            </h2>
            <p className="font-thai fs-lead text-ink-muted leading-relaxed max-w-[52ch] mb-7">
              เลือกย่านกับเวลา แล้วเราจัดทริปให้ — ฝนมาช่วงไหน สลับเป็นที่ในร่มที่ &ldquo;ดีขึ้นเพราะฝน&rdquo; ให้ตรงนั้น.
            </p>
            <Link
              href="/where"
              className="font-thai inline-flex h-11 items-center rounded-full bg-ink px-7 text-paper text-base font-medium transition-colors hover:bg-ink-muted"
            >
              ไปไหนดีวันนี้ →
            </Link>
          </>
        )}
      </Reveal>
    </section>
  );
}
