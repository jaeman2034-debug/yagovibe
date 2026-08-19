/**
 * CV-1 I12-4 — Parent Hero Summary (I12-1~3 projection composite · read-only)
 */
import { badgeMetaById } from "@/lib/ai-growth/avatarGrowthEngine";
import { buildParentAvatarSurfaceView } from "@/lib/ai-growth/parentAvatarSurfaceView";
import {
  buildParentGrowthNarrative,
  isParentGrowthNarrativeEmpty,
} from "@/lib/ai-growth/parentGrowthNarrativeEngine";
import type { ParentHomeGrowthSummarySlice } from "@/lib/ai-growth/parentHomeGrowthCardV2Types";
import type { GrowthBadgeId, PlayerGrowthAvatarDoc } from "@/lib/ai-growth/playerGrowthAvatarTypes";
import type { PlayerGrowthTimeline } from "@/lib/ai-growth/growthTimelineTypes";

export const PARENT_HERO_SUMMARY_EMPTY_MESSAGE =
  "성장 데이터가 준비되면 요약 정보를 확인할 수 있습니다." as const;

export type ParentHeroSummaryView = {
  levelLabel: string;
  tierLabelKo: string;
  tierEmoji: string;
  ovr: number;
  representativeStrength: string | null;
  recentDelta: number | null;
  recentDeltaLabel: string | null;
  statusSummary: string;
  isEmpty: boolean;
  emptyMessage: string;
};

export type ParentHeroSummaryInput = {
  playerName?: string;
  avatar: PlayerGrowthAvatarDoc;
  growthSnapshot: ParentHomeGrowthSummarySlice;
  timeline: PlayerGrowthTimeline | null;
};

function resolveRecentDelta(
  growthSnapshot: ParentHomeGrowthSummarySlice,
  timeline: PlayerGrowthTimeline | null,
  weeklyDeltaOvr: number | null | undefined
): number | null {
  if (growthSnapshot.mode === "comparison") {
    return growthSnapshot.summary.delta.delta ?? null;
  }
  if (timeline?.deltaScore != null) return timeline.deltaScore;
  if (weeklyDeltaOvr != null) return weeklyDeltaOvr;
  return null;
}

function formatRecentDeltaLabel(delta: number | null): string | null {
  if (delta == null) return null;
  if (delta > 0) return `+${delta}`;
  if (delta < 0) return String(delta);
  return "+0";
}

function buildRepresentativeStrength(
  narrativeStrengths: string[],
  topBadgeId: GrowthBadgeId | undefined
): string | null {
  if (narrativeStrengths.length > 0) {
    return narrativeStrengths[0]!;
  }
  if (topBadgeId) {
    return badgeMetaById(topBadgeId).label;
  }
  return null;
}

function buildStatusSummary(tierLabelKo: string, levelLabel: string, narrativeSummary: string): string {
  const tierLine = narrativeSummary
    .split("\n\n")
    .find((p) => p.includes("티어"));
  if (tierLine) return tierLine;
  return `현재 ${tierLabelKo} 티어(${levelLabel})를 유지하고 있습니다.`;
}

export function buildParentHeroSummaryView(input: ParentHeroSummaryInput): ParentHeroSummaryView {
  const { avatar, growthSnapshot, timeline } = input;
  const isEmpty = isParentGrowthNarrativeEmpty({
    playerName: input.playerName,
    avatar,
    growthSnapshot,
  });

  if (isEmpty) {
    return {
      levelLabel: "—",
      tierLabelKo: "—",
      tierEmoji: "",
      ovr: 0,
      representativeStrength: null,
      recentDelta: null,
      recentDeltaLabel: null,
      statusSummary: PARENT_HERO_SUMMARY_EMPTY_MESSAGE,
      isEmpty: true,
      emptyMessage: PARENT_HERO_SUMMARY_EMPTY_MESSAGE,
    };
  }

  const surface = buildParentAvatarSurfaceView(avatar);
  const narrative = buildParentGrowthNarrative({
    playerName: input.playerName,
    avatar,
    growthSnapshot,
  });

  const recentDelta = resolveRecentDelta(
    growthSnapshot,
    timeline,
    avatar.weeklyDeltaOvr ?? null
  );

  return {
    levelLabel: surface.levelLabel,
    tierLabelKo: surface.tierLabelKo,
    tierEmoji: surface.tierEmoji,
    ovr: surface.ovr,
    representativeStrength: buildRepresentativeStrength(
      narrative.strengths,
      surface.topBadgeIds[0]
    ),
    recentDelta,
    recentDeltaLabel: formatRecentDeltaLabel(recentDelta),
    statusSummary: buildStatusSummary(surface.tierLabelKo, surface.levelLabel, narrative.summary),
    isEmpty: false,
    emptyMessage: PARENT_HERO_SUMMARY_EMPTY_MESSAGE,
  };
}
