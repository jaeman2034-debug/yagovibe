/**
 * J4-1 — Avatar Match Simulation (read-only engine + view)
 */
import { badgeMetaById } from "@/lib/ai-growth/avatarGrowthEngine";
import type { GrowthBadgeId, PlayerGrowthAvatarDoc } from "@/lib/ai-growth/playerGrowthAvatarTypes";

export const MATCH_SIMULATION_SCHEMA_VERSION = 1 as const;
export const MATCH_RANDOM_MIN = -5;
export const MATCH_RANDOM_MAX = 5;

export const SAMPLE_OPPONENT_ID = "sample-opponent" as const;
export const SAMPLE_OPPONENT_NAME = "샘플 선수" as const;

export const SAMPLE_OPPONENT_AVATAR: PlayerGrowthAvatarDoc = {
  schemaVersion: 2,
  playerId: SAMPLE_OPPONENT_ID,
  playerName: SAMPLE_OPPONENT_NAME,
  level: 3,
  ovr: 87,
  vision: 82,
  pressure: 82,
  recovery: 72,
  tier: "bronze",
  badges: [],
};

export type MatchOutcome = "win" | "draw" | "loss";

export type AvatarMatchSide = {
  playerId: string;
  playerName: string;
  ovr: number;
  vision: number;
  pressure: number;
  recovery: number;
  level: number;
  matchScore: number;
  badgeTriggers: string[];
};

export type MatchSimulationLogPayload = {
  schemaVersion: typeof MATCH_SIMULATION_SCHEMA_VERSION;
  teamId: string;
  mode: "1v1";
  homePlayerId: string;
  awayPlayerId: string;
  homeScore: number;
  awayScore: number;
  outcome: MatchOutcome;
  triggers: string[];
  simulatedAt: number;
  randomHome: number;
  randomAway: number;
};

export type AvatarMatchSimulationView = {
  mode: "1v1";
  home: AvatarMatchSide;
  away: AvatarMatchSide;
  outcome: MatchOutcome;
  outcomeLabel: string;
  scoreLabel: string;
  triggerLabels: string[];
  logPayload: MatchSimulationLogPayload;
};

type EffectiveStats = {
  vision: number;
  pressure: number;
  teamBonus: number;
  triggers: string[];
};

function triggerLabel(badgeId: GrowthBadgeId): string {
  return `${badgeMetaById(badgeId).labelKo} 발동`;
}

export function applyMatchBadgeBonuses(avatar: PlayerGrowthAvatarDoc): EffectiveStats {
  const badgeSet = new Set(avatar.badges);
  let vision = avatar.vision;
  let pressure = avatar.pressure;
  let teamBonus = 0;
  const triggers: string[] = [];

  if (badgeSet.has("vision_reader")) {
    vision += 2;
    triggers.push(triggerLabel("vision_reader"));
  }
  if (badgeSet.has("pressure_breaker")) {
    pressure += 2;
    triggers.push(triggerLabel("pressure_breaker"));
  }
  if (badgeSet.has("field_commander")) {
    teamBonus += 2;
    triggers.push(triggerLabel("field_commander"));
  }

  return { vision, pressure, teamBonus, triggers };
}

export function computeStatBase(
  avatar: PlayerGrowthAvatarDoc,
  effectiveVision: number,
  effectivePressure: number
): number {
  return (
    avatar.ovr * 0.5 +
    effectiveVision * 0.2 +
    effectivePressure * 0.2 +
    avatar.recovery * 0.1
  );
}

export function computeMatchScore(
  avatar: PlayerGrowthAvatarDoc,
  random: number
): { score: number; triggers: string[]; effective: EffectiveStats } {
  const effective = applyMatchBadgeBonuses(avatar);
  const statBase = computeStatBase(avatar, effective.vision, effective.pressure);
  const score = Math.round(statBase + effective.teamBonus + random);
  return { score, triggers: effective.triggers, effective };
}

/** J4-2 — contributor score (Field Commander 팀 보너스는 팀 집계에서만) */
export function computeContributorMatchScore(
  avatar: PlayerGrowthAvatarDoc,
  random = 0
): { score: number; triggers: string[] } {
  const effective = applyMatchBadgeBonuses(avatar);
  const hasFieldCommander = avatar.badges.includes("field_commander");
  const playerTeamBonus = hasFieldCommander ? 0 : effective.teamBonus;
  const statBase = computeStatBase(avatar, effective.vision, effective.pressure);
  return {
    score: Math.round(statBase + playerTeamBonus + random),
    triggers: effective.triggers,
  };
}

function resolveOutcome(homeScore: number, awayScore: number): MatchOutcome {
  if (homeScore > awayScore) return "win";
  if (homeScore < awayScore) return "loss";
  return "draw";
}

function outcomeLabelKo(outcome: MatchOutcome, homeName: string): string {
  if (outcome === "win") return `${homeName} 승리`;
  if (outcome === "loss") return `${homeName} 패배`;
  return "무승부";
}

export function buildAvatarMatchSimulationView(input: {
  teamId: string;
  home: { playerId: string; playerName: string; avatar: PlayerGrowthAvatarDoc };
  away: { playerId: string; playerName: string; avatar: PlayerGrowthAvatarDoc };
  randomHome?: number;
  randomAway?: number;
  simulatedAt?: number;
}): AvatarMatchSimulationView {
  const randomHome = input.randomHome ?? 0;
  const randomAway = input.randomAway ?? 0;
  const homeResult = computeMatchScore(input.home.avatar, randomHome);
  const awayResult = computeMatchScore(input.away.avatar, randomAway);
  const outcome = resolveOutcome(homeResult.score, awayResult.score);
  const triggerLabels = [...new Set([...homeResult.triggers, ...awayResult.triggers])];
  const simulatedAt = input.simulatedAt ?? Date.now();

  const logPayload: MatchSimulationLogPayload = {
    schemaVersion: MATCH_SIMULATION_SCHEMA_VERSION,
    teamId: input.teamId,
    mode: "1v1",
    homePlayerId: input.home.playerId,
    awayPlayerId: input.away.playerId,
    homeScore: homeResult.score,
    awayScore: awayResult.score,
    outcome,
    triggers: triggerLabels,
    simulatedAt,
    randomHome,
    randomAway,
  };

  return {
    mode: "1v1",
    home: {
      playerId: input.home.playerId,
      playerName: input.home.playerName,
      ovr: input.home.avatar.ovr,
      vision: input.home.avatar.vision,
      pressure: input.home.avatar.pressure,
      recovery: input.home.avatar.recovery,
      level: input.home.avatar.level,
      matchScore: homeResult.score,
      badgeTriggers: homeResult.triggers,
    },
    away: {
      playerId: input.away.playerId,
      playerName: input.away.playerName,
      ovr: input.away.avatar.ovr,
      vision: input.away.avatar.vision,
      pressure: input.away.avatar.pressure,
      recovery: input.away.avatar.recovery,
      level: input.away.avatar.level,
      matchScore: awayResult.score,
      badgeTriggers: awayResult.triggers,
    },
    outcome,
    outcomeLabel: outcomeLabelKo(outcome, input.home.playerName),
    scoreLabel: `${homeResult.score} vs ${awayResult.score}`,
    triggerLabels,
    logPayload,
  };
}

export function randomMatchJitter(): number {
  return Math.floor(Math.random() * (MATCH_RANDOM_MAX - MATCH_RANDOM_MIN + 1)) + MATCH_RANDOM_MIN;
}

export function pickAwayOpponentFromRanking(
  focusPlayerId: string,
  rows: Array<{ playerId: string; playerName: string; ovr: number }>,
  avatarMap: Record<string, PlayerGrowthAvatarDoc>
): { playerId: string; playerName: string; avatar: PlayerGrowthAvatarDoc } | null {
  const opponent = rows.find((row) => row.playerId !== focusPlayerId && avatarMap[row.playerId]);
  if (!opponent) return null;
  return {
    playerId: opponent.playerId,
    playerName: opponent.playerName,
    avatar: avatarMap[opponent.playerId]!,
  };
}
