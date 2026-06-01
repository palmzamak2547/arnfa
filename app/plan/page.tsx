import type { Metadata } from "next";
import { cookies } from "next/headers";
import { districtMeta } from "@/lib/poi/districts";
import { PlanClient } from "./PlanClient";

const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * /plan — server wrapper. The interactive planner lives in PlanClient ("use client").
 * This server boundary exists so we can set a per-area, per-day Open Graph image
 * (the shareable sky card): a friend who opens a shared plan link sees that area's
 * real verdict, not a generic card.
 */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const sp = await searchParams;
  const cookieStore = await cookies();
  const en = cookieStore.get("arnfa.locale")?.value === "en";
  const area = typeof sp.y === "string" ? sp.y : "";
  const day = typeof sp.d === "string" ? sp.d : "0";
  const meta = districtMeta(area);
  const title = meta
    ? en ? `Plan a trip in ${titleCase(meta.en)} — Arnfa` : `วางแผนทริปที่${meta.th} — อ่านฟ้า`
    : en ? "Plan a trip — Arnfa" : "วางแผนทริปตามฟ้า — อ่านฟ้า";
  const og = `/api/og?area=${encodeURIComponent(area)}&day=${day}`;
  return {
    title,
    openGraph: { title, images: [{ url: og, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title, images: [og] },
  };
}

export default function PlanPage() {
  return <PlanClient />;
}
