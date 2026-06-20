import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ถามอ่านฟ้า · Arnfah AI",
  description: "ถามอ่านฟ้าเป็นภาษาไทย แล้ว AI อ่านฟ้าจริงและจัดทริปที่หลบฝน-หลบฝุ่นให้ คุยต่อได้ — เปลี่ยนวัน เลี่ยงฝน ลองย่านอื่น",
  openGraph: { title: "ถามอ่านฟ้า · Arnfah AI", description: "พิมพ์สิ่งที่อยากทำ แล้ว AI จัดทริปจากฟ้าจริงให้" },
};

export default function AiLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
