"use client";

import { useEffect, useRef, useState } from "react";
import { useLang } from "@/lib/i18n/useLang";

/**
 * CamLive — plays a live iTIC / DOH traffic-camera HLS stream. Safari/iOS play HLS natively;
 * everywhere else we lazy-load hls.js (so ~100KB never touches the map bundle, only when a user
 * actually opens a live view). The iTIC HLS server sends `Access-Control-Allow-Origin: *`, so no
 * proxy is needed. On a fatal error (camera offline) it shows an honest message, never a frozen frame.
 */
export function CamLive({ src, title }: { src: string; title: string }) {
  const { en } = useLang();
  const ref = useRef<HTMLVideoElement>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    setErr(false);
    let cancelled = false;
    let hls: { destroy: () => void } | null = null;

    if (v.canPlayType("application/vnd.apple.mpegurl")) {
      // Safari / iOS — native HLS
      v.src = src;
      v.play().catch(() => {});
      v.addEventListener("error", () => setErr(true));
    } else {
      import("hls.js")
        .then(({ default: Hls }) => {
          if (cancelled || !ref.current) return;
          if (!Hls.isSupported()) { setErr(true); return; }
          const h = new Hls({ liveSyncDurationCount: 2, enableWorker: true });
          h.on(Hls.Events.ERROR, (_e, data) => { if (data?.fatal) setErr(true); });
          h.loadSource(src);
          h.attachMedia(ref.current);
          ref.current.play?.().catch(() => {});
          hls = h;
        })
        .catch(() => setErr(true));
    }

    return () => {
      cancelled = true;
      try { hls?.destroy(); } catch { /* ignore */ }
      if (v) { v.removeAttribute("src"); v.load(); }
    };
  }, [src]);

  if (err) {
    return (
      <div className="flex aspect-video w-full items-center justify-center rounded-xl border border-hairline bg-surface font-thai text-xs text-ink-faint">
        {en ? "This camera is offline right now" : "กล้องนี้ออฟไลน์ชั่วคราว"}
      </div>
    );
  }
  return (
    <video
      ref={ref}
      muted
      autoPlay
      playsInline
      controls
      className="aspect-video w-full rounded-xl border border-hairline bg-ink object-contain"
      aria-label={title}
    />
  );
}
