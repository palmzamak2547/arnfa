"use client";

import { createContext, useContext, useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";

/**
 * The locale the SERVER rendered with (from the arnfa.locale cookie). useLang uses
 * it as the SSR + first-paint baseline so reload renders the chosen language with
 * NO Thai→English flash. Defaults to Thai.
 */
export const LocaleContext = createContext<"th" | "en">("th");

/**
 * useLang — the smooth language read. SSR and the FIRST client paint always report
 * Thai (the SSR default) so hydration matches (no React #418); after the app has
 * hydrated once, every component reads the real language immediately — including on
 * client-side navigations, so there's NO Thai→English flash when you move between
 * pages. The hydrated flag is GLOBAL (module-level), not per-component, which is
 * what makes navigation flash-free.
 */

let _hydrated = false;
const subs = new Set<() => void>();

/** Flip the global flag on once, after the first mount; re-render all subscribers. */
export function markHydrated() {
  if (_hydrated) return;
  _hydrated = true;
  subs.forEach((f) => f());
}

function subscribe(cb: () => void) { subs.add(cb); return () => subs.delete(cb); }

export function useHydrated(): boolean {
  return useSyncExternalStore(subscribe, () => _hydrated, () => false);
}

/**
 * `{ en, lang }` — before hydration, reports the SERVER-rendered locale (from the
 * cookie via LocaleContext) so SSR + first paint agree and reload is flash-free;
 * after hydration, reflects the live chosen language.
 */
export function useLang(): { en: boolean; lang: string } {
  const { i18n } = useTranslation();
  const hydrated = useHydrated();
  const initial = useContext(LocaleContext);
  const lang = hydrated ? i18n.language : initial;
  return { en: lang === "en", lang };
}
