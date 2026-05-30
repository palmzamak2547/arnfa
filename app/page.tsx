import { ArnfaRibbon } from "@/components/ArnfaRibbon";
import { HomeHero } from "@/components/HomeHero";
import { SiteHeader } from "@/components/SiteHeader";

export default function Home() {
  return (
    <main className="relative z-10 flex flex-col">
      <SiteHeader />

      {/* HERO — R3F sky with real BKK clock + weather, translatable overlay */}
      <HomeHero />

      {/* NOW STRIP — อ่านฟ้า ribbon (6-hour brushstroke) */}
      <section className="relative border-y border-hairline bg-surface/50 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-6 py-8 sm:px-12">
          <p className="font-display text-xs uppercase tracking-[0.25em] text-ink-faint mb-4">
            อ่านฟ้า — next six hours
          </p>
          <ArnfaRibbon />
        </div>
      </section>

      {/* TODAY'S PICK */}
      <section className="px-6 py-24 sm:px-12 lg:px-20">
        <div className="mx-auto max-w-5xl">
          <p className="font-display text-xs uppercase tracking-[0.25em] text-ink-faint mb-6">
            Today&apos;s pick
          </p>
          <h2 className="font-display text-4xl sm:text-5xl font-light text-ink leading-tight mb-8">
            <span className="font-thai">บ่ายนี้ฟ้าเปิด —</span> the rooftop at{" "}
            <em className="text-sun">Yelo House</em> reads better than the cafe.
          </h2>
          <p className="font-thai text-lg text-ink-muted leading-relaxed max-w-2xl">
            หลังคาเปิด มุมลม แต่ไม่ร้อนเพราะร่ม. UV ปานกลาง 14:00–16:00.
            ใกล้ MRT คลองเตย เดิน 6 นาที. ฝนตามพยากรณ์ 18% — Arnfa เผื่อทาง
            ในร่มไว้ที่ห่าง 280 ม.
          </p>
        </div>
      </section>

      {/* HOW ARNFA THINKS */}
      <section id="how" className="border-t border-hairline px-6 py-24 sm:px-12 lg:px-20">
        <div className="mx-auto max-w-3xl">
          <p className="font-display text-xs uppercase tracking-[0.25em] text-ink-faint mb-6">
            How Arnfa thinks
          </p>
          <h2 className="font-display text-3xl sm:text-4xl font-light text-ink leading-snug mb-8">
            แต่ละสถานที่มี <em>โปรไฟล์ความเข้ากับอากาศ</em> ของตัวเอง.
          </h2>
          <p className="font-thai text-lg text-ink-muted leading-relaxed mb-6">
            สวนกลางแจ้งเหมาะกับฟ้าเปิด แต่ไม่ใช่ทุกสวนเหมือนกัน — บางที่มีร่มไม้เยอะ
            ไม่สะดวกตอนฝนตก. คาเฟ่ริมหน้าต่างไม่ใช่แค่ &ldquo;ทน&rdquo; ฝนได้ —{" "}
            <em>มันดีขึ้น เมื่อฝนตก.</em>
          </p>
          <p className="font-thai text-lg text-ink-muted leading-relaxed">
            Arnfa อ่านโปรไฟล์เหล่านี้จาก OpenStreetMap structured tags + รีวิวจริงของผู้ใช้ +
            ฟ้าจาก Open-Meteo + เรดาร์ใกล้ตัวจาก RainViewer. ทุกคำแนะนำมี
            <em> เหตุผล</em> เสมอ — ไม่ใช่กล่องดำ.
          </p>
        </div>
      </section>

      <footer className="border-t border-hairline px-6 py-12 sm:px-12 lg:px-20">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row justify-between gap-4 text-sm text-ink-faint">
          <p className="font-display">อ่านฟ้า — ฟ้ากรุงเทพ ตามเวลา</p>
          <p className="font-thai">
            ข้อมูล: Open-Meteo, MET Norway, OpenStreetMap, Air4Thai (กรมควบคุมมลพิษ)
          </p>
        </div>
      </footer>
    </main>
  );
}
