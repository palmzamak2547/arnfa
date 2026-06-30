import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "สำหรับร้านค้า — ลงร้านตามอากาศ",
  description: "มีร้านที่ดีขึ้นเมื่อฝนตกไหม? บอกโปรไฟล์อากาศของร้านให้อ่านฟ้า แล้วได้ถูกแนะนำกับคนใกล้ ๆ ตอนที่ฟ้าพาเขามา",
  openGraph: {
    title: "สำหรับร้านค้า — ลงร้านตามอากาศ",
    description: "ให้ลูกค้าเจอร้านคุณตอนที่ฟ้าพาเขามา — แฟร์ ไม่มีดีลปลอม",
  },
};

export default function PartnerLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
