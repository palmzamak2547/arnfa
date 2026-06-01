/**
 * deferIdle — run a non-critical task when the main thread is idle (or after a short
 * fallback delay), so below-the-fold fetches (satellite fires, beach conditions)
 * don't compete with the critical forecast/air calls on first paint. Returns a
 * cancel fn. SSR-safe (no-op on the server).
 */
export function deferIdle(fn: () => void, timeout = 3000): () => void {
  if (typeof window === "undefined") return () => {};
  const ric = window.requestIdleCallback;
  if (ric) {
    const id = ric(fn, { timeout });
    return () => window.cancelIdleCallback?.(id);
  }
  const id = window.setTimeout(fn, 700);
  return () => window.clearTimeout(id);
}
