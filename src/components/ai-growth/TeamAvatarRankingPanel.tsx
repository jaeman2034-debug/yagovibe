/**
 * J3-4 — Parent Home Team Avatar Ranking
 */
import { Medal } from "lucide-react";
import type { TeamAvatarRankingView } from "@/lib/ai-growth/teamAvatarRankingView";
import { cn } from "@/lib/utils";

type Props = {
  ranking: TeamAvatarRankingView;
  className?: string;
};

function RankRow({
  row,
  testId,
}: {
  row: TeamAvatarRankingView["topThree"][number];
  testId?: string;
}) {
  return (
    <li
      className={cn(
        "flex items-center gap-2 rounded-lg border px-2.5 py-2 text-xs",
        row.isFocusPlayer
          ? "border-sky-300 bg-sky-50/90"
          : "border-sky-100 bg-white/90"
      )}
      data-testid={testId}
    >
      <span className="w-5 text-center font-black tabular-nums text-sky-800">{row.rank}</span>
      <span className="min-w-0 flex-1 truncate font-bold text-sky-950">{row.playerName}</span>
      <span className="font-black tabular-nums text-sky-900">OVR {row.ovr}</span>
      <span className="tabular-nums text-sky-700">{row.delta30dLabel}</span>
      <span className="tabular-nums text-sky-600" aria-label="배지 수">
        🏅{row.badgeCount}
      </span>
    </li>
  );
}

export function TeamAvatarRankingPanel({ ranking, className }: Props) {
  if (ranking.rankedCount === 0) return null;

  return (
    <section
      className={cn(
        "mt-3 rounded-xl border border-sky-200 bg-gradient-to-br from-sky-50/90 via-white to-indigo-50/50 px-3 py-3",
        className
      )}
      data-testid="j3-team-ranking-panel"
      aria-label="팀 Avatar 순위"
    >
      <h3 className="flex items-center gap-1.5 text-sm font-black text-sky-950">
        <Medal className="h-4 w-4 text-sky-600" aria-hidden />
        팀 Avatar 순위
        <span className="text-[10px] font-semibold text-sky-700">{ranking.teamLabel}</span>
      </h3>

      <ul className="mt-3 space-y-1.5" data-testid="j3-team-ranking-top">
        {ranking.topThree.map((row) => (
          <RankRow
            key={row.playerId}
            row={row}
            testId={`j3-team-ranking-row-${row.playerId}`}
          />
        ))}
      </ul>

      {ranking.focusPlayer ? (
        <p
          className="mt-3 text-sm font-bold text-sky-950"
          data-testid="j3-team-ranking-focus"
        >
          {ranking.focusPlayer.playerName}
          <span className="ml-1 text-xs font-semibold text-sky-700">
            · {ranking.focusRankLabel}
          </span>
        </p>
      ) : null}
    </section>
  );
}
