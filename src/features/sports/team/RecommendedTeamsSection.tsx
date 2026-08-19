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
      <section className="mb-5" aria-busy="true">
        <h2 className="mb-2 text-base font-bold text-gray-900 dark:text-white">추천 팀</h2>
        <div className="flex flex-col gap-2">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-[110px] animate-pulse rounded-xl bg-gradient-to-r from-gray-200 to-gray-100 dark:from-gray-700 dark:to-gray-800"
            />
          ))}
        </div>
      </section>
    );
  }

  if (teams.length === 0) return null;

  const fedCount = teams.filter((t) => t.source === "federation").length;

  return (
    <section className="mb-5">
      <h2 className="mb-0.5 text-base font-bold text-gray-900 dark:text-white">
        {fedCount > 0 ? "협회 연결 · 추천 팀" : "추천 팀"}
      </h2>
      <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
        {fedCount > 0
          ? `협회 CMS에서 홈페이지 연결한 팀 ${fedCount}개가 포함되어 있어요. 카드에서 팀으로 이동할 수 있습니다.`
          : "멤버·경기 활동을 반영해 골랐어요. 카드에서 팀 페이지로 들어가 플레이까지 이어질 수 있어요."}
      </p>
      {/* 리스트형 — 한 열로 밀도 확보 (4~5장/화면) */}
      <div className="flex flex-col gap-2">
        {teams.map((t, i) => (
          <RecommendedTeamCard key={t.id} team={t} sport={sport} featured={i === 0} />
        ))}
      </div>
    </section>
  );
}
