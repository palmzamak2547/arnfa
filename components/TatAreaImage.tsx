"use client";
import { useState, useEffect } from "react";
import Image from "next/image";

export function TatAreaImage({ lat, lng, thName, fallbackBg }: { lat: number; lng: number; thName?: string; fallbackBg: string }) {
  const [imgUrl, setImgUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function fetchImage() {
      try {
        // 1. Try TAT API first
        const tatRes = await fetch(`/api/tat?lat=${lat}&lng=${lng}&limit=3`);
        const tatData = await tatRes.json();
        if (tatData?.places) {
          for (const p of tatData.places) {
            if (p.thumbnailUrl && p.thumbnailUrl.length > 0) {
              if (active) setImgUrl(p.thumbnailUrl[0]);
              return;
            }
          }
        }

        // 2. Fallback to Wikipedia API if TAT has no image
        if (thName) {
          const variants = [];
          if (thName.startsWith("จ.") || thName.startsWith("อ.")) {
            variants.push(thName.replace("จ.", "จังหวัด").replace("อ.", "อำเภอ"));
          } else {
            variants.push(thName);
            variants.push(`เขต${thName}`);
            variants.push(`จังหวัด${thName}`);
            if (thName === "ทองหล่อ") variants.push("ซอยทองหล่อ");
            if (thName === "เยาวราช" || thName === "สัมพันธวงศ์") variants.push("ถนนเยาวราช");
          }
          
          for (const wikiName of variants) {
            const wikiRes = await fetch(`https://th.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(wikiName)}`);
            if (wikiRes.ok) {
              const wikiData = await wikiRes.json();
              if (wikiData?.thumbnail?.source) {
                if (active) setImgUrl(wikiData.thumbnail.source);
                return;
              }
            }
          }
        }

        // 3. Ultimate Fallback: Longdo Static Map (if key exists)
        const longdoKey = process.env.NEXT_PUBLIC_LONGDO_MAP_API_KEY;
        if (longdoKey) {
          if (active) setImgUrl(`https://mmmap15.longdo.com/mmmap/images/map.php?zoom=11&lat=${lat}&lon=${lng}&key=${longdoKey}&mode=map&width=440&height=600&fmt=jpg`);
          return;
        }

      } catch (err) {
        console.error("Image fetch failed", err);
      }
    }

    fetchImage();
    return () => { active = false; };
  }, [lat, lng, thName]);

  if (imgUrl) {
    return (
      <div className="absolute inset-0 transition-transform var(--dur-slow) var(--ease-drift) group-hover:scale-105">
        <Image src={imgUrl} alt="Area" fill className="object-cover" unoptimized />
        {/* Subtle overlay so text remains readable over bright images/maps */}
        <div className="absolute inset-0 bg-black/10" />
      </div>
    );
  }

  return (
    <div className="absolute inset-0 transition-transform var(--dur-slow) var(--ease-drift) group-hover:scale-105" style={{ background: fallbackBg }} />
  );
}
