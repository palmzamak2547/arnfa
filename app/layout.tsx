import type { Metadata, Viewport } from "next";
import { Fraunces, Inter_Tight, IBM_Plex_Sans_Thai_Looped } from "next/font/google";
import "./globals.css";
import { ClientShell } from "@/components/ClientShell";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz", "SOFT"],
  display: "swap",
});

const interTight = Inter_Tight({
  variable: "--font-inter-tight",
  subsets: ["latin"],
  display: "swap",
});

const plexThai = IBM_Plex_Sans_Thai_Looped({
  variable: "--font-plex-thai",
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "อ่านฟ้า · Arnfa",
  description: "วางแผนทริปกรุงเทพให้เข้ากับฟ้า — decision engine ที่อ่านฟ้าให้คุณ",
  applicationName: "Arnfa",
  authors: [{ name: "Palm" }],
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
  openGraph: {
    title: "อ่านฟ้า · Arnfa",
    description: "Decision engine ที่อ่านฟ้าให้คุณ — ฝนมาแล้วบอกที่ดีกว่า",
    locale: "th_TH",
    alternateLocale: ["en_US"],
  },
};

export const viewport: Viewport = {
  themeColor: "#F4EFE6",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="th"
      className={`${fraunces.variable} ${interTight.variable} ${plexThai.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col relative">
        <ClientShell>{children}</ClientShell>
      </body>
    </html>
  );
}
