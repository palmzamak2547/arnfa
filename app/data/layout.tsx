import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ข้อมูลของอ่านฟ้า — FACT ไม่ใช่ประมาณการ",
  description: "ทุกตัวเลขของอ่านฟ้าสืบไปถึงแหล่งข้อมูลเปิดที่ตรวจสอบได้ รวมข้อมูลทางการของรัฐไทย (Air4Thai, กทม.) พร้อมสัญญาอนุญาต ไม่มีการกุข้อมูล",
  openGraph: { title: "ข้อมูลของอ่านฟ้า — อ่านฟ้า", description: "ข้อมูลเปิด อ้างอิงได้ รวมข้อมูลทางการรัฐไทย — FACT ไม่ใช่ประมาณการ" },
};

export default function DataLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
