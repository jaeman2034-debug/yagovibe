/**
 * J4-4 — Transfer Market projection (growth → market value)
 */
import { buildAcademyLeagueView } from "@/lib/ai-growth/academyLeagueView";
import { buildSeasonPassView } from "@/lib/ai-growth/seasonPassView";
import { buildTeamAvatarRankingView } from "@/lib/ai-growth/teamAvatarRankingView";
import type { PlayerGrowthAvatarDoc, GrowthBadgeId } from "@/lib/ai-growth/playerGrowthAvatarTypes";

export const TRANSFER_MARKET_SCHEMA_VERSION = 1 as const;
export const TRANSFER_MARKET_LABEL = "Transfer Market" as const;

export const TRANSFER_MARKET_VALUE_OVR = 100;
export const TRANSFER_MARKET_VALUE_LEVEL = 500;
export const TRANSFER_MARKET_VALUE_BADGE = 200;
export const TRANSFER_MARKET_VALUE_SEASON_LEVEL = 50;

export const TRANSFER_MARKET_RECOMMENDATION_TOP_N = 3;

export type TransferMarketGrade = "S" | "A" | "B" | "C" | "D";

export type TransferMarketCatalogEntry = {
  playerId: string;
  playerName: string;
  ovr: number;
  level: number;
  badgeIds: GrowthBadgeId[];
  seasonLevel: number;
};

export const TRANSFER_MARKET_CATALOG: TransferMarketCatalogEntry[] = [
  {
    playerId: "market-prospect-1",
    playerName: "샘플 유망주 김",
    ovr: 78,
    level: 3,
    badgeIds: ["vision_reader"],
    seasonLevel: 20,
  },
  {
    playerId: "market-sniper-1",
    playerName: "샘플 스나이퍼 박",
    ovr: 83,
    level: 5,
    badgeIds: ["vision_reader", "pressure_breaker"],
    seasonLevel: 25,
  },
  {
    playerId: "market-veteran-1",
    playerName: "샘플 베테랑 이",
    ovr: 80,
    level: 6,
    badgeIds: [],
    seasonLevel: 30,
  },
];

export type TransferMarketRecommendation = {
  playerId: string;
  playerName: string;
  marketValue: number;
  grade: TransferMarketGrade;
  gradeLabelKo: string;
  prospectLabel: string;
};

export type TransferMarketLogPayload = {
  schemaVersion: typeof TRANSFER_MARKET_SCHEMA_VERSION;
  teamId: string;
  focusPlayerId: string;
  focusPlayerName: string;
  marketValue: number;
  grade: TransferMarketGrade;
  gradeLabelKo: string;
  prospectLabel: string;
  transferProposalLabel: string;
  recommendations: TransferMarketRecommendation[];
  inputs: {
    ovr: number;
    level: number;
    badgeCount: number;
    seasonLevel: number;
    teamRank: number | null;
    leagueRank: number | null;
  };
  simulatedAt: number;
};

export type TransferMarketView = {
  focusPlayerId: string;
  focusPlayerName: string;
  marketValue: number;
  marketValueLabel: string;
  grade: TransferMarketGrade;
  gradeLabelKo: string;
  prospectLabel: string;
  teamRankLabel: string | null;
  leagueRankLabel: string | null;
  transferProposalLabel: string;
  recommendations: TransferMarketRecommendation[];
  logPayload: TransferMarketLogPayload;
};

type RosterEntry = {
  playerId: string;
  playerName: string;
  avatar: PlayerGrowthAvatarDoc;
};

const GRADE_THRESHOLDS: Array<{ grade: TransferMarketGrade; min: number; labelKo: string }> = [
  { grade: "S", min: 15000, labelKo: "프리미어" },
  { grade: "A", min: 12000, labelKo: "적극 영입" },
  { grade: "B", min: 9000, labelKo: "관심" },
  { grade: "C", min: 6000, labelKo: "보류" },
  { grade: "D", min: 0, labelKo: "비추천" },
];

export function computeMarketValue(input: {
  ovr: number;
  level: number;
  badgeCount: number;
  seasonLevel: number;
}): number {
  return (
    input.ovr * TRANSFER_MARKET_VALUE_OVR +
    input.level * TRANSFER_MARKET_VALUE_LEVEL +
    input.badgeCount * TRANSFER_MARKET_VALUE_BADGE +
    input.seasonLevel * TRANSFER_MARKET_VALUE_SEASON_LEVEL
  );
}

export function formatMarketValueLabel(marketValue: number): string {
  return marketValue.toLocaleString("en-US");
}

export function resolveTransferGrade(marketValue: number): {
  grade: TransferMarketGrade;
  gradeLabelKo: string;
} {
  for (const row of GRADE_THRESHOLDS) {
    if (marketValue >= row.min) {
      return { grade: row.grade, gradeLabelKo: row.labelKo };
    }
  }
  return { grade: "D", gradeLabelKo: "비추천" };
}

export function resolveProspectLabel(level: number, ovr: number): string {
  if (level <= 4 && ovr >= 80) return "유망주 ⭐";
  if (level >= 5 && ovr >= 82) return "안정형 🛡️";
  return "성장형 📈";
}

function toRecommendation(entry: TransferMarketCatalogEntry): TransferMarketRecommendation {
  const marketValue = computeMarketValue({
    ovr: entry.ovr,
    level: entry.level,
    badgeCount: entry.badgeIds.length,
    seasonLevel: entry.seasonLevel,
  });
  const { grade, gradeLabelKo } = resolveTransferGrade(marketValue);
  return {
    playerId: entry.playerId,
    playerName: entry.playerName,
    marketValue,
    grade,
    gradeLabelKo,
    prospectLabel: resolveProspectLabel(entry.level, entry.ovr),
  };
}

function buildCatalogRecommendations(): TransferMarketRecommendation[] {
  return [...TRANSFER_MARKET_CATALOG]
    .map((entry) => toRecommendation(entry))
    .sort((a, b) => {
      if (b.marketValue !== a.marketValue) return b.marketValue - a.marketValue;
      return a.playerId.localeCompare(b.playerId);
    })
    .slice(0, TRANSFER_MARKET_RECOMMENDATION_TOP_N);
}

function resolveTransferProposalLabel(
  focusMarketValue: number,
  recommendations: TransferMarketRecommendation[]
): string {
  const topCatalog = recommendations[0];
  if (!topCatalog) return "현재 포커스 선수 유지 권장";
  if (focusMarketValue < topCatalog.marketValue) {
    return `${topCatalog.playerName} 영입 제안 · MV ${formatMarketValueLabel(topCatalog.marketValue)}`;
  }
  return "현재 포커스 선수 유지 권장";
}

export function buildTransferMarketView(input: {
  teamId: string;
  focusPlayer: RosterEntry;
  homeTeamLabel: string;
  homeRoster: RosterEntry[];
  pilotDeterministic?: boolean;
  simulatedAt?: number;
}): TransferMarketView {
  const avatar = input.focusPlayer.avatar;
  const seasonPass = buildSeasonPassView(avatar);
  const badgeCount = avatar.badges.length;
  const marketValue = computeMarketValue({
    ovr: avatar.ovr,
    level: avatar.level,
    badgeCount,
    seasonLevel: seasonPass.seasonLevel,
  });
  const { grade, gradeLabelKo } = resolveTransferGrade(marketValue);
  const prospectLabel = resolveProspectLabel(avatar.level, avatar.ovr);

  const rankingAvatars = input.homeRoster.map((entry) => ({
    playerId: entry.playerId,
    playerName: entry.playerName,
    avatar: entry.avatar,
    timeline: null,
  }));
  const teamRanking =
    rankingAvatars.length > 0
      ? buildTeamAvatarRankingView({
          teamName: input.homeTeamLabel,
          avatars: rankingAvatars,
          focusPlayerId: input.focusPlayer.playerId,
        })
      : null;

  const leagueView =
    input.homeRoster.length > 0
      ? buildAcademyLeagueView({
          teamId: input.teamId,
          homeTeamLabel: input.homeTeamLabel,
          homeRoster: input.homeRoster,
          pilotDeterministic: input.pilotDeterministic ?? false,
          simulatedAt: input.simulatedAt,
        })
      : null;

  const teamRank = teamRanking?.focusPlayer?.rank ?? null;
  const leagueRank = leagueView?.homeRank ?? null;
  const teamRankLabel = teamRank === 1 ? "팀 랭킹 #1" : null;
  const leagueRankLabel = leagueRank === 1 ? "리그 1위 아카데미" : null;

  const recommendations = buildCatalogRecommendations();
  const transferProposalLabel = resolveTransferProposalLabel(marketValue, recommendations);
  const simulatedAt = input.simulatedAt ?? Date.now();

  const logPayload: TransferMarketLogPayload = {
    schemaVersion: TRANSFER_MARKET_SCHEMA_VERSION,
    teamId: input.teamId,
    focusPlayerId: input.focusPlayer.playerId,
    focusPlayerName: input.focusPlayer.playerName,
    marketValue,
    grade,
    gradeLabelKo,
    prospectLabel,
    transferProposalLabel,
    recommendations,
    inputs: {
      ovr: avatar.ovr,
      level: avatar.level,
      badgeCount,
      seasonLevel: seasonPass.seasonLevel,
      teamRank,
      leagueRank,
    },
    simulatedAt,
  };

  return {
    focusPlayerId: input.focusPlayer.playerId,
    focusPlayerName: input.focusPlayer.playerName,
    marketValue,
    marketValueLabel: formatMarketValueLabel(marketValue),
    grade,
    gradeLabelKo,
    prospectLabel,
    teamRankLabel,
    leagueRankLabel,
    transferProposalLabel,
    recommendations,
    logPayload,
  };
}

/** Smoke / tests — pilot 홍 선수 */
export function buildPilotFocusPlayer(): RosterEntry {
  return {
    playerId: "hong",
    playerName: "홍 선수",
    avatar: {
      schemaVersion: 2,
      playerId: "hong",
      playerName: "홍 선수",
      level: 4,
      ovr: 85,
      vision: 88,
      pressure: 88,
      recovery: 74,
      tier: "gold",
      badges: ["vision_reader", "pressure_breaker", "field_commander"],
    },
  };
}
