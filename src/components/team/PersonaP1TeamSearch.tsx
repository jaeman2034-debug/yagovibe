/**
 * P1 전용 팀 탐색 섹션
 * - 탐색(검색·추천·목록) 우선
 * - 생성은 FAB(+)만 (이 화면에서 팀 만들기 버튼 없음)
 */

import { useNavigate, useSearchParams } from "react-router-dom";
import { TeamList } from "./TeamList";
import { resolveTeamSearchFilterSportType } from "@/lib/team/teamSearchQuery";
import { Button } from "@/components/ui/button";

export function PersonaP1TeamSearch() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const filterSportType = resolveTeamSearchFilterSportType(searchParams);

  const showAssociationCard =
    filterSportType === "football" || filterSportType === "futsal";

  return (
    <div className="space-y-4">
      {/* 1~3순위: 검색 → 협회 추천팀 → 전체 활동팀 */}
      <TeamList />

      {/* 4순위: 협회 소개 (관심 있을 때만) */}
      {showAssociationCard ? (
        <div className="px-4 pb-8">
          <div className="rounded-xl border border-slate-200 bg-slate-50/90 p-4 dark:border-slate-700 dark:bg-slate-900/50">
            <p className="text-sm font-bold text-gray-900 dark:text-gray-100">노원구 축구협회</p>
            <p className="mt-1 text-xs leading-relaxed text-gray-600 dark:text-gray-400">
              공식 홈페이지 · 대회 · 구장 · 공지 — 협회에 등록된 팀과 일정을 확인할 수 있어요.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => navigate("/federations/nowon-football")}
            >
              협회 보기
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
