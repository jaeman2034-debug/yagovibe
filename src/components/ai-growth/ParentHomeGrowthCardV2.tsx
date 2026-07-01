import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { GoalSystemPanel } from "@/components/ai-growth/GoalSystemPanel";
import { CollectionPanel } from "@/components/ai-growth/CollectionPanel";
import { MissionSystemPanel } from "@/components/ai-growth/MissionSystemPanel";
import { AvatarXpSystemPanel } from "@/components/ai-growth/AvatarXpSystemPanel";
import { SeasonPassPanel } from "@/components/ai-growth/SeasonPassPanel";
import { TeamAvatarRankingPanel } from "@/components/ai-growth/TeamAvatarRankingPanel";
import { AvatarMatchSimulationPanel } from "@/components/ai-growth/AvatarMatchSimulationPanel";
import { TeamVsTeamPanel } from "@/components/ai-growth/TeamVsTeamPanel";
import { AcademyLeaguePanel } from "@/components/ai-growth/AcademyLeaguePanel";
import { TransferMarketPanel } from "@/components/ai-growth/TransferMarketPanel";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { GrowthBadgeChips } from "@/components/ai-growth/GrowthBadgeChips";
import { isRecentBadgeUnlock } from "@/lib/ai-growth/growthAvatarBadgeUnlock";
import { isRecentLevelUp } from "@/lib/ai-growth/growthAvatarLevelUp";
import {
  hasSeenLevelUpCelebration,
  markLevelUpCelebrationSeen,
} from "@/lib/ai-growth/levelUpCelebrationDismiss";
import {
  buildRecentLevelUpFromAvatar,
  computeLevelUpDelta,
  recentLevelUpBadgeLabels,
} from "@/lib/ai-growth/levelUpCelebrationView";
import { LevelUpCelebrationModal } from "@/components/ai-growth/LevelUpCelebrationModal";
import { ParentRecentLevelUpHeroBadge } from "@/components/ai-growth/ParentRecentLevelUpHeroBadge";
import {
  formatParentDeltaBadge,
  PARENT_GROWTH_COMPARISON_FOOTNOTE,
  PARENT_GROWTH_DECLINE_SUPPORT,
  PARENT_GROWTH_FIRST_RECORD_BODY,
  PARENT_GROWTH_FIRST_RECORD_TITLE,
} from "@/lib/ai-growth/parentGrowthCopy";
import type {
  ParentHomeGrowthCardV2Data,
  ParentHomeGrowthCardV2EmptyReason,
} from "@/lib/ai-growth/parentHomeGrowthCardV2Types";
import { useParentHomeGrowthCardV2 } from "@/hooks/useParentHomeGrowthCardV2";
import { buildParentChildGrowthProfilePath } from "@/lib/ai-growth/playerGrowthProfilePath";
import { buildGrowthReportSharePath } from "@/lib/ai-growth/growthReportDelivery";
import { GlossaryQuickBar } from "@/components/glossary/GlossaryQuickBar";
import { ParentAvatarSurfacePanel } from "@/components/ai-growth/ParentAvatarSurfacePanel";
import { ParentHeroSummaryPanel } from "@/components/ai-growth/ParentHeroSummaryPanel";
import { ParentMonthlyGrowthPdfPanel } from "@/components/ai-growth/ParentMonthlyGrowthPdfPanel";
import { ParentWeeklyGrowthDigestPanel } from "@/components/ai-growth/ParentWeeklyGrowthDigestPanel";
import { ParentGrowthNarrativePanel } from "@/components/ai-growth/ParentGrowthNarrativePanel";
import { ParentGrowthTimelinePanel } from "@/components/ai-growth/ParentGrowthTimelinePanel";
import { SeasonJourneyPanel } from "@/components/ai-growth/SeasonJourneyPanel";

function formatSessionDateLabel(ms: number): string {
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function emptyMessage(reason: ParentHomeGrowthCardV2EmptyReason | null): string {
  switch (reason) {
    case "no_linked_child":
      return "연결된 자녀가 없습니다. 자녀 계정을 연결하면 성장 카드가 표시됩니다.";
    case "no_avatar":
      return "코치가 훈련 리포트를 저장하면 아바타 성장이 여기에 표시됩니다.";
    case "load_error":
      return "성장 카드를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.";
    case "no_parent_membership":
    default:
      return "보호자로 등록된 팀이 없습니다.";
  }
}

function formatWeeklyDeltaLine(
  previous: number | null,
  current: number | null,
  delta: number | null
): string | null {
  if (current === null) return null;
  if (previous === null || delta === null) return `${current}점`;
  if (delta > 0) return `${previous} → ${current} (+${delta})`;
  if (delta < 0) return `${previous} → ${current} (${delta})`;
  return `${previous} → ${current}`;
}

type GrowthSummarySectionProps = {
  data: ParentHomeGrowthCardV2Data;
  reportHref: string;
};

function GrowthSummarySection({ data, reportHref }: GrowthSummarySectionProps) {
  const { growthSummary, playerName } = data;

  if (growthSummary.mode === "none") return null;

  if (growthSummary.mode === "first_record") {
    return (
      <div
        className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50/70 px-3 py-2.5"
        data-testid="parent-home-growth-first-record"
      >
        <p className="text-xs font-bold text-emerald-950">최근 성장</p>
        <p className="mt-1 text-2xl font-black tabular-nums text-emerald-950">
          {growthSummary.currentOverall}
          <span className="text-sm font-bold">점</span>
        </p>
        <p className="mt-1 text-[11px] text-emerald-800">
          {PARENT_GROWTH_FIRST_RECORD_TITLE} — {formatSessionDateLabel(growthSummary.latestSessionAt)}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-emerald-900">{PARENT_GROWTH_FIRST_RECORD_BODY}</p>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="mt-2 h-8 border-emerald-300 text-xs"
          asChild
        >
          <Link to={reportHref}>성장 리포트 보기</Link>
        </Button>
      </div>
    );
  }

  const { summary, latestSessionAt } = growthSummary;
  const deltaBadge = formatParentDeltaBadge(summary.delta.delta ?? 0);

  return (
    <div
      className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50/70 px-3 py-2.5"
      data-testid="parent-home-growth-summary"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-bold text-emerald-950">최근 성장</p>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="h-7 border-emerald-300 px-2 text-[11px]"
          asChild
        >
          <Link to={reportHref}>리포트</Link>
        </Button>
      </div>
      <p className="mt-1 text-xl font-black tabular-nums text-emerald-950">
        {summary.previousOverall}
        <span className="text-sm font-bold text-emerald-700">점</span>
        <span className="mx-1.5 text-emerald-500" aria-hidden>
          →
        </span>
        {summary.currentOverall}
        <span className="text-sm font-bold text-emerald-700">점</span>
      </p>
      <p className="mt-1">
        <span
          className={cn(
            "inline-block rounded-full px-2.5 py-0.5 text-xs font-black tabular-nums",
            deltaBadge.tone === "up" && "bg-emerald-600 text-white",
            deltaBadge.tone === "flat" && "bg-gray-100 text-gray-800",
            deltaBadge.tone === "down" && "bg-slate-100 text-slate-800"
          )}
          data-testid="parent-home-growth-delta"
        >
          {deltaBadge.label}
        </span>
      </p>
      {deltaBadge.tone === "down" ? (
        <p className="mt-1 text-[11px] text-emerald-900">{PARENT_GROWTH_DECLINE_SUPPORT}</p>
      ) : null}
      <p className="mt-1 text-[10px] text-emerald-800">
        {playerName} · 최근 훈련 {formatSessionDateLabel(latestSessionAt)}
      </p>
      <p className="text-[10px] text-emerald-700">{PARENT_GROWTH_COMPARISON_FOOTNOTE}</p>
    </div>
  );
}

type ParentHomeGrowthCardV2BodyProps = {
  data: ParentHomeGrowthCardV2Data;
  className?: string;
};

function ParentHomeGrowthCardV2Body({ data, className }: ParentHomeGrowthCardV2BodyProps) {
  const { avatar, playerName, teamName, timeline, deliveredReport } = data;
  const delta = avatar.weeklyDeltaOvr ?? 0;
  const deltaLabel = delta > 0 ? `+${delta}` : delta < 0 ? String(delta) : "+0";
  const sessionCount = avatar.sessionCount ?? 0;
  const recentLevelUp = isRecentLevelUp(avatar.lastLevelUpAt);
  const levelUpEvent = useMemo(
    () => (recentLevelUp ? buildRecentLevelUpFromAvatar(avatar, playerName) : null),
    [avatar, playerName, recentLevelUp]
  );
  const levelUpBadgeLabels = useMemo(
    () => (recentLevelUp ? recentLevelUpBadgeLabels(avatar) : []),
    [avatar, recentLevelUp]
  );
  const [celebrationOpen, setCelebrationOpen] = useState(false);

  useEffect(() => {
    if (!levelUpEvent) {
      setCelebrationOpen(false);
      return;
    }
    if (hasSeenLevelUpCelebration(data.playerId, levelUpEvent.currentLevel)) {
      setCelebrationOpen(false);
      return;
    }
    setCelebrationOpen(true);
  }, [data.playerId, levelUpEvent]);

  const handleCelebrationDismiss = () => {
    if (levelUpEvent) {
      markLevelUpCelebrationSeen(data.playerId, levelUpEvent.currentLevel);
    }
    setCelebrationOpen(false);
  };

  const recentBadges =
    isRecentBadgeUnlock(avatar.lastBadgeUnlockAt) && avatar.lastUnlockedBadges?.length
      ? avatar.lastUnlockedBadges
      : null;

  const reportHref =
    deliveredReport?.reportHref ??
    (data.growthSummary.mode !== "none"
      ? buildGrowthReportSharePath(data.teamId, data.growthSummary.latestFirestoreDocId)
      : "#");

  return (
    <>
      {levelUpEvent ? (
        <LevelUpCelebrationModal
          open={celebrationOpen}
          event={levelUpEvent}
          badgeLabels={levelUpBadgeLabels}
          onDismiss={handleCelebrationDismiss}
        />
      ) : null}

      <section
        className={cn(
          "rounded-2xl border-2 border-violet-300 bg-gradient-to-br from-violet-50 via-white to-indigo-50 p-4 shadow-sm",
          className
        )}
        data-testid="parent-home-growth-card-v2"
        aria-label="자녀 성장 카드"
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">
              {teamName}
            </p>
            <h2 className="mt-0.5 flex items-center gap-1.5 text-lg font-black text-gray-900">
              <Sparkles className="h-4 w-4 text-violet-600" aria-hidden />
              <Link
                to={buildParentChildGrowthProfilePath(data.teamId, data.playerId)}
                className="underline decoration-violet-300 underline-offset-2 hover:text-violet-800"
                data-testid="parent-home-growth-profile-link"
              >
                {playerName} 아바타 성장
              </Link>
            </h2>
          </div>
        </div>

        {recentLevelUp && avatar.lastLevelUpAt != null ? (
          <ParentRecentLevelUpHeroBadge
            levelDelta={computeLevelUpDelta(avatar)}
            lastLevelUpAt={avatar.lastLevelUpAt}
          />
        ) : null}

        <ParentHeroSummaryPanel
          teamId={data.teamId}
          playerName={playerName}
          avatar={avatar}
          growthSummary={data.growthSummary}
          timeline={timeline}
        />

        <ParentWeeklyGrowthDigestPanel
          teamId={data.teamId}
          playerId={data.playerId}
          playerName={playerName}
          avatar={avatar}
          growthSummary={data.growthSummary}
          timeline={timeline}
          weeklyDigest={data.weeklyDigest}
        />

        <ParentAvatarSurfacePanel className="mt-3" avatar={avatar} />

        <ParentMonthlyGrowthPdfPanel
          teamId={data.teamId}
          playerId={data.playerId}
          playerName={playerName}
          teamName={teamName}
          avatar={avatar}
          growthSummary={data.growthSummary}
          timeline={timeline}
          weeklyDigest={data.weeklyDigest}
        />

        <ParentGrowthNarrativePanel
          teamId={data.teamId}
          playerName={playerName}
          avatar={avatar}
          growthSummary={data.growthSummary}
        />

        <div className="mt-2 flex flex-wrap items-end gap-3">
          <p className="pb-0.5 text-sm text-gray-600">
            훈련 <strong className="tabular-nums text-gray-800">{sessionCount}</strong>회
            <span className="mx-1.5 text-gray-300">·</span>
            이번 주{" "}
            <strong
              className={cn(
                "tabular-nums",
                delta > 0 ? "text-emerald-700" : delta < 0 ? "text-amber-700" : "text-gray-700"
              )}
            >
              {deltaLabel}
            </strong>
          </p>
        </div>

        <ParentGrowthTimelinePanel
          className="mt-3"
          teamId={data.teamId}
          timeline={timeline}
          avatar={avatar}
        />

        {recentBadges ? (
          <div
            className="mt-3 rounded-xl border-2 border-amber-300 bg-amber-50/90 px-3 py-2.5"
            data-testid="parent-home-new-badge-alert"
          >
            <p className="text-xs font-bold text-amber-950">🎉 최근 획득 배지</p>
            <GrowthBadgeChips className="mt-1.5" badgeIds={recentBadges} size="sm" />
          </div>
        ) : null}

        <GrowthSummarySection data={data} reportHref={reportHref} />

        <SeasonJourneyPanel
          className="mt-3"
          playerName={playerName}
          avatar={avatar}
          timeline={timeline}
        />

        <GoalSystemPanel className="mt-3" avatar={avatar} />

        <CollectionPanel className="mt-3" avatar={avatar} />

        <MissionSystemPanel
          className="mt-3"
          avatar={avatar}
          todaySessions={data.todaySessions}
        />

        <AvatarXpSystemPanel className="mt-3" playerName={playerName} avatar={avatar} />

        <SeasonPassPanel className="mt-3" playerName={playerName} avatar={avatar} />

        {data.teamRanking ? (
          <TeamAvatarRankingPanel className="mt-3" ranking={data.teamRanking} />
        ) : null}

        <AvatarMatchSimulationPanel
          className="mt-3"
          teamId={data.teamId}
          homePlayerId={data.playerId}
          homePlayerName={playerName}
          homeAvatar={avatar}
          away={data.matchAway}
          pilotDeterministic={!data.matchAway}
        />

        <TeamVsTeamPanel
          className="mt-3"
          teamId={data.teamId}
          homeTeamLabel={teamName}
          homeRoster={data.teamRoster}
          pilotDeterministic
        />

        <AcademyLeaguePanel
          className="mt-3"
          teamId={data.teamId}
          homeTeamLabel={teamName}
          homeRoster={data.teamRoster}
          pilotDeterministic
        />

        <TransferMarketPanel
          className="mt-3"
          teamId={data.teamId}
          homeTeamLabel={teamName}
          focusPlayer={{
            playerId: data.playerId,
            playerName: playerName,
            avatar,
          }}
          homeRoster={data.teamRoster}
          pilotDeterministic
        />

        {deliveredReport ? (
          <Link
            to={deliveredReport.reportHref}
            className={cn(
              "mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border-2 px-3 py-2.5 transition-colors",
              deliveredReport.isUnread
                ? "border-violet-400 bg-violet-50 hover:bg-violet-100/80"
                : "border-violet-200 bg-white/90 hover:bg-violet-50/50"
            )}
            data-testid="parent-home-new-growth-report-badge"
          >
            <span className="text-sm font-bold text-violet-950">
              {deliveredReport.isUnread ? "새 성장 리포트" : "최근 성장 리포트"}
            </span>
            {deliveredReport.deltaLabel ? (
              <span className="rounded-full bg-emerald-600 px-2.5 py-0.5 text-xs font-black text-white">
                {deliveredReport.deltaLabel}
              </span>
            ) : null}
          </Link>
        ) : null}

        <GlossaryQuickBar className="mt-3" />
      </section>
    </>
  );
}

type Props = {
  className?: string;
};

/**
 * Sprint D-4.4-c — Parent Home Growth Card v2
 * Level · OVR · 추세 · 배지 · 최근 성장 · 다음 목표
 */
export function ParentHomeGrowthCardV2({ className }: Props) {
  const { data, loading, emptyReason } = useParentHomeGrowthCardV2();

  if (loading) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-2xl border border-violet-200 bg-violet-50/80 px-4 py-3 text-sm text-violet-900",
          className
        )}
        data-testid="parent-home-growth-card-v2-loading"
      >
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        성장 카드 불러오는 중…
      </div>
    );
  }

  if (!data) {
    return (
      <section
        className={cn(
          "rounded-2xl border border-dashed border-violet-300 bg-gradient-to-b from-violet-50/70 to-white p-4",
          className
        )}
        data-testid="parent-home-growth-card-v2-empty"
        aria-label="자녀 성장 카드"
      >
        <p className="text-sm leading-relaxed text-violet-900">{emptyMessage(emptyReason)}</p>
      </section>
    );
  }

  return <ParentHomeGrowthCardV2Body data={data} className={className} />;
}
