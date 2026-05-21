import { cn } from "@/lib/utils";
import { mergeTeamPlayHud, type TeamPlayHudSnapshot } from "./hud/teamPlayHudTypes";

const resultStyles: Record<TeamPlayHudSnapshot["lastMatchResult"], string> = {
  W: "bg-emerald-500 text-white",
  D: "bg-slate-400 text-white",
  L: "bg-rose-500 text-white",
  "—": "bg-slate-300 text-slate-800 dark:bg-slate-600 dark:text-white",
};

export function RecentMatchSummary({
  snapshot,
  variant = "light",
}: {
  snapshot?: Partial<TeamPlayHudSnapshot> | null;
  variant?: "light" | "dark" | "compact";
}) {
  const data = mergeTeamPlayHud(snapshot);
  const r = data.lastMatchResult;
  const label = r === "W" ? "승" : r === "D" ? "무" : r === "L" ? "패" : "—";
  const isDark = variant === "dark" || variant === "compact";
  const isCompact = variant === "compact";

  if (isCompact) {
    return (
      <section
        aria-label="오늘 경기"
        className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5"
      >
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-black",
            resultStyles[r]
          )}
        >
          {label}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">오늘 경기</p>
          <p className="text-sm font-black tabular-nums text-white">{data.lastMatchScore}</p>
          <p className="truncate text-[11px] text-slate-400">{data.lastMatchLabel}</p>
        </div>
        {data.streakWins >= 2 ? (
          <span className="shrink-0 rounded-full bg-orange-500/20 px-2 py-0.5 text-[10px] font-bold text-orange-200">
            {data.streakWins}연승
          </span>
        ) : null}
      </section>
    );
  }

  return (
    <section
      aria-label="최근 경기 요약"
      className={cn(
        "rounded-2xl border p-4",
        isDark
          ? "border-white/10 bg-white/5 shadow-inner shadow-black/20"
          : "border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900/80"
      )}
    >
      <p
        className={cn(
          "text-[10px] font-bold uppercase tracking-wider",
          isDark ? "text-slate-400" : "text-slate-500 dark:text-slate-400"
        )}
      >
        최근 경기 요약
      </p>
      {data.lastMatchContextLine?.trim() ? (
        <p
          className={cn(
            "mt-2 text-xs font-bold leading-snug",
            isDark ? "text-slate-300" : "text-slate-700 dark:text-slate-200"
          )}
        >
          {data.lastMatchContextLine.trim()}
        </p>
      ) : null}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <span
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-xl text-lg font-black shadow-inner",
            resultStyles[r]
          )}
        >
          {label}
        </span>
        <div>
          <p className={cn("text-xl font-black tabular-nums", isDark ? "text-white" : "text-slate-900 dark:text-white")}>
            {data.lastMatchScore}
          </p>
          <p className={cn("text-xs font-medium", isDark ? "text-slate-400" : "text-slate-600 dark:text-slate-400")}>
            {data.lastMatchLabel}
          </p>
        </div>
      </div>
      {(data.streakWins >= 2 || data.ovrMomentumLabel) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {data.streakWins >= 2 ? (
            <span className="inline-flex items-center rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 text-[11px] font-bold text-orange-900 dark:border-orange-900/60 dark:bg-orange-950/50 dark:text-orange-100">
              🔥 {data.streakWins}연승
            </span>
          ) : null}
          {data.ovrMomentumLabel ? (
            <span className="inline-flex max-w-full items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold leading-snug text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-100">
              📈 {data.ovrMomentumLabel}
            </span>
          ) : null}
        </div>
      )}
    </section>
  );
}
