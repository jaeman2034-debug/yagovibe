/**
 * J3-3 — Season Pass read-only projection (J3-2 XP reuse · client catalog)
 */
import { projectGrowthDisplayXp } from "@/lib/ai-growth/avatarXpSystemView";
import type { PlayerGrowthAvatarDoc } from "@/lib/ai-growth/playerGrowthAvatarTypes";

export const SEASON_PASS_ID = "season-1" as const;
export const SEASON_PASS_LABEL = "Season 1" as const;
export const SEASON_XP_PER_LEVEL = 100;
export const SEASON_MAX_LEVEL = 50;

export type SeasonPassRewardType = "badge" | "frame" | "title" | "xp_bonus";

export type SeasonPassRewardDef = {
  level: number;
  type: SeasonPassRewardType;
  labelKo: string;
  emoji: string;
};

export const SEASON_PASS_REWARD_CATALOG: SeasonPassRewardDef[] = [
  { level: 5, type: "badge", labelKo: "Vision Scout", emoji: "👁️" },
  { level: 10, type: "frame", labelKo: "Bronze Frame", emoji: "🟤" },
  { level: 15, type: "title", labelKo: "Rising Star", emoji: "⭐" },
  { level: 20, type: "xp_bonus", labelKo: "+100 XP Bonus", emoji: "💎" },
  { level: 25, type: "badge", labelKo: "Pressure Breaker", emoji: "💪" },
  { level: 30, type: "frame", labelKo: "Silver Frame", emoji: "⚪" },
  { level: 35, type: "title", labelKo: "Field Commander", emoji: "🎖️" },
  { level: 40, type: "xp_bonus", labelKo: "+200 XP Bonus", emoji: "💎" },
  { level: 45, type: "badge", labelKo: "Recovery Runner", emoji: "🏃" },
  { level: 50, type: "title", labelKo: "Season Champion", emoji: "🏆" },
];

export type SeasonPassRewardItem = SeasonPassRewardDef & {
  unlocked: boolean;
  typeLabelKo: string;
};

export type SeasonPassView = {
  seasonId: string;
  seasonLabel: string;
  seasonLevel: number;
  seasonXp: number;
  nextLevelXp: number | null;
  levelProgress: number;
  seasonProgress: number;
  xpLabel: string;
  seasonProgressLabel: string;
  nextReward: SeasonPassRewardItem | null;
  rewardCatalog: SeasonPassRewardItem[];
};

const REWARD_TYPE_LABEL: Record<SeasonPassRewardType, string> = {
  badge: "Badge",
  frame: "Frame",
  title: "Title",
  xp_bonus: "XP Bonus",
};

function seasonLevelFromXp(seasonXp: number): number {
  if (seasonXp <= 0) return 1;
  return Math.min(SEASON_MAX_LEVEL, Math.max(1, Math.ceil(seasonXp / SEASON_XP_PER_LEVEL)));
}

function toRewardItem(def: SeasonPassRewardDef, seasonLevel: number): SeasonPassRewardItem {
  return {
    ...def,
    unlocked: seasonLevel >= def.level,
    typeLabelKo: REWARD_TYPE_LABEL[def.type],
  };
}

export function buildSeasonPassView(avatar: PlayerGrowthAvatarDoc): SeasonPassView {
  const seasonXp = projectGrowthDisplayXp(avatar);
  const seasonLevel = seasonLevelFromXp(seasonXp);
  const nextLevelXp =
    seasonLevel >= SEASON_MAX_LEVEL ? null : seasonLevel * SEASON_XP_PER_LEVEL;
  const levelProgress =
    nextLevelXp == null
      ? 100
      : Math.min(100, Math.floor((seasonXp / nextLevelXp) * 100));
  const seasonProgress = Math.min(
    100,
    Math.floor((seasonLevel / SEASON_MAX_LEVEL) * 100)
  );

  const rewardCatalog = SEASON_PASS_REWARD_CATALOG.map((def) =>
    toRewardItem(def, seasonLevel)
  );
  const nextReward =
    rewardCatalog.find((item) => item.level > seasonLevel) ?? null;

  const xpLabel =
    nextLevelXp != null
      ? `${seasonXp} / ${nextLevelXp}`
      : `${seasonXp} (MAX)`;

  const seasonProgressLabel = `${seasonLevel} / ${SEASON_MAX_LEVEL}`;

  return {
    seasonId: SEASON_PASS_ID,
    seasonLabel: SEASON_PASS_LABEL,
    seasonLevel,
    seasonXp,
    nextLevelXp,
    levelProgress,
    seasonProgress,
    xpLabel,
    seasonProgressLabel,
    nextReward,
    rewardCatalog,
  };
}
