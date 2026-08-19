/**
 * TeamList — 팀 탐색 (검색 우선)
 * 1) FilterBar (키워드·종목·지역)
 * 2) 협회 연결 추천팀
 * 3) 전체 활동팀
 */

import { useMemo, useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { TeamCard } from "./TeamCard";
import { FilterBar } from "./FilterBar";
import { usePublicTeams } from "@/hooks/usePublicTeams";
import { RecommendedTeamCard } from "@/features/sports/team/RecommendedTeamCard";
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

  const [recommended, setRecommended] = useState<RecommendedTeamRow[]>([]);
  const [recommendedLoading, setRecommendedLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setRecommendedLoading(true);
    void fetchRecommendedTeamsForSport(hubSportSlug, { max: 16 })
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
  }, [hubSportSlug]);

  const federationTeams = useMemo(
    () => recommended.filter((t) => t.source === "federation"),
    [recommended]
  );

  const federationIds = useMemo(() => new Set(federationTeams.map((t) => t.id)), [federationTeams]);

  const kw = keyword.trim().toLowerCase();

  const filteredFederation = useMemo(() => {
    return federationTeams.filter((team) => {
      const matchesRegion = region === "전체" || team.region === region;
      const matchesKeyword = !kw || team.name.toLowerCase().includes(kw);
      return matchesRegion && matchesKeyword;
    });
  }, [federationTeams, region, kw]);

  const filteredTeams = useMemo(() => {
    return teams.filter((team) => {
      if (federationIds.has(team.id)) return false;
      const matchesRegion = region === "전체" || team.region === region;
      const matchesKeyword = !kw || team.name.toLowerCase().includes(kw);
      return matchesRegion && matchesKeyword;
    });
  }, [teams, region, kw, federationIds]);

  const hasActiveFilter = kw.length > 0 || region !== "전체";
  const showFilteredEmpty =
    !loading &&
    !recommendedLoading &&
    filteredTeams.length === 0 &&
    filteredFederation.length === 0 &&
    hasActiveFilter;

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

  const fedTitle =
    federationTeams[0]?.federationName?.trim() ||
    (hubSportSlug === "soccer" ? "노원구 축구협회" : "협회");

  return (
    <section className="w-full py-4">
      {/* 1순위: 검색 */}
      <FilterBar
        sportType={sportType}
        region={region}
        keyword={keyword}
        onSportTypeChange={handleSportTypeChange}
        onRegionChange={setRegion}
        onKeywordChange={setKeyword}
      />

      {showFilteredEmpty ? (
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
      ) : (
        <div className="space-y-6 px-4">
          {/* 2순위: 협회 연결 추천팀 */}
          {(recommendedLoading || filteredFederation.length > 0) && (
            <div>
              <h2 className="mb-1 text-base font-bold text-gray-900 dark:text-white">
                🔥 {fedTitle} 추천팀
              </h2>
              <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
                협회 CMS에서 홈페이지가 연결된 팀이에요. 카드를 눌러 팀 홈으로 이동할 수 있습니다.
              </p>
              {recommendedLoading ? (
                <div className="flex flex-col gap-2">
                  {[0, 1].map((i) => (
                    <div
                      key={i}
                      className="h-[110px] animate-pulse rounded-xl bg-gradient-to-r from-gray-200 to-gray-100 dark:from-gray-700 dark:to-gray-800"
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {filteredFederation.map((t, i) => (
                    <RecommendedTeamCard
                      key={t.id}
                      team={t}
                      sport={hubSportSlug}
                      featured={i === 0}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 3순위: 전체 활동팀 */}
          <div>
            <h2 className="mb-1 text-base font-bold text-gray-900 dark:text-white">전체 활동팀</h2>
            <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
              공개된 활동 팀 목록입니다. 검색·지역으로 좁혀 보세요.
            </p>
            {loading ? (
              <p className="py-6 text-center text-sm text-gray-500">로딩 중...</p>
            ) : filteredTeams.length > 0 ? (
              <div className="space-y-3">
                {filteredTeams.map((team) => (
                  <TeamCard key={team.id} team={team} />
                ))}
              </div>
            ) : (
              <p className="rounded-lg border border-dashed border-gray-200 px-3 py-6 text-center text-sm text-gray-500 dark:border-gray-700">
                {hasActiveFilter
                  ? "이 조건의 추가 활동 팀이 없습니다."
                  : "아직 등록된 활동 팀이 없습니다. 위 협회 추천팀을 먼저 둘러보세요."}
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
