import { nextBadgeHints } from "@/lib/ai-growth/avatarGrowthEngine";
import type {
  AvatarGrowthRecommendation,
  AvatarGrowthRecommendationBundle,
  GrowthStatAxis,
} from "@/lib/ai-growth/avatarGrowthRecommendationTypes";
import type { GrowthAvatarLevel } from "@/lib/ai-growth/growthAvatarLevel";
import type { PlayerGrowthAvatarDoc } from "@/lib/ai-growth/playerGrowthAvatarTypes";

const LEVEL_UP_OVR_TARGET: Record<GrowthAvatarLevel, number | null> = {
  1: 75,
  2: 80,
  3: 85,
  4: 90,
  5: null,
};

const STAT_LABEL_KO: Record<GrowthStatAxis, string> = {
  vision: "시야(Vision)",
  pressure: "압박 대응(Pressure)",
  recovery: "회복(Recovery)",
};

const STAT_LABEL_SHORT: Record<GrowthStatAxis, string> = {
  vision: "Vision",
  pressure: "Pressure",
  recovery: "Recovery",
};

function weakestStatAxis(avatar: PlayerGrowthAvatarDoc): GrowthStatAxis {
  const stats: Array<[GrowthStatAxis, number]> = [
    ["vision", avatar.vision],
    ["pressure", avatar.pressure],
    ["recovery", avatar.recovery],
  ];
  return stats.sort((a, b) => a[1] - b[1])[0]![0];
}

function formatStatBadgeDetail(
  stat: GrowthStatAxis,
  target: number,
  badgeLabel: string
): string {
  return `${STAT_LABEL_SHORT[stat]} ${target} 달성 시\n${badgeLabel} 획득`;
}

/**
 * Sprint D-5.1 — 다음 성장 추천 (배지 · 레벨 · 훈련 집중)
 * SoT: playerGrowthAvatar + nextBadgeHints
 */
export function buildAvatarGrowthRecommendations(
  avatar: PlayerGrowthAvatarDoc,
  maxItems = 5
): AvatarGrowthRecommendationBundle {
  const primaryStat = weakestStatAxis(avatar);
  const primaryFocusLabel = `${STAT_LABEL_KO[primaryStat]} 훈련 비중 증가 권장`;

  const recommendations: AvatarGrowthRecommendation[] = [];
  let priority = 1;

  recommendations.push({
    id: `focus-${primaryStat}`,
    kind: "training_focus",
    priority: priority++,
    emoji: "🎯",
    title: "훈련 집중",
    detail: primaryFocusLabel,
    stat: primaryStat,
  });

  const badgeHints = nextBadgeHints({
    vision: avatar.vision,
    pressure: avatar.pressure,
    recovery: avatar.recovery,
    ovr: avatar.ovr,
    sessionCount: avatar.sessionCount,
  });

  const scored = badgeHints.map((hint) => {
    const stat =
      hint.badge.criterion.kind === "stat" ? hint.badge.criterion.stat : undefined;
    const focusBoost = stat === primaryStat ? -0.5 : 0;
    return { ...hint, sortKey: hint.remaining + focusBoost, stat };
  });

  scored.sort((a, b) => a.sortKey - b.sortKey);

  for (const { badge, remaining, unit, stat } of scored) {
    if (recommendations.length >= maxItems) break;

    if (unit === "stat" && stat && badge.criterion.kind === "stat") {
      recommendations.push({
        id: `badge-${badge.id}`,
        kind: "badge",
        priority: priority++,
        emoji: badge.emoji,
        title: badge.labelKo,
        detail: formatStatBadgeDetail(stat, badge.criterion.minStat, badge.labelKo),
        stat,
        remaining,
      });
    } else if (unit === "ovr" && badge.criterion.kind === "ovr") {
      recommendations.push({
        id: `badge-${badge.id}`,
        kind: "badge",
        priority: priority++,
        emoji: badge.emoji,
        title: badge.labelKo,
        detail: `OVR ${badge.criterion.minOvr} 달성 시\n${badge.labelKo} 획득`,
        remaining,
      });
    } else if (unit === "session" && badge.criterion.kind === "session") {
      recommendations.push({
        id: `badge-${badge.id}`,
        kind: "session",
        priority: priority++,
        emoji: badge.emoji,
        title: badge.labelKo,
        detail: `훈련 ${badge.criterion.minSessionCount}회 달성 시\n${badge.labelKo} 획득`,
        remaining,
      });
    }
  }

  const level = avatar.level as GrowthAvatarLevel;
  const nextLevelTarget = LEVEL_UP_OVR_TARGET[level];
  if (
    nextLevelTarget != null &&
    avatar.ovr < nextLevelTarget &&
    recommendations.length < maxItems
  ) {
    recommendations.push({
      id: `level-${level + 1}`,
      kind: "level",
      priority: priority++,
      emoji: "🏅",
      title: `Level ${level + 1}`,
      detail: `OVR ${nextLevelTarget} 달성 시\nLevel ${level + 1} 달성`,
      remaining: nextLevelTarget - avatar.ovr,
    });
  }

  return {
    primaryStat,
    primaryFocusLabel,
    recommendations: recommendations.slice(0, maxItems),
  };
}
