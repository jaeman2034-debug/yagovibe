/**
 * J3-4 — Coach Dashboard Team Avatar Ranking
 */
import { Loader2, Medal } from "lucide-react";
import type { TeamAvatarRankingView } from "@/lib/ai-growth/teamAvatarRankingView";
import { cn } from "@/lib/utils";

type Props = {
  ranking: TeamAvatarRankingView | null;
  loading?: boolean;
  className?: string;
};

export function TeamAvatarRankingCoachCard({ ranking, loading = false, className }: Props) {
  if (loading) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-2xl border border-sky-200 bg-sky-50/80 px-4 py-3 text-sm text-sky-900",
          className
        )}
        data-testid="j3-team-ranking-coach-loading"
      >
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        팀 랭킹 집계 중…
      </div>
    );
  }

  if (!ranking || ranking.rankedCount === 0) return null;

  return (
    <section
      className={cn(
        "rounded-2xl border-2 border-sky-300 bg-gradient-to-br from-sky-50 via-white to-indigo-50/70 p-4 shadow-sm",
        className
      )}
      data-testid="j3-team-ranking-panel"
      aria-label="팀 Avatar 랭킹"
    >
      <h3 className="flex items-center gap-1.5 text-sm font-black text-sky-950">
        <Medal className="h-4 w-4 text-sky-600" aria-hidden />
        Top 3 Avatar Ranking
        <span className="text-[10px] font-semibold text-sky-700">
          {ranking.teamLabel} · {ranking.rankedCount}명
        </span>
      </h3>

      <ul className="mt-3 space-y-1.5" data-testid="j3-team-ranking-top">
        {ranking.topThree.map((row) => (
          <li
            key={row.playerId}
            className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] items-center gap-2 rounded-lg border border-sky-100 bg-white/95 px-2.5 py-2 text-xs"
            data-testid={`j3-team-ranking-row-${row.playerId}`}
          >
            <span className="font-black tabular-nums text-sky-800">{row.rank}</span>
            <span className="truncate font-bold text-sky-950">{row.playerName}</span>
            <span className="tabular-nums font-bold text-sky-900">OVR {row.ovr}</span>
            <span className="tabular-nums text-sky-800">Lv {row.level}</span>
            <span className="tabular-nums text-sky-700">🏅{row.badgeCount}</span>
            <span className="tabular-nums text-sky-600">{row.delta30dLabel}</span>
          </li>
        ))}
      </ul>

      {ranking.rows.length > ranking.topThree.length ? (
        <div className="mt-3" data-testid="j3-team-ranking-list">
          <p className="text-[10px] font-semibold text-sky-700">전체 순위</p>
          <ul className="mt-1.5 max-h-48 space-y-1 overflow-y-auto">
            {ranking.rows.map((row) => (
              <li
                key={row.playerId}
                className="flex items-center gap-2 rounded-md border border-sky-50 bg-white/80 px-2 py-1.5 text-[11px]"
                data-testid={`j3-team-ranking-row-${row.playerId}`}
              >
                <span className="w-4 font-black tabular-nums text-sky-700">{row.rank}</span>
                <span className="min-w-0 flex-1 truncate font-semibold text-sky-950">
                  {row.playerName}
                </span>
                <span className="tabular-nums text-sky-800">OVR {row.ovr}</span>
                <span className="tabular-nums text-sky-600">{row.delta30dLabel}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
