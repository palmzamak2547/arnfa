/**
 * Colophon — "§ ภาค ๕ · Colophon", the broadsheet's closing credits from the Arnfa brand book:
 * the four type voices, the "ink = meaning" colour legend (which decodes Arnfa's weather-semantic
 * palette for the reader), and the single "drift" motion note. A traditional newspaper colophon —
 * static, editorial, reinforcing the identity at the foot of the front page.
 */

const VOICES = [
  { sample: "อ่านฟ้า", font: "var(--font-thai-serif)", style: { fontWeight: 300, fontSize: "2.4rem" }, label: "พาดหัวไทย · Noto Serif Thai" },
  { sample: "Reads the sky", font: "var(--font-display)", style: { fontStyle: "italic", fontSize: "2.1rem" }, label: "พาดหัวลาติน · Newsreader" },
  { sample: "บอกฟ้า แล้วได้ทริปดี", font: "var(--font-thai)", style: { fontSize: "1.4rem" }, label: "เนื้อความไทย · Anuphan" },
  { sample: "Body & numerals 0123", font: "var(--font-sans)", style: { fontSize: "1.4rem" }, label: "UI ลาติน · Inter", tabular: true },
];

const INK = [
  { v: "--arnfa-accent-sun", th: "แดด · ฟ้าเปิด", note: "#F2A65A · ไป" },
  { v: "--arnfa-accent-rain", th: "ฝน · รอ", note: "#5B7FB8 · ข้อมูล" },
  { v: "--arnfa-accent-indoor-warm", th: "เข้าร่ม · สลับ", note: "#D9534A · เตือน" },
  { v: "--arnfa-success", th: "เคลียร์ · ไปได้", note: "#7BA68A · ผ่าน" },
];

function Head({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-[22px] border-b border-hairline pb-2.5 font-display text-[0.74rem] uppercase tracking-[0.18em] text-ink-faint">{children}</h3>;
}

export function Colophon() {
  return (
    <section id="colophon" className="relative z-10 mx-auto max-w-[1360px] px-4 py-[clamp(48px,7vw,92px)] sm:px-[clamp(16px,4vw,46px)]">
      <div className="mb-[clamp(30px,4vw,56px)] flex flex-wrap items-baseline justify-between gap-4 border-t pt-3" style={{ borderColor: "var(--arnfa-ink)" }}>
        <span className="font-display text-[0.72rem] uppercase tracking-[0.24em] text-ink-muted">ภาค ๕ · Colophon</span>
        <span className="font-display text-[0.86rem] italic text-ink-faint">ตัวพิมพ์ · หมึก · จังหวะ</span>
      </div>

      <div className="grid items-start gap-[clamp(20px,3vw,40px)] [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))]">
        {/* THE VOICES */}
        <div>
          <Head>ตัวพิมพ์สี่เสียง · The voices</Head>
          {VOICES.map((v) => (
            <div key={v.label} className="mb-5">
              <div className={v.tabular ? "tabular-nums leading-none text-ink" : "leading-none text-ink"} style={{ fontFamily: v.font, ...v.style }}>{v.sample}</div>
              <div className="mt-1 text-[0.74rem] text-ink-faint">{v.label}</div>
            </div>
          ))}
        </div>

        {/* INK = MEANING */}
        <div>
          <Head>หมึกที่มีความหมาย · Ink = meaning</Head>
          <div className="flex flex-col gap-3.5">
            {INK.map((k) => (
              <div key={k.v} className="flex items-center gap-3.5">
                <span className="h-[46px] w-[46px] flex-none rounded-lg shadow-sm" style={{ background: `var(${k.v})` }} />
                <span className="flex flex-col leading-[1.36]">
                  <span className="font-medium text-ink">{k.th}</span>
                  <span className="tabular-nums text-[0.78rem] text-ink-faint">{k.note}</span>
                </span>
              </div>
            ))}
            <div className="mt-1 flex items-center gap-3.5 border-t border-hairline pt-3.5">
              <span className="h-[46px] w-[46px] flex-none rounded-lg border border-hairline" style={{ background: "var(--arnfa-paper)" }} />
              <span className="h-[46px] w-[46px] flex-none rounded-lg" style={{ background: "var(--arnfa-ink)" }} />
              <span className="text-[0.82rem] text-ink-faint">กระดาษอุ่น + หมึกน้ำเงินเข้ม<br /><span className="tabular-nums">#F4EFE6 · #1A1F2B</span></span>
            </div>
          </div>
        </div>

        {/* THE DRIFT */}
        <div>
          <Head>จังหวะเดียว · The drift</Head>
          <p className="mb-[22px] text-[0.98rem] leading-[1.7] text-ink-muted">ทุกการเคลื่อนไหวใช้อีสซิ่งเดียว — นุ่ม ลื่น ไม่เด้ง เหมือนเมฆลอย ไม่ใช่สปริง.</p>
          <div className="relative mb-3.5 h-2 rounded-full bg-hairline">
            <span className="arnfa-travel absolute top-1/2 -mt-[9px] h-[18px] w-[18px] rounded-full" style={{ background: "var(--arnfa-accent-sun)", boxShadow: "0 0 14px 2px rgba(242,166,90,.5)" }} />
          </div>
          <p className="font-sans tabular-nums text-[0.78rem] text-ink-faint">cubic-bezier(0.22, 1, 0.36, 1)</p>
          <div className="mt-6 flex flex-wrap gap-2.5">
            {["เร็ว 320ms", "ฐาน 700ms", "ช้า 1200ms"].map((c) => (
              <span key={c} className="tabular-nums rounded-full border border-hairline px-3 py-1.5 text-[0.78rem] text-ink-muted">{c}</span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
