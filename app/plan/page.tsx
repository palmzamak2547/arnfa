import type { Metadata } from "next";
import { districtMeta } from "@/lib/poi/districts";
import { PlanClient } from "./PlanClient";

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
  const area = typeof sp.y === "string" ? sp.y : "";
  const day = typeof sp.d === "string" ? sp.d : "0";
  const meta = districtMeta(area);
  const title = meta ? `วางแผนทริปที่${meta.th} — อ่านฟ้า` : "วางแผนทริปตามฟ้า — อ่านฟ้า";
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
