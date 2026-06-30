import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "สถานะระบบ",
  description: "สถานะ endpoint และความพร้อมของข้อมูลอ่านฟ้าแบบเรียลไทม์ — โปร่งใส ตรวจสอบได้",
  robots: { index: false },
  openGraph: { title: "สถานะระบบ — อ่านฟ้า", description: "สถานะ endpoint แบบเรียลไทม์" },
};

export default function StatusLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
