import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "แผนที่ฟ้า · ฟ้าทั่วไทยบนแผนที่",
  description: "ฟ้าจริงของทุกพื้นที่ทั่วไทยบนแผนที่เดียว — แต่ละจุดบอกว่าฟ้าโปร่งแค่ไหนตอนนี้ เลือกวัน ค้นหาพื้นที่ แล้ววางแผนทริปต่อได้เลย",
  openGraph: {
    title: "แผนที่ฟ้า · อ่านฟ้า",
    description: "ฟ้าจริงทั่วไทยบนแผนที่ — เลือกวัน ดูที่ฟ้าโปร่งสุด แล้ววางแผนต่อ",
  },
};

export default function SkyMapLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
