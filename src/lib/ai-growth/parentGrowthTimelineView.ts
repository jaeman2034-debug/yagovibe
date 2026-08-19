/**
 * CV-1 I12-3 — playerGrowthHistory timeline + avatar read-only projection
 */
import { badgeMetaById } from "@/lib/ai-growth/avatarGrowthEngine";
import { growthLevelLabel } from "@/lib/ai-growth/growthAvatarLevel";
import { isRecentBadgeUnlock } from "@/lib/ai-growth/growthAvatarBadgeUnlock";
import {
  canShowGrowthTimelineChart,
  formatGrowthTimelineScoreChain,
} from "@/lib/ai-growth/growthTimelineDisplay";
import type { GrowthTrendDirection, PlayerGrowthTimeline } from "@/lib/ai-growth/growthTimelineTypes";
import type { PlayerGrowthAvatarDoc } from "@/lib/ai-growth/playerGrowthAvatarTypes";

export const PARENT_TIMELINE_EMPTY_MESSAGE =
  "성장 이력이 충분히 쌓이면 추세를 확인할 수 있습니다." as const;

export type ParentGrowthTimelineBadgeLine = {
  labelKo: string;
  kind: "acquired" | "maintained";
};

export type ParentGrowthTimelineView = {
  ovrScores: number[];
  ovrChain: string;
  levelLabel: string;
  trendDirection: GrowthTrendDirection;
  trendLabelKo: string;
  badgeLines: ParentGrowthTimelineBadgeLine[];
  canShowChart: boolean;
  emptyMessage: string;
};

function trendLabelKo(direction: GrowthTrendDirection): string {
  if (direction === "up") return "상승";
  if (direction === "down") return "하락";
  return "유지";
}

function buildLevelLabel(points: PlayerGrowthTimeline["points"]): string {
  if (points.length === 0) return "—";

  const levels = points.map((p) => p.level ?? null).filter((l): l is number => l != null);
  if (levels.length === 0) return "—";

  const oldest = levels[0]!;
  const newest = levels[levels.length - 1]!;

  if (oldest === newest) {
    return `${growthLevelLabel(newest as 1 | 2 | 3 | 4 | 5)} 유지`;
  }

  return `${growthLevelLabel(oldest as 1 | 2 | 3 | 4 | 5)} → ${growthLevelLabel(newest as 1 | 2 | 3 | 4 | 5)}`;
}

function buildLevelLabelFromAvatar(avatar: PlayerGrowthAvatarDoc): string {
  if (avatar.lastLevel != null && avatar.lastLevel !== avatar.level) {
    return `${growthLevelLabel(avatar.lastLevel as 1 | 2 | 3 | 4 | 5)} → ${growthLevelLabel(avatar.level as 1 | 2 | 3 | 4 | 5)}`;
  }
  return `${growthLevelLabel(avatar.level as 1 | 2 | 3 | 4 | 5)} 유지`;
}

function buildBadgeLines(avatar: PlayerGrowthAvatarDoc): ParentGrowthTimelineBadgeLine[] {
  const lines: ParentGrowthTimelineBadgeLine[] = [];
  const recentUnlock = isRecentBadgeUnlock(avatar.lastBadgeUnlockAt);
  const acquired = recentUnlock ? (avatar.lastUnlockedBadges ?? []) : [];
  const acquiredSet = new Set(acquired);

  for (const id of acquired.slice(0, 2)) {
    lines.push({ labelKo: badgeMetaById(id).labelKo, kind: "acquired" });
  }

  for (const id of avatar.badges) {
    if (acquiredSet.has(id)) continue;
    lines.push({ labelKo: badgeMetaById(id).labelKo, kind: "maintained" });
    if (lines.length >= 3) break;
  }

  return lines.slice(0, 3);
}

export function buildParentGrowthTimelineView(input: {
  timeline: PlayerGrowthTimeline | null;
  avatar: PlayerGrowthAvatarDoc;
}): ParentGrowthTimelineView {
  const { timeline, avatar } = input;
  const canShowChart = canShowGrowthTimelineChart(timeline);
  const ovrScores = timeline?.points.map((p) => p.score) ?? [];
  const ovrChain = ovrScores.length > 0 ? formatGrowthTimelineScoreChain(ovrScores) : "—";

  const levelLabel =
    timeline && timeline.points.length >= 2
      ? buildLevelLabel(timeline.points)
      : buildLevelLabelFromAvatar(avatar);

  const trendDirection = timeline?.trendDirection ?? "stable";
  const badgeLines = buildBadgeLines(avatar);

  return {
    ovrScores,
    ovrChain,
    levelLabel,
    trendDirection,
    trendLabelKo: trendLabelKo(trendDirection),
    badgeLines,
    canShowChart,
    emptyMessage: PARENT_TIMELINE_EMPTY_MESSAGE,
  };
}
