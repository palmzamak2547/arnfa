/**
 * The crowd flywheel (arnfa.poi_crowd + the record_feedback RPC) is LIVE only once
 * the arnfa_0003 migration is applied to the dedicated Arnfa Supabase project AND
 * this flag is set. Until then it stays dormant so prod has zero console noise:
 *   activate = apply supabase/migrations/arnfa_0003_crowd.sql, then
 *              `vercel env add NEXT_PUBLIC_ARNFA_CROWD production` = 1, then redeploy.
 * (NEXT_PUBLIC_* is inlined at build time, so a redeploy is needed to flip it.)
 */
export const CROWD_ENABLED = process.env.NEXT_PUBLIC_ARNFA_CROWD === "1";
