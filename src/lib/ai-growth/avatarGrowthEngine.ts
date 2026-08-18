import { ovrToGrowthLevel } from "@/lib/ai-growth/growthAvatarLevel";
import type { PlayerGrowthOvrDoc } from "@/lib/ai-growth/playerGrowthOvrTypes";
import {
  PLAYER_GROWTH_AVATAR_SCHEMA_VERSION,
  type AvatarTier,
  type GrowthBadgeId,
  type GrowthBadgeMeta,
  type PlayerGrowthAvatarDoc,
} from "@/lib/ai-growth/playerGrowthAvatarTypes";

/** Sprint D-4.3-a — Badge Registry */
export const GROWTH_BADGE_CATALOG: GrowthBadgeMeta[] = [
  {
    id: "vision_reader",
    label: "Vision Reader",
    labelKo: "Vision Reader",
    emoji: "⭐",
    criterion: { kind: "stat", stat: "vision", minStat: 85 },
    descriptionKo: "SCAN(시야) 85 이상",
  },
  {
    id: "pressure_breaker",
    label: "Pressure Breaker",
    labelKo: "Pressure Breaker",
    emoji: "⭐",
    criterion: { kind: "stat", stat: "pressure", minStat: 85 },
    descriptionKo: "PRESS(압박 대응) 85 이상",
  },
  {
    id: "recovery_runner",
    label: "Recovery Runner",
    labelKo: "Recovery Runner",
    emoji: "⭐",
    criterion: { kind: "stat", stat: "recovery", minStat: 80 },
    descriptionKo: "RECOVERY(회복) 80 이상",
  },
  {
    id: "playmaker",
    label: "Playmaker",
    labelKo: "Playmaker",
    emoji: "⭐",
    criterion: { kind: "stat", stat: "vision", minStat: 90 },
    descriptionKo: "SCAN(시야) 90 이상 — 플레이메이커",
  },
  {
    id: "field_commander",
    label: "Field Commander",
    labelKo: "Field Commander",
    emoji: "⭐",
    criterion: { kind: "ovr", minOvr: 85 },
    descriptionKo: "OVR 85 이상 — 필드 지휘관",
  },
  {
    id: "transition_master",
    label: "Transition Master",
    labelKo: "Transition Master",
    emoji: "⭐",
    criterion: { kind: "stat", stat: "recovery", minStat: 85 },
    descriptionKo: "RECOVERY(회복) 85 이상 — 전환 마스터",
  },
  {
    id: "consistency_star",
    label: "Consistency Star",
    labelKo: "Consistency Star",
    emoji: "🏅",
    criterion: { kind: "session", minSessionCount: 10 },
    descriptionKo: "코치 검증 훈련 10회 이상",
  },
];

export const GROWTH_BADGE_IDS = GROWTH_BADGE_CATALOG.map((b) => b.id) as GrowthBadgeId[];

const LEGACY_BADGE_ALIASES: Record<string, GrowthBadgeId> = {
  quick_recovery: "recovery_runner",
};

export function normalizeGrowthBadgeId(raw: string): GrowthBadgeId | null {
  const id = LEGACY_BADGE_ALIASES[raw] ?? raw;
  return GROWTH_BADGE_IDS.includes(id as GrowthBadgeId) ? (id as GrowthBadgeId) : null;
}

export function normalizeGrowthBadgeIds(raw: string[]): GrowthBadgeId[] {
  const seen = new Set<GrowthBadgeId>();
  const out: GrowthBadgeId[] = [];
  for (const item of raw) {
    const id = normalizeGrowthBadgeId(item);
    if (id && !seen.has(id)) {
      seen.add(id);
      out.push(id);
    }
  }
  return out;
}

export const AVATAR_TIER_LABELS: Record<
  AvatarTier,
  { label: string; labelKo: string; emoji: string }
> = {
  starter: { label: "Starter", labelKo: "스타터", emoji: "🌱" },
  bronze: { label: "Bronze", labelKo: "브론즈", emoji: "🥉" },
  silver: { label: "Silver", labelKo: "실버", emoji: "🥈" },
  gold: { label: "Gold", labelKo: "골드", emoji: "🥇" },
  elite: { label: "Elite", labelKo: "엘리트", emoji: "💎" },
};

export function ovrToAvatarTier(ovr: number): AvatarTier {
  if (ovr >= 90) return "elite";
  if (ovr >= 80) return "gold";
  if (ovr >= 70) return "silver";
  if (ovr >= 60) return "bronze";
  return "starter";
}

/** Sprint D-4.3-b — Badge Unlock Rules */
export function computeEarnedBadges(input: {
  vision: number;
  pressure: number;
  recovery: number;
  ovr: number;
  sessionCount?: number;
}): GrowthBadgeId[] {
  const earned: GrowthBadgeId[] = [];
  for (const badge of GROWTH_BADGE_CATALOG) {
    const { criterion } = badge;
    if (criterion.kind === "stat") {
      const value = input[criterion.stat];
      if (value >= criterion.minStat) earned.push(badge.id);
    } else if (criterion.kind === "ovr") {
      if (input.ovr >= criterion.minOvr) earned.push(badge.id);
    } else if ((input.sessionCount ?? 0) >= criterion.minSessionCount) {
      earned.push(badge.id);
    }
  }
  return earned;
}

export function badgeMetaById(id: GrowthBadgeId): GrowthBadgeMeta {
  return GROWTH_BADGE_CATALOG.find((b) => b.id === id) ?? GROWTH_BADGE_CATALOG[0]!;
}

export function formatAvatarTierLine(tier: AvatarTier): string {
  const meta = AVATAR_TIER_LABELS[tier] ?? AVATAR_TIER_LABELS.starter;
  return `${meta.emoji} ${meta.labelKo}`;
}

export function buildPlayerGrowthAvatarFromOvr(
  ovrDoc: PlayerGrowthOvrDoc,
  extras?: {
    sessionCount?: number;
    lastSessionId?: string;
    weeklyDeltaOvr?: number;
  }
): PlayerGrowthAvatarDoc {
  const stats = {
    vision: ovrDoc.vision,
    pressure: ovrDoc.pressure,
    recovery: ovrDoc.recovery,
  };
  const now = Date.now();
  const ovr = Math.round(ovrDoc.ovr);
  const sessionCount = extras?.sessionCount;

  return {
    schemaVersion: PLAYER_GROWTH_AVATAR_SCHEMA_VERSION,
    playerId: ovrDoc.playerId,
    playerName: ovrDoc.playerName,
    level: ovrToGrowthLevel(ovr),
    ovr,
    ...stats,
    visionScan: stats.vision,
    pressureResistance: stats.pressure,
    recoverySpeed: stats.recovery,
    tier: ovrToAvatarTier(ovr),
    badges: computeEarnedBadges({ ...stats, ovr, sessionCount }),
    ...(sessionCount != null ? { sessionCount } : {}),
    ...(extras?.lastSessionId ? { lastSessionId: extras.lastSessionId } : {}),
    ...(extras?.weeklyDeltaOvr != null ? { weeklyDeltaOvr: extras.weeklyDeltaOvr } : {}),
    updatedAt: now,
    syncedFromOvrAt: now,
  };
}

export function nextBadgeHints(input: {
  vision: number;
  pressure: number;
  recovery: number;
  ovr: number;
  sessionCount?: number;
}): Array<{ badge: GrowthBadgeMeta; remaining: number; unit: "stat" | "session" | "ovr" }> {
  const hints: Array<{ badge: GrowthBadgeMeta; remaining: number; unit: "stat" | "session" | "ovr" }> =
    [];
  for (const badge of GROWTH_BADGE_CATALOG) {
    const { criterion } = badge;
    if (criterion.kind === "stat") {
      const value = input[criterion.stat];
      if (value < criterion.minStat) {
        hints.push({ badge, remaining: criterion.minStat - value, unit: "stat" });
      }
    } else if (criterion.kind === "ovr") {
      if (input.ovr < criterion.minOvr) {
        hints.push({ badge, remaining: criterion.minOvr - input.ovr, unit: "ovr" });
      }
    } else {
      const count = input.sessionCount ?? 0;
      if (count < criterion.minSessionCount) {
        hints.push({ badge, remaining: criterion.minSessionCount - count, unit: "session" });
      }
    }
  }
  return hints;
}
