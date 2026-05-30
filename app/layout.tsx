import type { Metadata, Viewport } from "next";
import { Trirong, Newsreader, Anuphan, Inter } from "next/font/google";
import "./globals.css";
import { ClientShell } from "@/components/ClientShell";

/*
 * Type system — "Tricolor Editorial" (research-locked 2026-05-31).
 * Thai serif headline = the editorial unlock (Bangkok broadsheet, not weather widget).
 * All four are Google Fonts + SIL-OFL → zero license risk for the hackathon.
 *   - Trirong   : Thai serif, high-contrast display headlines (the differentiator)
 *   - Newsreader: Latin serif, optical-size, display + editorial body
 *   - Anuphan   : Thai sans, UI + body
 *   - Inter     : Latin sans, UI
 */

const trirong = Trirong({
  variable: "--font-display-th",
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

const newsreader = Newsreader({
  variable: "--font-display-en",
  subsets: ["latin"],
  // NOTE: next/font forbids `axes` together with an explicit `weight` array.
  // Newsreader's opsz still applies via its named weights; we just request weights.
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

const anuphan = Anuphan({
  variable: "--font-ui-th",
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-ui-en",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://arnfa.vercel.app"),
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
    type: "website",
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
      className={`${trirong.variable} ${newsreader.variable} ${anuphan.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col relative">
        <ClientShell>{children}</ClientShell>
      </body>
    </html>
  );
}
