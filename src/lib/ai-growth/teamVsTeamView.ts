/**
 * J4-2 — Team vs Team simulation (J4-1 score reuse · sample academy catalog)
 */
import {
  computeContributorMatchScore,
  type MatchOutcome,
} from "@/lib/ai-growth/matchSimulationView";
import type { PlayerGrowthAvatarDoc } from "@/lib/ai-growth/playerGrowthAvatarTypes";

export const TEAM_VS_TEAM_SCHEMA_VERSION = 1 as const;
export const TEAM_VS_TEAM_TOP_N = 5;
export const FIELD_COMMANDER_TEAM_BONUS = 2;
export const SAMPLE_ACADEMY_LABEL = "샘플 아카데미" as const;

const SAMPLE_AVATAR_TEMPLATE = {
  schemaVersion: 2 as const,
  level: 3,
  ovr: 82,
  vision: 84,
  pressure: 84,
  recovery: 70,
  tier: "bronze" as const,
  badges: [] as PlayerGrowthAvatarDoc["badges"],
};

export const SAMPLE_ACADEMY_ROSTER: Array<{
  playerId: string;
  playerName: string;
  avatar: PlayerGrowthAvatarDoc;
}> = Array.from({ length: 5 }, (_, index) => {
  const playerId = `sample-academy-${index + 1}`;
  return {
    playerId,
    playerName: `샘플 ${index + 1}`,
    avatar: {
      ...SAMPLE_AVATAR_TEMPLATE,
      playerId,
      playerName: `샘플 ${index + 1}`,
    },
  };
});

export type TeamVsTeamContributor = {
  playerId: string;
  playerName: string;
  ovr: number;
  matchScore: number;
  badgeTriggers: string[];
};

export type TeamVsTeamLogPayload = {
  schemaVersion: typeof TEAM_VS_TEAM_SCHEMA_VERSION;
  teamId: string;
  mode: "team_vs_team";
  homeTeamLabel: string;
  awayTeamLabel: string;
  homeScore: number;
  awayScore: number;
  outcome: MatchOutcome;
  mvpPlayerId: string;
  mvpPlayerName: string;
  contributionLabels: string[];
  simulatedAt: number;
  teamRandomHome: number;
  teamRandomAway: number;
};

export type TeamVsTeamView = {
  homeTeamLabel: string;
  awayTeamLabel: string;
  homeScore: number;
  awayScore: number;
  outcome: MatchOutcome;
  outcomeLabel: string;
  scoreLabel: string;
  mvpPlayerName: string;
  contributionLabels: string[];
  homeContributors: TeamVsTeamContributor[];
  logPayload: TeamVsTeamLogPayload;
};

type RosterEntry = {
  playerId: string;
  playerName: string;
  avatar: PlayerGrowthAvatarDoc;
};

function sortContributors(entries: Array<RosterEntry & { matchScore: number }>) {
  return [...entries].sort((a, b) => {
    if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
    if (b.avatar.ovr !== a.avatar.ovr) return b.avatar.ovr - a.avatar.ovr;
    return a.playerId.localeCompare(b.playerId);
  });
}

function hasFieldCommander(contributors: RosterEntry[]): boolean {
  return contributors.some((entry) => entry.avatar.badges.includes("field_commander"));
}

function computeTeamScore(
  contributors: RosterEntry[],
  teamRandom: number
): { score: number; contributors: TeamVsTeamContributor[] } {
  const scored = contributors.map((entry) => {
    const result = computeContributorMatchScore(entry.avatar, 0);
    return {
      ...entry,
      matchScore: result.score,
      badgeTriggers: result.triggers,
    };
  });

  const top = sortContributors(scored).slice(0, TEAM_VS_TEAM_TOP_N);
  const playerAvg =
    top.length === 0
      ? 0
      : Math.round(top.reduce((sum, row) => sum + row.matchScore, 0) / top.length);
  const fieldCommanderBonus = hasFieldCommander(top) ? FIELD_COMMANDER_TEAM_BONUS : 0;
  const score = playerAvg + fieldCommanderBonus + teamRandom;

  return {
    score,
    contributors: top.map((row) => ({
      playerId: row.playerId,
      playerName: row.playerName,
      ovr: row.avatar.ovr,
      matchScore: row.matchScore,
      badgeTriggers: row.badgeTriggers,
    })),
  };
}

function resolveOutcome(homeScore: number, awayScore: number): MatchOutcome {
  if (homeScore > awayScore) return "win";
  if (homeScore < awayScore) return "loss";
  return "draw";
}

function outcomeLabelKo(outcome: MatchOutcome, homeTeamLabel: string): string {
  if (outcome === "win") return `${homeTeamLabel} 승리`;
  if (outcome === "loss") return `${homeTeamLabel} 패배`;
  return "무승부";
}

export function buildTeamVsTeamView(input: {
  teamId: string;
  homeTeamLabel: string;
  homeRoster: RosterEntry[];
  awayTeamLabel?: string;
  awayRoster?: RosterEntry[];
  teamRandomHome?: number;
  teamRandomAway?: number;
  simulatedAt?: number;
}): TeamVsTeamView {
  const awayRoster = input.awayRoster ?? SAMPLE_ACADEMY_ROSTER;
  const awayTeamLabel = input.awayTeamLabel ?? SAMPLE_ACADEMY_LABEL;
  const teamRandomHome = input.teamRandomHome ?? 0;
  const teamRandomAway = input.teamRandomAway ?? 0;
  const simulatedAt = input.simulatedAt ?? Date.now();

  const homeResult = computeTeamScore(input.homeRoster, teamRandomHome);
  const awayResult = computeTeamScore(awayRoster, teamRandomAway);
  const outcome = resolveOutcome(homeResult.score, awayResult.score);

  const mvp =
    homeResult.contributors.length > 0
      ? [...homeResult.contributors].sort((a, b) => {
          if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
          if (b.ovr !== a.ovr) return b.ovr - a.ovr;
          return a.playerId.localeCompare(b.playerId);
        })[0]!
      : null;

  const contributionLabels = mvp?.badgeTriggers ?? [];

  const logPayload: TeamVsTeamLogPayload = {
    schemaVersion: TEAM_VS_TEAM_SCHEMA_VERSION,
    teamId: input.teamId,
    mode: "team_vs_team",
    homeTeamLabel: input.homeTeamLabel,
    awayTeamLabel,
    homeScore: homeResult.score,
    awayScore: awayResult.score,
    outcome,
    mvpPlayerId: mvp?.playerId ?? "",
    mvpPlayerName: mvp?.playerName ?? "",
    contributionLabels,
    simulatedAt,
    teamRandomHome,
    teamRandomAway,
  };

  return {
    homeTeamLabel: input.homeTeamLabel,
    awayTeamLabel,
    homeScore: homeResult.score,
    awayScore: awayResult.score,
    outcome,
    outcomeLabel: outcomeLabelKo(outcome, input.homeTeamLabel),
    scoreLabel: `${homeResult.score} : ${awayResult.score}`,
    mvpPlayerName: mvp?.playerName ?? "—",
    contributionLabels,
    homeContributors: homeResult.contributors,
    logPayload,
  };
}

export function randomTeamJitter(): number {
  return Math.floor(Math.random() * 11) - 5;
}
