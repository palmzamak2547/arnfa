import { SkyChip, type SkyState } from "@/components/SkyChip";

/**
 * TheSkySection — "§ ภาค ๑ · How to read the sky", from the Arnfa brand book. The editorial
 * explainer of Arnfa's core idea — each place has its own weather-fit profile — beside a column
 * of SkyChip states mapped to what each sky is good for. Bilingual inline (Thai primary, English
 * as the italic undertitle), matching the broadsheet voice. Replaces the old "How Arnfa thinks".
 */

const ROWS: { state: SkyState; th: string }[] = [
  { state: "clear", th: "ออกได้ทุกที่ — ตลาด ริมน้ำ สวน" },
  { state: "partly", th: "ดีสุดสำหรับเดินเล่นกลางแจ้ง" },
  { state: "cloudy", th: "แดดไม่แรง — เหมาะคาเฟ่ ถ่ายรูป" },
  { state: "rain", th: "สลับเป็นในร่ม — หอศิลป์ คาเฟ่ที่ดีขึ้นเมื่อฝนตก" },
];

export function TheSkySection() {
  return (
    <section id="sky" className="relative z-10 mx-auto max-w-[1360px] px-4 py-[clamp(48px,7vw,92px)] sm:px-[clamp(16px,4vw,46px)]">
      <div className="mb-[clamp(28px,4vw,52px)] flex flex-wrap items-baseline justify-between gap-4 border-t pt-3" style={{ borderColor: "var(--arnfa-ink)" }}>
        <span className="font-display text-[0.72rem] uppercase tracking-[0.24em] text-ink-muted">ภาค ๑ · How to read the sky</span>
        <span className="font-display text-[0.86rem] italic text-ink-faint">คู่มืออ่านฟ้า</span>
      </div>

      <div className="grid items-start gap-[clamp(28px,5vw,72px)] md:grid-cols-2">
        <div>
          <h2 className="font-thai-serif font-light text-ink" style={{ fontSize: "clamp(1.9rem, 1.2rem + 2.6vw, 3.2rem)", lineHeight: 1.28, letterSpacing: "-0.02em" }}>
            แต่ละสถานที่ มี<em className="font-display not-italic" style={{ fontStyle: "italic" }}>โปรไฟล์</em>ความเข้ากับอากาศ ของตัวเอง.
          </h2>
          <p className="mt-[22px] max-w-[42ch] text-ink-muted" style={{ fontSize: "1.04rem", lineHeight: 1.7 }}>
            คาเฟ่ริมน้ำดีตอนแดดอ่อน หอศิลป์ดีตอนฝน ตลาดกลางคืนดีตอนฟ้าเปิด — อ่านฟ้าจับคู่ &ldquo;ที่&rdquo; กับ &ldquo;ฟ้า&rdquo; ใน{" "}
            <span className="font-medium text-ink">ชั่วโมงที่คุณจะไปถึงจริง</span> ไม่ใช่ค่าเฉลี่ยทั้งวัน.
          </p>
          <p className="mt-[18px] font-display italic text-ink-faint" style={{ fontSize: "1.05rem" }}>
            Every place keeps its own profile of which sky suits it best.
          </p>
        </div>

        <div className="border-t border-hairline">
          {ROWS.map((r) => (
            <div key={r.state} className="flex items-center gap-[18px] border-b border-hairline py-4">
              <span className="w-[160px] flex-none"><SkyChip state={r.state} arrivalLabel="" size="sm" /></span>
              <span className="text-[0.96rem] text-ink-muted">{r.th}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
