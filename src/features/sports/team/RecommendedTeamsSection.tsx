import type { RecommendedTeamRow } from "@/services/sportHubTeamDiscovery";
import { RecommendedTeamCard } from "./RecommendedTeamCard";

export function RecommendedTeamsSection({
  sport,
  teams,
  loading,
}: {
  sport: string;
  teams: RecommendedTeamRow[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <section className="mb-6" aria-busy="true">
        <h2 className="mb-3 text-base font-bold text-gray-900 dark:text-white">추천 팀</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-52 animate-pulse rounded-2xl bg-gradient-to-br from-gray-200 to-gray-100 dark:from-gray-700 dark:to-gray-800"
            />
          ))}
        </div>
      </section>
    );
  }

  if (teams.length === 0) return null;

  return (
    <section className="mb-6">
      <h2 className="mb-1 text-base font-bold text-gray-900 dark:text-white">추천 팀</h2>
      <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
        멤버·경기 활동을 반영해 골랐어요. 카드에서 팀 페이지로 들어가 플레이까지 이어질 수 있어요.
      </p>
      <div className="grid grid-cols-1 gap-4 overflow-visible py-1 sm:grid-cols-2 sm:gap-5">
        {teams.map((t, i) => (
          <RecommendedTeamCard key={t.id} team={t} sport={sport} featured={i === 0} />
        ))}
      </div>
    </section>
  );
}
