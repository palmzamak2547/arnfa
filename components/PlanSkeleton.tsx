/**
 * PlanSkeleton — layout-shaped loading state for the plan list (no spinner).
 * Skeleton > spinner: no CLS, lower perceived wait. Reduced-motion = the pulse
 * is opacity-only (safe). Per Hanong polish lesson.
 */
export function PlanSkeleton() {
  return (
    <ol className="space-y-3" aria-label="กำลังอ่านฟ้า" aria-busy="true">
      {[0, 1, 2, 3].map((i) => (
        <li
          key={i}
          className="flex items-start gap-4 rounded-2xl border border-hairline bg-surface/50 p-4"
        >
          <div className="h-8 w-8 shrink-0 rounded-full bg-ink/10 animate-pulse" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3">
              <div className="h-4 w-40 rounded bg-ink/10 animate-pulse" />
              <div className="h-5 w-24 rounded-full bg-ink/[0.06] animate-pulse" />
            </div>
            <div className="mt-2 h-3 w-3/4 rounded bg-ink/[0.06] animate-pulse" />
          </div>
        </li>
      ))}
    </ol>
  );
}
