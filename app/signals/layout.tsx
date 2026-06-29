import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "สัญญาณเมือง · กรุงเทพฯ ตอนนี้",
  description: "ฟ้า ฝุ่น PM2.5 และเสียงประชาชน รวมเป็นการตัดสินใจ — กระบวนการ เข้าใจ → ทำนาย → ลงมือ ของอ่านฟ้า ที่ทำงานสดจากข้อมูลจริง",
  openGraph: {
    title: "สัญญาณเมือง · กรุงเทพฯ ตอนนี้",
    description: "ฟ้า ฝุ่น เสียงเมือง สด ๆ — เปลี่ยนสัญญาณของเมืองให้เป็นการตัดสินใจ",
  },
};

export default function SignalsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
