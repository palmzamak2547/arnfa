import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
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
  title: {
    default: "อ่านฟ้า · Arnfa — วางแผนทริปทั่วไทยตามฟ้า",
    template: "%s · อ่านฟ้า",
  },
  description:
    "อ่านฟ้า (Arnfa) — decision engine ที่อ่านฟ้าให้คุณ. วางแผนทริปทั่วไทยให้เข้ากับอากาศ ณ เวลาที่จะไปถึง ฝนมาเมื่อไหร่บอกที่ดีกว่าให้เอง.",
  applicationName: "Arnfa",
  authors: [{ name: "Palm" }],
  keywords: [
    "อ่านฟ้า", "Arnfa", "วางแผนทริป", "พยากรณ์อากาศ", "ทั่วไทย", "กรุงเทพ", "เชียงใหม่", "ภูเก็ต", "คาเฟ่",
    "Thailand weather", "Bangkok weather", "trip planner", "decision engine",
  ],
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    title: "อ่านฟ้า · Arnfa",
    description: "Decision engine ที่อ่านฟ้าให้คุณ — ฝนมาแล้วบอกที่ดีกว่า",
    locale: "th_TH",
    alternateLocale: ["en_US"],
    type: "website",
    siteName: "อ่านฟ้า · Arnfa",
    // Default sky card; /plan overrides per-area via generateMetadata.
    images: [{ url: "/api/og", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "อ่านฟ้า · Arnfa",
    description: "Decision engine ที่อ่านฟ้าให้คุณ",
    images: ["/api/og"],
  },
};

export const viewport: Viewport = {
  themeColor: "#F4EFE6",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

/** JSON-LD — WebApplication, so search/social understand what Arnfa is. */
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "อ่านฟ้า (Arnfa)",
  alternateName: "Arnfa",
  url: "https://arnfa.vercel.app",
  applicationCategory: "TravelApplication",
  operatingSystem: "Web",
  inLanguage: ["th", "en"],
  offers: { "@type": "Offer", price: "0", priceCurrency: "THB" },
  description:
    "Decision engine that reads the Thai sky and plans a day that fits the weather at your arrival time, across Bangkok and every province. Open data: Open-Meteo, OpenStreetMap, Air4Thai.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Read the saved locale server-side so SSR renders in the user's language (no
  // Thai→English flash on reload for those who chose English). Thai by default.
  const cookieStore = await cookies();
  const initialLocale = cookieStore.get("arnfa.locale")?.value === "en" ? "en" : "th";
  return (
    <html
      lang={initialLocale}
      className={`${trirong.variable} ${newsreader.variable} ${anuphan.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col relative">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <ClientShell initialLocale={initialLocale}>{children}</ClientShell>
      </body>
    </html>
  );
}
