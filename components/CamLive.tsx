"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { useLang } from "@/lib/i18n/useLang";

export type CamHandle = {
  /** Grab the current frame as a data:image/jpeg URL (downscaled to maxW), or null if the video
   *  isn't ready or the canvas is cross-origin-tainted (→ caller shows an honest "can't read"). */
  grabFrame: (maxW?: number) => string | null;
};

/**
 * CamLive — plays a live iTIC / DOH traffic-camera HLS stream. Safari/iOS play HLS natively;
 * everywhere else we lazy-load hls.js. `crossOrigin="anonymous"` lets a canvas read the frame
 * without tainting (the iTIC host sends Access-Control-Allow-Origin: *). On a fatal error it shows
 * an honest message, never a frozen frame. Exposes grabFrame() so the parent can send the exact
 * on-screen frame to the VLM (lib/ai/vlm.ts) for an AI read.
 */
export const CamLive = forwardRef<CamHandle, { src: string; title: string }>(function CamLive({ src, title }, handle) {
  const { en } = useLang();
  const ref = useRef<HTMLVideoElement>(null);
  const [err, setErr] = useState(false);

  useImperativeHandle(handle, () => ({
    grabFrame(maxW = 640) {
      const v = ref.current;
      if (!v || v.readyState < 2 || !v.videoWidth) return null; // not enough data yet
      try {
        const scale = Math.min(1, maxW / v.videoWidth);
        const w = Math.round(v.videoWidth * scale), h = Math.round(v.videoHeight * scale);
        const c = document.createElement("canvas");
        c.width = w; c.height = h;
        const ctx = c.getContext("2d");
        if (!ctx) return null;
        ctx.drawImage(v, 0, 0, w, h);
        return c.toDataURL("image/jpeg", 0.7); // throws SecurityError if the canvas is tainted
      } catch {
        return null; // cross-origin taint → honest null, never a fake read
      }
    },
  }), []);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    setErr(false);
    let cancelled = false;
    let hls: { destroy: () => void } | null = null;

    if (v.canPlayType("application/vnd.apple.mpegurl")) {
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
      crossOrigin="anonymous"
      className="aspect-video w-full rounded-xl border border-hairline bg-ink object-contain"
      aria-label={title}
    />
  );
});
