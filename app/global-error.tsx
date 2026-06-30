"use client";

import { useEffect } from "react";

/**
 * Global error boundary — catches errors in the ROOT layout itself (provider/i18n init),
 * where the normal app/error.tsx + app CSS aren't available. It must render its own
 * <html>/<body>, so it uses inline styles in the Open-Sky palette to stay on-brand.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("[arnfa] global error:", error); }, [error]);
  return (
    <html lang="th">
      <body style={{ margin: 0, minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#F4EFE6", color: "#1A1F2B", fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif", textAlign: "center", padding: 24 }}>
        <p style={{ fontSize: 12, letterSpacing: "0.28em", textTransform: "uppercase", color: "#8a8378", margin: "0 0 16px" }}>เมฆบังชั่วคราว</p>
        <h1 style={{ fontSize: 40, fontWeight: 300, margin: "0 0 16px" }}>ฟ้าครึ้มไปนิด</h1>
        <p style={{ fontSize: 17, color: "#5a5650", maxWidth: 440, margin: "0 0 24px", lineHeight: 1.5 }}>
          มีบางอย่างสะดุด ลองใหม่อีกครั้งได้เลย เราไม่เก็บอะไรที่เสียหายไว้ — Something hiccuped, please try again.
        </p>
        <button type="button" onClick={reset} style={{ height: 44, padding: "0 28px", borderRadius: 999, background: "#1A1F2B", color: "#F4EFE6", border: "none", fontSize: 14, cursor: "pointer" }}>
          ลองอีกครั้ง Retry
        </button>
      </body>
    </html>
  );
}
