import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ทริปที่บันทึก",
  description: "ทริปที่คุณเซฟไว้กับอ่านฟ้า",
  robots: { index: false }, // private user data
};

export default function TripsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
