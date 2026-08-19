import { Link, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { GrowthRecommendationSection } from "@/components/ai-growth/GrowthRecommendationSection";
import { GrowthBadgeChips } from "@/components/ai-growth/GrowthBadgeChips";
import { GrowthTimelineMiniChart } from "@/components/ai-growth/GrowthTimelineMiniChart";
import { growthLevelLabel } from "@/lib/ai-growth/growthAvatarLevel";
import { isRecentBadgeUnlock } from "@/lib/ai-growth/growthAvatarBadgeUnlock";
import { isRecentLevelUp } from "@/lib/ai-growth/growthAvatarLevelUp";
import {
  canShowGrowthTimelineChart,
  formatGrowthTimelineScoreChain,
} from "@/lib/ai-growth/growthTimelineDisplay";
import type { PlayerGrowthProfileEmptyReason } from "@/lib/ai-growth/playerGrowthProfileTypes";
import { usePlayerGrowthProfilePage } from "@/hooks/usePlayerGrowthProfilePage";
import { usePlayerProfilePageAccess } from "@/hooks/usePlayerProfilePageAccess";
import { PlayerIntelligenceSection } from "@/components/vision/player/PlayerIntelligenceSection";
import { ParentIntelligenceSection } from "@/components/vision/parent/ParentIntelligenceSection";
import { VisionPlatformNav } from "@/components/vision/VisionPlatformNav";
import { cn } from "@/lib/utils";

function emptyMessage(reason: PlayerGrowthProfileEmptyReason | null): string {
  switch (reason) {
    case "not_linked":
      return "연결된 자녀만 성장 프로필을 볼 수 있습니다.";
    case "no_avatar":
      return "아직 성장 기록이 없습니다. 코치가 훈련 리포트를 저장하면 표시됩니다.";
    case "missing_params":
      return "잘못된 프로필 주소입니다.";
    case "not_authenticated":
      return "로그인이 필요합니다.";
    case "load_error":
    default:
      return "프로필을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.";
  }
}

/** Sprint D-4.5 + Vision v6-5 — Player Growth Profile · Intelligence Hub */
export default function PlayerGrowthProfilePage() {
  const { teamId, playerId } = useParams<{ teamId: string; playerId: string }>();
  const [searchParams] = useSearchParams();
  const matchId = searchParams.get("matchId")?.trim() ?? "";
  const trackId = searchParams.get("trackId")?.trim() ?? "";

  const access = usePlayerProfilePageAccess(teamId, playerId);
  const { data, loading, emptyReason } = usePlayerGrowthProfilePage(teamId, playerId, {
    enabled: access.canViewParentGrowth,
  });

  if (access.loading) {
    return (
      <div
        className="flex min-h-[40vh] items-center justify-center gap-2 text-sm text-violet-800"
        data-testid="player-growth-profile-loading"
      >
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
        불러오는 중…
      </div>
    );
  }

  if (!access.canViewPage) {
    return (
      <div className="px-3 py-8 md:mx-auto md:max-w-lg" data-testid="player-growth-profile-empty">
        <Link
          to="/home/parent"
          className="inline-flex items-center gap-1 text-sm font-medium text-violet-700 underline"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          홈
        </Link>
        <p className="mt-6 text-sm leading-relaxed text-gray-700">
          이 선수 프로필에 접근할 수 없습니다.
        </p>
      </div>
    );
  }

  if (access.canViewParentGrowth && loading) {
    return (
      <div
        className="flex min-h-[40vh] items-center justify-center gap-2 text-sm text-violet-800"
        data-testid="player-growth-profile-loading"
      >
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
        성장 프로필 불러오는 중…
      </div>
    );
  }

  if (access.canViewParentGrowth && !data) {
    return (
      <div className="px-3 py-8 md:mx-auto md:max-w-lg" data-testid="player-growth-profile-empty">
        <Link
          to={access.backHref}
          className="inline-flex items-center gap-1 text-sm font-medium text-violet-700 underline"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          돌아가기
        </Link>
        <p className="mt-6 text-sm leading-relaxed text-gray-700">{emptyMessage(emptyReason)}</p>
      </div>
    );
  }

  const avatar = data?.avatar;
  const playerName = data?.playerName ?? "선수";
  const teamName = data?.teamName ?? "팀";
  const timeline = data?.timeline;
  const history = data?.history ?? [];
  const showTimeline = timeline ? canShowGrowthTimelineChart(timeline) : false;
  const trendChain =
    showTimeline && timeline
      ? formatGrowthTimelineScoreChain(timeline.points.map((p) => p.score))
      : null;
  const recentLevelUp = avatar ? isRecentLevelUp(avatar.lastLevelUpAt) : false;
  const recentBadges =
    avatar && isRecentBadgeUnlock(avatar.lastBadgeUnlockAt) && avatar.lastUnlockedBadges?.length
      ? avatar.lastUnlockedBadges
      : null;
  const sessionCount = avatar?.sessionCount ?? 0;
  const badgeCount = avatar?.badges.length ?? 0;

  return (
    <div
      className="w-full max-w-none px-3 py-6 md:mx-auto md:max-w-lg"
      data-testid="player-growth-profile-page"
    >
      <Link
        to={access.backHref}
        className="inline-flex items-center gap-1 text-sm font-medium text-violet-700 underline"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        {access.persona === "coach" ? "팀 관리" : "보호자 홈"}
      </Link>

      {data && avatar ? (
        <>
          <section
            className="mt-4 rounded-2xl border-2 border-violet-300 bg-gradient-to-br from-violet-50 via-white to-indigo-50 p-4 shadow-sm"
            data-testid="player-growth-profile-hero"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">{teamName}</p>
            <h1 className="mt-1 flex items-center gap-2 text-2xl font-black text-gray-900">
              <Sparkles className="h-5 w-5 text-violet-600" aria-hidden />
              {playerName}
            </h1>
            <div className="mt-3 flex flex-wrap items-end gap-3">
              <span
                className="rounded-full bg-violet-600 px-3 py-1 text-sm font-black text-white"
                data-testid="player-growth-profile-level"
              >
                🏅 {growthLevelLabel(avatar.level as 1 | 2 | 3 | 4 | 5)}
              </span>
              <p
                className="text-3xl font-black tabular-nums text-violet-950"
                data-testid="player-growth-profile-ovr"
              >
                OVR {avatar.ovr}
              </p>
            </div>
            <p className="mt-2 text-sm text-gray-600">
              🏅 배지 <strong>{badgeCount}</strong>개
              <span className="mx-2 text-gray-300">·</span>
              훈련 <strong className="tabular-nums">{sessionCount}</strong>회
            </p>
            {recentLevelUp ? (
              <p className="mt-2 text-xs font-bold text-amber-900">🎉 최근 레벨업</p>
            ) : null}
          </section>

          {access.canViewIntelligence && teamId && playerId && access.persona ? (
            <>
              {matchId ? (
                <VisionPlatformNav
                  className="mt-4"
                  teamId={teamId}
                  matchId={matchId}
                  playerId={playerId}
                  current="player-profile"
                  variant="light"
                  compact
                />
              ) : null}
              {access.persona === "parent" ? (
              <ParentIntelligenceSection
                className="mt-4"
                teamId={teamId}
                playerId={playerId}
                playerName={playerName}
                matchId={matchId || null}
                trackId={trackId || undefined}
              />
            ) : (
              <PlayerIntelligenceSection
                className="mt-4"
                teamId={teamId}
                playerId={playerId}
                playerName={playerName}
                matchId={matchId || null}
                trackId={trackId || undefined}
                persona={access.persona}
              />
            )}
            </>
          ) : null}

          {showTimeline && timeline ? (
            <section className="mt-4" data-testid="player-growth-profile-timeline">
              {trendChain ? (
                <p className="mb-2 text-sm font-bold tabular-nums text-violet-950">{trendChain}</p>
              ) : null}
              <GrowthTimelineMiniChart timeline={timeline} variant="parent" />
            </section>
          ) : null}

          {recentBadges ? (
            <section
              className="mt-4 rounded-xl border-2 border-amber-300 bg-amber-50/90 px-3 py-2.5"
              data-testid="player-growth-profile-new-badges"
            >
              <p className="text-xs font-bold text-amber-950">🎉 최근 획득 배지</p>
              <GrowthBadgeChips className="mt-1.5" badgeIds={recentBadges} size="sm" />
            </section>
          ) : null}

          {badgeCount > 0 ? (
            <section className="mt-4" data-testid="player-growth-profile-badges">
              <p className="text-sm font-bold text-violet-950">🥇 보유 배지</p>
              <GrowthBadgeChips className="mt-2" badgeIds={avatar.badges} size="md" />
            </section>
          ) : null}

          <GrowthRecommendationSection
            className="mt-4"
            avatar={avatar}
            maxItems={6}
            variant="profile"
          />

          {history.length > 0 ? (
            <section className="mt-4" data-testid="player-growth-profile-history">
              <p className="text-sm font-bold text-gray-900">성장 이력</p>
              <ul className="mt-2 divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
                {history.map((item) => (
                  <li
                    key={item.sessionId}
                    className="flex items-center justify-between px-3 py-2.5 text-sm"
                    data-testid={`profile-history-${item.sessionId}`}
                  >
                    <span className="text-gray-600 tabular-nums">{item.sessionDate}</span>
                    <span className="font-bold tabular-nums text-violet-950">OVR {item.ovr}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <dl className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
            {(
              [
                ["시야", avatar.vision],
                ["압박 대응", avatar.pressure],
                ["회복", avatar.recovery],
              ] as const
            ).map(([label, value]) => (
              <div
                key={label}
                className={cn("rounded-lg border border-violet-100 bg-white/80 px-2 py-2")}
              >
                <dt className="font-medium text-violet-700">{label}</dt>
                <dd className="text-base font-bold tabular-nums text-gray-900">{value}</dd>
              </div>
            ))}
          </dl>
        </>
      ) : (
        <>
          <section className="mt-4 rounded-2xl border border-violet-200 bg-violet-50/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">{teamName}</p>
            <h1 className="mt-1 text-xl font-black text-gray-900">{playerName}</h1>
            <p className="mt-2 text-xs text-violet-800">
              코치 Intelligence 뷰 — 성장 프로필(Parent)은 연결된 보호자만 볼 수 있습니다.
            </p>
          </section>
          {access.canViewIntelligence && teamId && playerId && access.persona ? (
            <PlayerIntelligenceSection
              className="mt-4"
              teamId={teamId}
              playerId={playerId}
              playerName={playerName}
              matchId={matchId || null}
              trackId={trackId || undefined}
              persona={access.persona}
            />
          ) : null}
        </>
      )}
    </div>
  );
}
