/**
 * J4-3 — Academy League Round Robin (J4-2 Team vs Team reuse)
 */
import { buildTeamVsTeamView } from "@/lib/ai-growth/teamVsTeamView";
import type { PlayerGrowthAvatarDoc } from "@/lib/ai-growth/playerGrowthAvatarTypes";

export const ACADEMY_LEAGUE_ID = "academy-league-season-1" as const;
export const ACADEMY_LEAGUE_LABEL = "Academy League" as const;
export const ACADEMY_LEAGUE_SEASON_LABEL = "Season 1" as const;

export const LEAGUE_POINTS_WIN = 3;
export const LEAGUE_POINTS_DRAW = 1;
export const LEAGUE_POINTS_LOSS = 0;

export const ACADEMY_LEAGUE_SCHEMA_VERSION = 1 as const;

type RosterEntry = {
  playerId: string;
  playerName: string;
  avatar: PlayerGrowthAvatarDoc;
};

type LeagueTeamDef = {
  id: string;
  label: string;
  roster: RosterEntry[];
  isHomeTeam: boolean;
};

export type AcademyLeagueStandingRow = {
  rank: number;
  teamId: string;
  teamLabel: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  isHomeTeam: boolean;
};

export type AcademyLeagueLogPayload = {
  schemaVersion: typeof ACADEMY_LEAGUE_SCHEMA_VERSION;
  teamId: string;
  leagueId: string;
  standings: AcademyLeagueStandingRow[];
  simulatedAt: number;
};

export type AcademyLeagueView = {
  leagueId: string;
  leagueLabel: string;
  seasonLabel: string;
  standings: AcademyLeagueStandingRow[];
  homeRank: number;
  homePoints: number;
  homeRankLabel: string;
  matchCount: number;
  logPayload: AcademyLeagueLogPayload;
};

function buildCatalogRoster(
  teamId: string,
  label: string,
  ovrBase: number
): RosterEntry[] {
  return Array.from({ length: 5 }, (_, index) => {
    const playerId = `${teamId}-p${index + 1}`;
    const ovr = ovrBase - index;
    return {
      playerId,
      playerName: `${label} ${index + 1}`,
      avatar: {
        schemaVersion: 2,
        playerId,
        playerName: `${label} ${index + 1}`,
        level: 3,
        ovr,
        vision: ovr + 2,
        pressure: ovr + 2,
        recovery: 70,
        tier: "bronze",
        badges: [],
      },
    };
  });
}

/** Pilot deterministic fixture randoms (teamId pair · sorted ids joined) */
const PILOT_FIXTURE_RANDOMS: Record<string, { home: number; away: number }> = {
  "home|sample-a": { home: -1, away: 0 },
  "home|sample-b": { home: -1, away: 0 },
  "home|sample-c": { home: -8, away: 1 },
  "sample-a|sample-b": { home: 0, away: -2 },
  "sample-a|sample-c": { home: -1, away: 0 },
  "sample-b|sample-c": { home: 1, away: -1 },
};

function fixtureKey(teamAId: string, teamBId: string): string {
  const [a, b] = [teamAId, teamBId].sort();
  return `${a}|${b}`;
}

function resolveFixtureRandoms(
  teamAId: string,
  teamBId: string,
  pilotDeterministic: boolean
): { home: number; away: number } {
  if (!pilotDeterministic) {
    return { home: 0, away: 0 };
  }
  const key = fixtureKey(teamAId, teamBId);
  const entry = PILOT_FIXTURE_RANDOMS[key];
  if (!entry) return { home: 0, away: 0 };
  if (teamAId < teamBId) return entry;
  return { home: entry.away, away: entry.home };
}

function buildLeagueTeams(
  homeTeamLabel: string,
  homeRoster: RosterEntry[]
): LeagueTeamDef[] {
  return [
    {
      id: "home",
      label: homeTeamLabel,
      roster: homeRoster,
      isHomeTeam: true,
    },
    {
      id: "sample-a",
      label: "샘플 아카데미 A",
      roster: buildCatalogRoster("sample-a", "A", 82),
      isHomeTeam: false,
    },
    {
      id: "sample-b",
      label: "샘플 아카데미 B",
      roster: buildCatalogRoster("sample-b", "B", 80),
      isHomeTeam: false,
    },
    {
      id: "sample-c",
      label: "샘플 아카데미 C",
      roster: buildCatalogRoster("sample-c", "C", 81),
      isHomeTeam: false,
    },
  ];
}

function sortStandings(rows: AcademyLeagueStandingRow[]): AcademyLeagueStandingRow[] {
  const sorted = [...rows].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    if (b.wins !== a.wins) return b.wins - a.wins;
    return a.teamLabel.localeCompare(b.teamLabel);
  });
  return sorted.map((row, index) => ({ ...row, rank: index + 1 }));
}

export function buildAcademyLeagueView(input: {
  teamId: string;
  homeTeamLabel: string;
  homeRoster: RosterEntry[];
  pilotDeterministic?: boolean;
  simulatedAt?: number;
}): AcademyLeagueView {
  const teams = buildLeagueTeams(input.homeTeamLabel, input.homeRoster);
  const stats = new Map<
    string,
    Omit<AcademyLeagueStandingRow, "rank" | "goalDifference">
  >();

  for (const team of teams) {
    stats.set(team.id, {
      teamId: team.id,
      teamLabel: team.label,
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      points: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      isHomeTeam: team.isHomeTeam,
    });
  }

  let matchCount = 0;
  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      const homeTeam = teams[i]!;
      const awayTeam = teams[j]!;
      const randoms = resolveFixtureRandoms(
        homeTeam.id,
        awayTeam.id,
        input.pilotDeterministic ?? false
      );
      const match = buildTeamVsTeamView({
        teamId: input.teamId,
        homeTeamLabel: homeTeam.label,
        homeRoster: homeTeam.roster,
        awayTeamLabel: awayTeam.label,
        awayRoster: awayTeam.roster,
        teamRandomHome: randoms.home,
        teamRandomAway: randoms.away,
        simulatedAt: input.simulatedAt,
      });
      matchCount += 1;

      const homeStat = stats.get(homeTeam.id)!;
      const awayStat = stats.get(awayTeam.id)!;

      homeStat.played += 1;
      awayStat.played += 1;
      homeStat.goalsFor += match.homeScore;
      homeStat.goalsAgainst += match.awayScore;
      awayStat.goalsFor += match.awayScore;
      awayStat.goalsAgainst += match.homeScore;

      if (match.homeScore > match.awayScore) {
        homeStat.wins += 1;
        homeStat.points += LEAGUE_POINTS_WIN;
        awayStat.losses += 1;
      } else if (match.homeScore < match.awayScore) {
        awayStat.wins += 1;
        awayStat.points += LEAGUE_POINTS_WIN;
        homeStat.losses += 1;
      } else {
        homeStat.draws += 1;
        awayStat.draws += 1;
        homeStat.points += LEAGUE_POINTS_DRAW;
        awayStat.points += LEAGUE_POINTS_DRAW;
      }
    }
  }

  const standings = sortStandings(
    [...stats.values()].map((row) => ({
      ...row,
      rank: 0,
      goalDifference: row.goalsFor - row.goalsAgainst,
    }))
  );

  const homeRow = standings.find((row) => row.isHomeTeam);
  const simulatedAt = input.simulatedAt ?? Date.now();

  const logPayload: AcademyLeagueLogPayload = {
    schemaVersion: ACADEMY_LEAGUE_SCHEMA_VERSION,
    teamId: input.teamId,
    leagueId: ACADEMY_LEAGUE_ID,
    standings,
    simulatedAt,
  };

  return {
    leagueId: ACADEMY_LEAGUE_ID,
    leagueLabel: ACADEMY_LEAGUE_LABEL,
    seasonLabel: ACADEMY_LEAGUE_SEASON_LABEL,
    standings,
    homeRank: homeRow?.rank ?? 0,
    homePoints: homeRow?.points ?? 0,
    homeRankLabel: homeRow ? `리그 ${homeRow.rank}위 · ${homeRow.points}pts` : "—",
    matchCount,
    logPayload,
  };
}

/** Smoke / tests — pilot 홍 선수 roster */
export function buildPilotHomeRoster(): RosterEntry[] {
  return [
    {
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
    },
  ];
}
