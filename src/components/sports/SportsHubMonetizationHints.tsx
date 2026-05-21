import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AppCard } from "@/components/ui/AppCard";
import { Button } from "@/components/ui/button";
import { useSportsHubUser } from "@/context/SportsHubUserContext";
import type { UserStage } from "@/lib/sportsHubRecommendation";
import {
  SPORTS_MONETIZATION,
  shouldSuggestRecruitBoost,
  shouldSuggestTeamPremium,
} from "@/lib/monetization/sportsMonetization";
import { normalizeSportId } from "@/constants/sports";
import { resolveLastSportId } from "@/utils/sportHubHref";

function sportSeg(profile: Record<string, unknown> | null | undefined): string {
  if (profile && typeof profile === "object") {
    const last = profile.lastSport;
    if (typeof last === "string" && last.trim()) {
      const n = normalizeSportId(last.trim());
      if (n) return n;
    }
  }
  return normalizeSportId(resolveLastSportId()) || "soccer";
}

/**
 * 수익화 3축(리그·프리미엄·부스트) 중 상황에 맞는 것만 짧게 제안 — PG 연동 전 UX 뼈대
 */
export function SportsHubMonetizationHints({ stage }: { stage: Exclude<UserStage, "NEW"> }) {
  const navigate = useNavigate();
  const { user, userState, profile, primaryTeamId, primaryTeamPlan } = useSportsHubUser();

  const enc = useMemo(() => encodeURIComponent(sportSeg(profile ?? undefined)), [profile]);

  const premium = useMemo(
    () =>
      shouldSuggestTeamPremium({
        hasTeam: userState.hasTeam,
        plan: primaryTeamPlan,
        teamMemberCount: userState.teamMemberCount,
      }),
    [userState.hasTeam, userState.teamMemberCount, primaryTeamPlan]
  );

  const boost = useMemo(
    () =>
      shouldSuggestRecruitBoost({
        hasTeam: userState.hasTeam,
        teamMemberCount: userState.teamMemberCount,
      }),
    [userState.hasTeam, userState.teamMemberCount]
  );

  const showLeague = userState.hasTeam;

  if (!user?.uid) return null;

  if (!premium && !boost && !showLeague) return null;

  return (
    <AppCard className="mb-6 border-emerald-100/90 bg-gradient-to-br from-emerald-50/80 to-white dark:border-emerald-900/35 dark:from-emerald-950/25 dark:to-gray-900">
      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-200">
        함께 쓰면 좋은 기능
      </p>
      <h3 className="mt-1 text-sm font-bold text-gray-900 dark:text-gray-50">필요할 때만, 다음 단계</h3>

      <ul className="mt-4 space-y-4">
        {premium && primaryTeamId ? (
          <li className="rounded-lg border border-white/60 bg-white/70 p-3 dark:border-gray-700/80 dark:bg-gray-900/50">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              팀원이 늘었어요. 더 편하게 운영해 보세요
            </p>
            <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
              무제한 멤버·통계·알림 등은 팀 플랜에서 열립니다. (결제 연동은 다음 단계에서 붙입니다.)
            </p>
            <Button
              type="button"
              size="sm"
              className="mt-2"
              variant="secondary"
              onClick={() => navigate(`/app/team/${encodeURIComponent(primaryTeamId)}`)}
            >
              팀 관리로 이동
            </Button>
          </li>
        ) : null}

        {boost ? (
          <li className="rounded-lg border border-white/60 bg-white/70 p-3 dark:border-gray-700/80 dark:bg-gray-900/50">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              팀원을 더 빨리 모으고 싶다면
            </p>
            <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
              먼저 모집 글을 올리고, 이후 상단 노출·부스트({SPORTS_MONETIZATION.recruitBoostKrw.toLocaleString("ko-KR")}
              원대)는 결제 연동 시점에 연결할 수 있어요.
            </p>
            <Button type="button" size="sm" className="mt-2" onClick={() => navigate(`/sports/${enc}/recruit/create`)}>
              팀원 모집 글 작성
            </Button>
          </li>
        ) : null}

        {showLeague ? (
          <li className="rounded-lg border border-white/60 bg-white/70 p-3 dark:border-gray-700/80 dark:bg-gray-900/50">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">리그·대회 참가</p>
            <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
              행사마다 참가비가 다를 수 있어요. 참가하기를 누른 뒤 결제하는 흐름이 가장 자연스럽습니다.
            </p>
            <Button type="button" size="sm" className="mt-2" variant="outline" onClick={() => navigate("/tournaments")}>
              대회·리그 둘러보기
            </Button>
          </li>
        ) : null}
      </ul>
    </AppCard>
  );
}
