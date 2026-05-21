import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AppCard } from "@/components/ui/AppCard";
import { Button } from "@/components/ui/button";
import { useSportsHubUser } from "@/context/SportsHubUserContext";
import { useMatches } from "@/hooks/useMatches";
import { scoreOpenMatchFit } from "@/lib/matching/matchFitScore";
import { resolveLastSportId } from "@/utils/sportHubHref";
import { isSportTypeSlug } from "@/types/sport";
import { toDate } from "@/utils/timeUtils";
import type { Match } from "@/types/match";

function formatWhen(m: Match): string {
  try {
    const d = toDate(m.date);
    return d.toLocaleString("ko-KR", {
      month: "short",
      day: "numeric",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

/**
 * 12단계 1차: 규칙 기반 “비슷한 수준 + 지역 + 일정” 오픈 매칭 추천 (LLM 없음).
 */
export function SportsHubAiMatchSuggestions() {
  const navigate = useNavigate();
  const { user, profile, userState, primaryTeamId, primaryTeamRegion } = useSportsHubUser();
  const raw = resolveLastSportId();
  const sport = isSportTypeSlug(raw) ? raw : undefined;

  const homeLat =
    profile && typeof profile === "object" && typeof (profile as { homeLat?: unknown }).homeLat === "number"
      ? ((profile as { homeLat: number }).homeLat as number)
      : null;
  const homeLng =
    profile && typeof profile === "object" && typeof (profile as { homeLng?: unknown }).homeLng === "number"
      ? ((profile as { homeLng: number }).homeLng as number)
      : null;

  const { matches, loading, error } = useMatches({
    status: "open",
    sport,
    limit: 48,
  });

  const ranked = useMemo(() => {
    if (!primaryTeamId || !user?.uid) return [];
    const hint =
      profile && typeof profile === "object" && typeof (profile as { matchSkillHint?: unknown }).matchSkillHint === "number"
        ? (profile as { matchSkillHint: number }).matchSkillHint
        : null;

    return [...matches]
      .map((m) => {
        const fit = scoreOpenMatchFit({
          match: m,
          myTeamId: primaryTeamId,
          myRegion: primaryTeamRegion,
          userLat: homeLat,
          userLng: homeLng,
          mySkillHint: hint,
        });
        return { m, fit };
      })
      .filter((x) => x.fit.total > -1e8)
      .sort((a, b) => b.fit.total - a.fit.total)
      .slice(0, 3);
  }, [matches, primaryTeamId, user?.uid, primaryTeamRegion, homeLat, homeLng, profile]);

  if (!user?.uid || !userState.hasTeam || !primaryTeamId) return null;

  if (loading) {
    return (
      <AppCard className="mb-6">
        <p className="text-sm text-gray-500">추천 매칭을 불러오는 중…</p>
      </AppCard>
    );
  }

  if (error || ranked.length === 0) return null;

  return (
    <AppCard className="mb-6 border-violet-200/70 bg-gradient-to-br from-violet-50/90 to-white dark:border-violet-900/40 dark:from-violet-950/25 dark:to-gray-900">
      <p className="text-xs font-semibold uppercase tracking-wide text-violet-800 dark:text-violet-200">
        규칙 기반 매칭 추천
      </p>
      <h3 className="mt-1 text-sm font-bold text-gray-900 dark:text-gray-50">지금 참여해 보기 좋은 오픈 매칭</h3>
      <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
        실력(매칭 글 수준)·지역·일정·구장 거리를 합쳐 점수화했습니다. Elo 연동은 경기 결과 적층 후 확장하면 됩니다.
      </p>

      <ul className="mt-4 space-y-3">
        {ranked.map(({ m, fit }) => (
          <li
            key={m.id}
            className="rounded-xl border border-violet-100/80 bg-white/80 p-3 dark:border-violet-900/30 dark:bg-gray-900/50"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">{m.teamName}</p>
                <p className="text-xs text-gray-500">
                  {m.region}
                  {m.stadium ? ` · ${m.stadium}` : ""} · {formatWhen(m)} · {m.level}
                </p>
              </div>
              <Button type="button" size="sm" onClick={() => navigate(`/match/${encodeURIComponent(m.id)}`)}>
                자세히
              </Button>
            </div>
            {fit.lines.length > 0 ? (
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {fit.lines.map((line) => (
                  <li
                    key={line}
                    className="rounded-full bg-violet-100/90 px-2 py-0.5 text-[11px] font-medium text-violet-900 dark:bg-violet-900/40 dark:text-violet-100"
                  >
                    {line}
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ul>
    </AppCard>
  );
}
