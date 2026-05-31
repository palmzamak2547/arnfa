"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

/**
 * useAuth — magic-link session for Phase 2 (saved trips + cloud taste). Anonymous
 * if Supabase isn't configured or nobody's signed in (the app still works fully).
 * The email redirect is per-call (arnfa origin) so we never touch the shared
 * project's site_url.
 */
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) { setReady(true); return; }
    sb.auth.getSession().then(({ data }) => { setUser(data.session?.user ?? null); setReady(true); });
    const { data: sub } = sb.auth.onAuthStateChange((_e, session) => setUser(session?.user ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  async function signIn(email: string): Promise<boolean> {
    const sb = getSupabase();
    if (!sb || typeof window === "undefined") return false;
    const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: `${window.location.origin}/auth/callback` } });
    return !error;
  }

  async function signOut() { await getSupabase()?.auth.signOut(); }

  return { user, ready, signIn, signOut };
}
