/**
 * J1-1 — Weekly Growth Digest (I12 projection composite · read-only · no new SoT)
 *
 * Inputs: playerGrowthAvatar · playerGrowthHistory timeline · I12 Narrative/Hero enrichments
 */
import { buildAvatarGrowthRecommendations } from "@/lib/ai-growth/avatarGrowthRecommendationEngine";
import type { GrowthStatAxis } from "@/lib/ai-growth/avatarGrowthRecommendationTypes";
import { buildParentGrowthNarrative } from "@/lib/ai-growth/parentGrowthNarrativeEngine";
import { buildParentGrowthTimelineView } from "@/lib/ai-growth/parentGrowthTimelineView";
import type {
  ParentHomeGrowthSummarySlice,
  ParentHomeWeeklyDigestSlice,
} from "@/lib/ai-growth/parentHomeGrowthCardV2Types";
import type { PlayerGrowthAvatarDoc } from "@/lib/ai-growth/playerGrowthAvatarTypes";
import type { PlayerGrowthTimeline } from "@/lib/ai-growth/growthTimelineTypes";
import {
  buildWeeklyGrowthDigestEnrichment,
  enrichWeeklyDigestSummary,
} from "@/lib/ai-growth/weeklyGrowthDigestEngine";
import type { WeeklyGrowthDigestEnrichment } from "@/lib/ai-growth/weeklyDigestTypes";

export const PARENT_WEEKLY_DIGEST_EMPTY_MESSAGE =
  "이번 주 훈련 데이터가 쌓이면 주간 성장 요약을 확인할 수 있습니다." as const;

const STAT_LABEL_SHORT: Record<GrowthStatAxis, string> = {
  vision: "Vision",
  pressure: "Pressure",
  recovery: "Recovery",
};

const STAT_TARGET = 80;

export type ParentWeeklyGrowthDigestView = {
  weekKey: string;
  ovrHeadline: string | null;
  highlightLine: string | null;
  badgeLine: string | null;
  nextGoalLine: string | null;
  reportHref: string | null;
  isEmpty: boolean;
  emptyMessage: string;
};

export type ParentWeeklyGrowthDigestInput = {
  playerName?: string;
  avatar: PlayerGrowthAvatarDoc;
  growthSummary: ParentHomeGrowthSummarySlice;
  timeline: PlayerGrowthTimeline | null;
  weeklyDigest: ParentHomeWeeklyDigestSlice | null;
};

function resolveWeekBounds(weeklyDigest: ParentHomeWeeklyDigestSlice | null): {
  weekStartMs: number;
  weekEndMs: number;
} {
  const now = Date.now();
  if (weeklyDigest?.summary) {
    return {
      weekStartMs: now - 7 * 24 * 60 * 60 * 1000,
      weekEndMs: now,
    };
  }
  return {
    weekStartMs: now - 7 * 24 * 60 * 60 * 1000,
    weekEndMs: now,
  };
}

export function formatWeeklyOvrHeadline(growth: WeeklyGrowthDigestEnrichment): string | null {
  if (growth.ovrAfter == null) return null;
  if (growth.ovrBefore != null) {
    const d = growth.ovrDelta;
    const suffix =
      d != null && d !== 0 ? ` (${d > 0 ? "+" : ""}${d})` : "";
    return `OVR ${growth.ovrBefore} → ${growth.ovrAfter}${suffix}`;
  }
  return `OVR ${growth.ovrAfter}`;
}

function resolveHighlightLine(input: ParentWeeklyGrowthDigestInput): string | null {
  const narrative = buildParentGrowthNarrative({
    playerName: input.playerName,
    avatar: input.avatar,
    growthSnapshot: input.growthSummary,
  });
  return narrative.strengths[0] ?? narrative.summary.split("\n\n")[0] ?? null;
}

function resolveBadgeLine(
  growth: WeeklyGrowthDigestEnrichment,
  avatar: PlayerGrowthAvatarDoc
): string | null {
  if (growth.newBadges.length > 0) {
    return `${growth.newBadges[0]} 배지를 획득했습니다.`;
  }

  const timelineView = buildParentGrowthTimelineView({ timeline: null, avatar });
  const acquired = timelineView.badgeLines.find((b) => b.kind === "acquired");
  if (acquired) {
    return `${acquired.labelKo} 배지를 획득했습니다.`;
  }

  return null;
}

function resolveNextGoalLine(
  avatar: PlayerGrowthAvatarDoc,
  growth: WeeklyGrowthDigestEnrichment
): string | null {
  const rec = buildAvatarGrowthRecommendations(avatar, 3);
  const stat = rec.primaryStat;
  const statValue = avatar[stat];
  if (statValue < STAT_TARGET) {
    return `다음 목표는 ${STAT_LABEL_SHORT[stat]} ${STAT_TARGET}입니다.`;
  }

  if (growth.nextGoal) {
    return growth.nextGoal.startsWith("다음")
      ? growth.nextGoal
      : `다음 목표는 ${growth.nextGoal}입니다.`;
  }

  return null;
}

/** J1-1 — 30초 스캔용 주간 digest (read-only projection) */
export function buildParentWeeklyGrowthDigestView(
  input: ParentWeeklyGrowthDigestInput
): ParentWeeklyGrowthDigestView {
  const sessions = input.avatar.sessionCount ?? 0;
  if (sessions <= 0 && input.growthSummary.mode === "none") {
    return {
      weekKey: input.weeklyDigest?.weekKey ?? "이번 주",
      ovrHeadline: null,
      highlightLine: null,
      badgeLine: null,
      nextGoalLine: null,
      reportHref: input.weeklyDigest?.reportHref ?? null,
      isEmpty: true,
      emptyMessage: PARENT_WEEKLY_DIGEST_EMPTY_MESSAGE,
    };
  }

  const { weekStartMs, weekEndMs } = resolveWeekBounds(input.weeklyDigest);
  const baseSummary = input.weeklyDigest?.summary ?? {
    scoreCurrent: input.avatar.ovr,
    scorePrevious: null,
    delta: input.avatar.weeklyDeltaOvr ?? null,
    strengths: [],
    improvements: [],
    nextTraining: [],
  };

  const enriched = enrichWeeklyDigestSummary({
    summary: baseSummary,
    avatar: input.avatar,
    timeline: input.timeline,
    weekStartMs,
    weekEndMs,
  });

  const growth =
    enriched.growth ??
    buildWeeklyGrowthDigestEnrichment({
      avatar: input.avatar,
      timeline: input.timeline,
      digestSummary: baseSummary,
      weekStartMs,
      weekEndMs,
    });

  const ovrHeadline = formatWeeklyOvrHeadline(growth);
  const highlightLine = resolveHighlightLine(input);
  const badgeLine = resolveBadgeLine(growth, input.avatar);
  const nextGoalLine = resolveNextGoalLine(input.avatar, growth);

  const hasContent = Boolean(ovrHeadline || highlightLine || badgeLine || nextGoalLine);

  return {
    weekKey: input.weeklyDigest?.weekKey ?? "이번 주",
    ovrHeadline,
    highlightLine,
    badgeLine,
    nextGoalLine,
    reportHref: input.weeklyDigest?.reportHref ?? null,
    isEmpty: !hasContent,
    emptyMessage: PARENT_WEEKLY_DIGEST_EMPTY_MESSAGE,
  };
}
