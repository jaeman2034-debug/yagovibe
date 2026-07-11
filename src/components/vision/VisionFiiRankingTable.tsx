import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { buildPlayerGrowthProfilePath } from "@/lib/ai-growth/playerGrowthProfilePath";
import { VisionCardFrame } from "@/components/vision/VisionCardFrame";
import { useVisionCoachDashboard } from "@/components/vision/VisionCoachDashboardProvider";

type Props = {
  /** When set, player rows link to Player Intelligence Hub */
  teamId?: string;
  matchId?: string;
};

export function VisionFiiRankingTable({ teamId, matchId }: Props) {
  const { variant, loading, error, view, cardState } = useVisionCoachDashboard();
  const rows = view?.playerRanking ?? [];
  const empty = cardState === "ready" && rows.length === 0;

  const linkBase = teamId?.trim();

  return (
    <VisionCardFrame
      title="FII Ranking"
      testId="vision-fii-ranking-table"
      variant={variant}
      loading={loading}
      error={cardState === "error" ? error : null}
      empty={empty}
      emptyMessage="FII 순위 데이터가 없습니다."
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[240px] text-left text-xs">
          <thead>
            <tr
              className={cn(
                "border-b text-[10px] font-bold uppercase tracking-wide",
                variant === "dark" ? "border-violet-500/30 text-violet-300" : "border-violet-200 text-violet-700"
              )}
            >
              <th className="pb-2 pr-2">Rank</th>
              <th className="pb-2 pr-2">Player</th>
              <th className="pb-2 text-right">FII</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const profilePlayerId = row.playerId ?? row.trackId;
              const href =
                linkBase && profilePlayerId
                  ? `${buildPlayerGrowthProfilePath(linkBase, profilePlayerId)}${
                      matchId?.trim() ? `?matchId=${encodeURIComponent(matchId.trim())}` : ""
                    }${row.trackId ? `${matchId?.trim() ? "&" : "?"}trackId=${encodeURIComponent(row.trackId)}` : ""}`
                  : null;
              return (
              <tr
                key={`${row.rank}-${row.trackId ?? row.playerId ?? row.name}`}
                className={cn(
                  "border-b last:border-0",
                  variant === "dark" ? "border-violet-500/20 text-violet-50" : "border-violet-100 text-violet-950"
                )}
              >
                <td className="py-2 pr-2 font-black tabular-nums">{row.rank}</td>
                <td className="py-2 pr-2 font-semibold">
                  {href ? (
                    <Link
                      to={href}
                      className={cn(
                        "underline-offset-2 hover:underline",
                        variant === "dark" ? "text-violet-100" : "text-violet-900"
                      )}
                      data-testid={`vision-fii-player-link-${profilePlayerId}`}
                    >
                      {row.name}
                    </Link>
                  ) : (
                    row.name
                  )}
                </td>
                <td className="py-2 text-right font-black tabular-nums">{row.fii}</td>
              </tr>
            );
            })}
          </tbody>
        </table>
      </div>
    </VisionCardFrame>
  );
}
