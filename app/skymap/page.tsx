"use client";

import dynamic from "next/dynamic";
import { Masthead } from "@/components/Masthead";

// MapLibre needs the browser — load the map client-side only, with an honest loading state.
const SkyMapView = dynamic(() => import("@/components/SkyMapView").then((m) => m.SkyMapView), {
  ssr: false,
  loading: () => (
    <div className="grid h-full w-full place-items-center font-thai text-sm text-ink-muted">
      กำลังเปิดแผนที่ฟ้า…
    </div>
  ),
});

export default function SkyMapPage() {
  return (
    <main className="relative z-10 flex h-[100dvh] flex-col">
      <Masthead />
      <div className="relative min-h-0 flex-1">
        <SkyMapView />
      </div>
    </main>
  );
}
