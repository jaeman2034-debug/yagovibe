/**
 * J2-3 — Goal System read-only projection (playerGrowthAvatar + nextBadgeHints)
 */
import { buildAvatarGrowthRecommendations } from "@/lib/ai-growth/avatarGrowthRecommendationEngine";
import type { GrowthStatAxis } from "@/lib/ai-growth/avatarGrowthRecommendationTypes";
import { nextBadgeHints } from "@/lib/ai-growth/avatarGrowthEngine";
import type { GrowthAvatarLevel } from "@/lib/ai-growth/growthAvatarLevel";
import type { GrowthBadgeMeta } from "@/lib/ai-growth/playerGrowthAvatarTypes";
import type { PlayerGrowthAvatarDoc } from "@/lib/ai-growth/playerGrowthAvatarTypes";

const LEVEL_UP_OVR_TARGET: Record<GrowthAvatarLevel, number | null> = {
  1: 75,
  2: 80,
  3: 85,
  4: 90,
  5: null,
};

const STAT_LABEL_SHORT: Record<GrowthStatAxis, string> = {
  vision: "Vision",
  pressure: "Pressure",
  recovery: "Recovery",
};

export type GoalSystemStatType = "recovery" | "vision" | "pressure" | "session" | "ovr";

export type GoalSystemGoalSlice = {
  type: GoalSystemStatType;
  current: number;
  target: number;
  progress: number;
  label: string;
};

export type GoalSystemView = {
  primaryFocusLabel: string | null;
  primaryGoal: GoalSystemGoalSlice | null;
  reward: string | null;
  nextGoal: {
    type: GoalSystemStatType;
    current: number;
    target: number;
    reward: string;
    label: string;
    progress: number;
  } | null;
  ovrGoal: {
    current: number;
    target: number | null;
    label: string;
    progress: number | null;
  };
};

function computeProgress(current: number, target: number): number {
  if (target <= 0) return 100;
  return Math.min(100, Math.floor((current / target) * 100));
}

type ScoredHint = {
  badge: GrowthBadgeMeta;
  remaining: number;
  unit: "stat" | "session" | "ovr";
  stat?: GrowthStatAxis;
  sortKey: number;
};

function scoreBadgeHints(
  avatar: PlayerGrowthAvatarDoc,
  primaryStat: GrowthStatAxis
): ScoredHint[] {
  const hints = nextBadgeHints({
    vision: avatar.vision,
    pressure: avatar.pressure,
    recovery: avatar.recovery,
    ovr: avatar.ovr,
    sessionCount: avatar.sessionCount,
  });

  return hints
    .map((hint) => {
      const stat =
        hint.badge.criterion.kind === "stat" ? hint.badge.criterion.stat : undefined;
      const focusBoost = stat === primaryStat ? -0.5 : 0;
      return { ...hint, stat, sortKey: hint.remaining + focusBoost };
    })
    .sort((a, b) => a.sortKey - b.sortKey);
}

function hintToGoalSlice(
  hint: ScoredHint,
  avatar: PlayerGrowthAvatarDoc
): GoalSystemGoalSlice | null {
  const { badge, unit } = hint;
  const criterion = badge.criterion;

  if (unit === "stat" && criterion.kind === "stat") {
    const current = avatar[criterion.stat];
    const target = criterion.minStat;
    return {
      type: criterion.stat,
      current,
      target,
      progress: computeProgress(current, target),
      label: STAT_LABEL_SHORT[criterion.stat],
    };
  }

  if (unit === "session" && criterion.kind === "session") {
    const current = avatar.sessionCount ?? 0;
    const target = criterion.minSessionCount;
    return {
      type: "session",
      current,
      target,
      progress: computeProgress(current, target),
      label: "훈련",
    };
  }

  if (unit === "ovr" && criterion.kind === "ovr") {
    const current = avatar.ovr;
    const target = criterion.minOvr;
    return {
      type: "ovr",
      current,
      target,
      progress: computeProgress(current, target),
      label: "OVR",
    };
  }

  return null;
}

function pickPrimaryHint(scored: ScoredHint[], primaryStat: GrowthStatAxis): ScoredHint | null {
  const onPrimaryAxis = scored.filter(
    (h) =>
      h.unit === "stat" &&
      h.badge.criterion.kind === "stat" &&
      h.badge.criterion.stat === primaryStat
  );

  if (onPrimaryAxis.length > 0) {
    onPrimaryAxis.sort(
      (a, b) =>
        (a.badge.criterion.kind === "stat" ? a.badge.criterion.minStat : 0) -
        (b.badge.criterion.kind === "stat" ? b.badge.criterion.minStat : 0)
    );
    return onPrimaryAxis[0]!;
  }

  return scored[0] ?? null;
}

export function buildGoalSystemView(avatar: PlayerGrowthAvatarDoc): GoalSystemView {
  const bundle = buildAvatarGrowthRecommendations(avatar, 8);
  const scored = scoreBadgeHints(avatar, bundle.primaryStat);
  const primaryHint = pickPrimaryHint(scored, bundle.primaryStat);
  const primaryGoal = primaryHint ? hintToGoalSlice(primaryHint, avatar) : null;

  const nextHint = scored.find((h) => h.badge.id !== primaryHint?.badge.id) ?? null;
  const nextSlice = nextHint ? hintToGoalSlice(nextHint, avatar) : null;

  const nextGoal = nextSlice
    ? {
        type: nextSlice.type,
        current: nextSlice.current,
        target: nextSlice.target,
        reward: nextHint!.badge.labelKo,
        label: nextSlice.label,
        progress: nextSlice.progress,
      }
    : null;

  const level = avatar.level as GrowthAvatarLevel;
  const ovrTarget = LEVEL_UP_OVR_TARGET[level];
  const ovrCurrent = avatar.ovr;

  let ovrLabel = `OVR ${ovrCurrent}`;
  let ovrProgress: number | null = null;

  if (ovrTarget != null && ovrCurrent < ovrTarget) {
    ovrLabel = `OVR ${ovrCurrent} → ${ovrTarget}`;
    ovrProgress = computeProgress(ovrCurrent, ovrTarget);
  } else if (ovrTarget != null) {
    ovrLabel = `OVR ${ovrCurrent} (목표 달성)`;
    ovrProgress = 100;
  }

  return {
    primaryFocusLabel: bundle.primaryFocusLabel,
    primaryGoal,
    reward: primaryHint?.badge.labelKo ?? null,
    nextGoal,
    ovrGoal: {
      current: ovrCurrent,
      target: ovrTarget,
      label: ovrLabel,
      progress: ovrProgress,
    },
  };
}
