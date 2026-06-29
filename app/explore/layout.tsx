import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "เที่ยวกรุงเทพฯ ตามฟ้า",
  description: "มาเที่ยวกรุงเทพฯ? อ่านฟ้าวางวันให้ตามสภาพฟ้าจริง — ย่านไหนฟ้าโปร่งตอนนี้ ไปตอนไหน ฝนมาก็สลับเป็นที่ในร่มให้",
  openGraph: {
    title: "เที่ยวกรุงเทพฯ ตามฟ้า",
    description: "วางวันเที่ยวกรุงเทพฯ ตามฟ้าจริง — ย่านไหนฟ้าโปร่ง ไปตอนไหน เลี่ยงฝน",
  },
};

export default function ExploreLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
