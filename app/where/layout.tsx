import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ไปไหนดี · ฟ้าเปิดที่ไหนในไทย",
  description: "ฟ้าเปิดที่ไหนในไทยวันนี้หรือสุดสัปดาห์นี้ จัดอันดับทุกพื้นที่จากพยากรณ์จริง เลือกวันแล้วเราบอกที่ฟ้าโปร่งสุดให้",
  openGraph: { title: "ไปไหนดี · อ่านฟ้า", description: "ฟ้าเปิดที่ไหนในไทย — จัดอันดับจากพยากรณ์จริง" },
};

export default function WhereLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
