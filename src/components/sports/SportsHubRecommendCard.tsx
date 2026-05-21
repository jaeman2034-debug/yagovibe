import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AppCard } from "@/components/ui/AppCard";
import { useAuth } from "@/context/AuthProvider";
import { useSportsHubUser } from "@/context/SportsHubUserContext";
import {
  getRecommendation,
  persistHubRecommendationNav,
  type SportsHubRecommendation,
} from "@/lib/sportsHubRecommendation";
import { resolveLastSportId } from "@/utils/sportHubHref";
import { normalizeSportId } from "@/constants/sports";

const FALLBACK_SPORT = "soccer";

/**
 * 팀 생성·경기 생성 링크용 종목: 프로필 → localStorage lastSport → soccer
 */
function resolveRecommendSport(profile: Record<string, unknown> | null | undefined): string {
  if (profile && typeof profile === "object") {
    const last = profile.lastSport;
    if (typeof last === "string" && last.trim()) {
      const n = normalizeSportId(last.trim());
      if (n) return n;
    }
    const pref = profile.preferredSports;
    if (Array.isArray(pref) && pref.length > 0 && typeof pref[0] === "string" && pref[0].trim()) {
      const n = normalizeSportId(pref[0].trim());
      if (n) return n;
    }
  }
  const fromStorage = resolveLastSportId();
  return fromStorage || FALLBACK_SPORT;
}

function handleRecommendationClick(
  navigate: ReturnType<typeof useNavigate>,
  recommendation: SportsHubRecommendation
) {
  persistHubRecommendationNav(recommendation);

  if (recommendation.auto?.openModal === "team-create-guide") {
    try {
      sessionStorage.setItem("yago:hubTeamCreateGuide", "1");
    } catch {
      /* ignore */
    }
  }

  navigate(recommendation.action, {
    state: { hubRecommendation: recommendation },
  });
}

/**
 * `/sports` 허브 상단 — 행동·상황 기반 단일 추천 + CTA (다음 화면 자동화 힌트 동봉)
 */
export default function SportsHubRecommendCard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile, profileReady, loading, userState } = useSportsHubUser();

  const displayName = useMemo(() => {
    const n = user?.displayName?.trim();
    if (n) return n;
    const e = user?.email?.split("@")[0]?.trim();
    if (e) return e;
    return "회원";
  }, [user?.displayName, user?.email]);

  const sportSeg = useMemo(() => resolveRecommendSport(profile ?? undefined), [profile]);

  const recommendation = useMemo(
    () => getRecommendation(userState, sportSeg),
    [userState, sportSeg]
  );

  const showLoading = loading || !profileReady;

  return (
    <AppCard className="mb-6 space-y-2 p-4" aria-label="맞춤 추천">
      <p className="text-sm text-gray-500 dark:text-gray-400">안녕하세요, {displayName}님</p>

      <h3 className="text-lg font-semibold tracking-tight text-gray-900 dark:text-gray-100">
        오늘 추천
      </h3>

      {showLoading ? (
        <>
          <p className="text-sm text-gray-600 dark:text-gray-400">맞춤 추천을 준비하고 있어요.</p>
          <button
            type="button"
            disabled
            className="mt-2 w-full rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white opacity-50 sm:w-auto"
          >
            불러오는 중…
          </button>
        </>
      ) : (
        <>
          <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
            {recommendation.reason}
          </p>
          <button
            type="button"
            onClick={() => handleRecommendationClick(navigate, recommendation)}
            className="mt-2 w-full rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200 sm:w-auto"
          >
            {recommendation.cta}
          </button>
        </>
      )}
    </AppCard>
  );
}
