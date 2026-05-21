/**
 * 🔥 TeamList - 팀 목록 컴포넌트 (STEP: 팀원 가입 플로우)
 *
 * TeamCard 리스트 표시
 * - 검색/지역 필터 없음 + 목록 비어 있음 → 안내 + 추천 팀 (허브와 동일 소스)
 * - 필터 적용 후 비어 있음 → “결과 없음” + 종목 허브로 이동
 */

import { useMemo, useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { TeamCard } from "./TeamCard";
import { FilterBar } from "./FilterBar";
import { usePublicTeams } from "@/hooks/usePublicTeams";
import { RecommendedTeamsSection } from "@/features/sports/team/RecommendedTeamsSection";
import {
  fetchRecommendedTeamsForSport,
  type RecommendedTeamRow,
} from "@/services/sportHubTeamDiscovery";
import {
  resolveTeamSearchFilterSportType,
  canonicalSportSlugFromFilterSportType,
} from "@/lib/team/teamSearchQuery";
import { Button } from "@/components/ui/button";

export function TeamList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const sportType = useMemo(() => resolveTeamSearchFilterSportType(searchParams), [searchParams]);
  const hubSportSlug = useMemo(() => canonicalSportSlugFromFilterSportType(sportType), [sportType]);

  const [region, setRegion] = useState("전체");
  const [keyword, setKeyword] = useState("");

  const { teams, loading } = usePublicTeams({
    enabled: true,
    sportType,
  });

  const filteredTeams = useMemo(() => {
    return teams.filter((team) => {
      const matchesRegion = region === "전체" || team.region === region;
      const matchesKeyword =
        !keyword.trim() || team.name.toLowerCase().includes(keyword.trim().toLowerCase());
      return matchesRegion && matchesKeyword;
    });
  }, [teams, region, keyword]);

  const hasActiveFilter = keyword.trim().length > 0 || region !== "전체";

  const showBrowseHint =
    !loading && filteredTeams.length === 0 && !hasActiveFilter;
  const showFilteredEmpty =
    !loading && filteredTeams.length === 0 && hasActiveFilter;

  const [recommended, setRecommended] = useState<RecommendedTeamRow[]>([]);
  const [recommendedLoading, setRecommendedLoading] = useState(false);

  useEffect(() => {
    if (!showBrowseHint) {
      setRecommended([]);
      setRecommendedLoading(false);
      return;
    }
    let cancelled = false;
    setRecommendedLoading(true);
    void fetchRecommendedTeamsForSport(hubSportSlug, { max: 10 })
      .then((rows) => {
        if (!cancelled) setRecommended(rows);
      })
      .catch(() => {
        if (!cancelled) setRecommended([]);
      })
      .finally(() => {
        if (!cancelled) setRecommendedLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [showBrowseHint, hubSportSlug]);

  const handleSportTypeChange = (newSportType: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("type", newSportType);
      return next;
    });
  };

  const goTeamHub = () => {
    navigate(`/sports/${encodeURIComponent(hubSportSlug)}?tab=team`);
  };

  return (
    <section className="w-full py-6">
      <FilterBar
        sportType={sportType}
        region={region}
        keyword={keyword}
        onSportTypeChange={handleSportTypeChange}
        onRegionChange={setRegion}
        onKeywordChange={setKeyword}
      />

      {loading ? (
        <div className="py-8 text-center">
          <p className="text-gray-500">로딩 중...</p>
        </div>
      ) : filteredTeams.length > 0 ? (
        <div className="space-y-4">
          {filteredTeams.map((team) => (
            <TeamCard key={team.id} team={team} />
          ))}
        </div>
      ) : showFilteredEmpty ? (
        <div className="rounded-xl border border-amber-100 bg-amber-50/80 px-4 py-10 text-center dark:border-amber-900/40 dark:bg-amber-950/20">
          <p className="text-base font-semibold text-gray-900 dark:text-gray-100">
            조건에 맞는 팀을 찾을 수 없습니다
          </p>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            검색어·지역을 바꿔 보거나, 종목 허브 팀 탭에서 추천 팀을 확인해 보세요.
          </p>
          <Button type="button" className="mt-6 bg-blue-600 hover:bg-blue-700" onClick={goTeamHub}>
            종목 허브 · 팀 탭으로 이동
          </Button>
        </div>
      ) : showBrowseHint ? (
        <div className="space-y-6">
          <div className="rounded-xl border border-blue-100 bg-blue-50/90 px-4 py-4 dark:border-blue-900/40 dark:bg-blue-950/25">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              팀 이름으로 검색해 보세요
            </p>
            <p className="mt-1 text-xs leading-relaxed text-gray-600 dark:text-gray-400">
              아직 목록에 없어도 아래 추천 팀에서 바로 둘러볼 수 있어요. 종목·지역은 위에서 바꿀 수 있습니다.
            </p>
          </div>
          <RecommendedTeamsSection
            sport={hubSportSlug}
            teams={recommended}
            loading={recommendedLoading}
          />
          {!recommendedLoading && recommended.length === 0 ? (
            <p className="text-center text-sm text-gray-500 dark:text-gray-400">
              추천할 팀이 아직 없습니다. 나중에 다시 확인하거나 팀을 만들어 보세요.
            </p>
          ) : null}
          <div className="flex justify-center pb-4">
            <Button type="button" variant="outline" onClick={goTeamHub}>
              종목 허브 팀 탭으로 돌아가기
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
