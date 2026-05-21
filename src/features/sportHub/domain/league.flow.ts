/**
 * 🔥 League Flow - 리그 플로우
 * 
 * 리그 생성 → 팀 등록 → 경기 일정 → 결과 입력 → 랭킹
 */

import type { League, Match, LeagueRanking } from "./league.types";
import type { Team } from "./team.types";

/**
 * 리그 생성
 */
export function createLeague(
  name: string,
  region: string,
  season: string,
  organizerId: string,
  startDate: string
): Omit<League, "id" | "createdAt" | "updatedAt"> {
  return {
    region: region as any,
    name,
    season,
    type: "league",
    teams: [],
    matches: [],
    status: "READY",
    startDate,
    organizerId,
  };
}

/**
 * 팀 등록
 */
export function registerTeamToLeague(
  league: League,
  teamId: string
): League {
  // 이미 등록된 팀인지 확인
  if (league.teams.includes(teamId)) {
    return league;
  }
  
  return {
    ...league,
    teams: [...league.teams, teamId],
    updatedAt: new Date().toISOString(),
  };
}

/**
 * 경기 일정 생성
 */
export function createMatch(
  leagueId: string,
  homeTeamId: string,
  awayTeamId: string,
  groundId: string,
  scheduledAt: string
): Omit<Match, "id" | "createdAt" | "updatedAt"> {
  return {
    leagueId,
    homeTeamId,
    awayTeamId,
    groundId,
    scheduledAt,
    status: "scheduled",
  };
}

/**
 * 경기 결과 입력
 */
export function recordMatchResult(
  match: Match,
  homeScore: number,
  awayScore: number
): Match {
  const isDraw = homeScore === awayScore;
  const winner = isDraw ? undefined : homeScore > awayScore ? "home" : "away";
  
  return {
    ...match,
    status: "completed",
    result: {
      home: homeScore,
      away: awayScore,
      isDraw,
      winner,
    },
    updatedAt: new Date().toISOString(),
  };
}

/**
 * 리그 랭킹 계산
 */
export function calculateLeagueRanking(
  league: League,
  teams: Team[]
): LeagueRanking[] {
  const rankings: LeagueRanking[] = [];
  
  for (const teamId of league.teams) {
    const team = teams.find((t) => t.id === teamId);
    if (!team) continue;
    
    // 해당 팀의 경기 결과 집계
    const teamMatches = league.matches.filter(
      (m) =>
        (m.homeTeamId === teamId || m.awayTeamId === teamId) &&
        m.status === "completed" &&
        m.result
    );
    
    let wins = 0;
    let draws = 0;
    let losses = 0;
    let goalsFor = 0;
    let goalsAgainst = 0;
    
    for (const match of teamMatches) {
      if (!match.result) continue;
      
      const isHome = match.homeTeamId === teamId;
      const teamScore = isHome ? match.result.home : match.result.away;
      const opponentScore = isHome ? match.result.away : match.result.home;
      
      goalsFor += teamScore;
      goalsAgainst += opponentScore;
      
      if (match.result.isDraw) {
        draws++;
      } else if (match.result.winner === (isHome ? "home" : "away")) {
        wins++;
      } else {
        losses++;
      }
    }
    
    const played = wins + draws + losses;
    const points = wins * 3 + draws;
    const goalDifference = goalsFor - goalsAgainst;
    
    rankings.push({
      teamId,
      teamName: team.name,
      played,
      wins,
      draws,
      losses,
      goalsFor,
      goalsAgainst,
      points,
      goalDifference,
      rank: 0, // 정렬 후 설정
    });
  }
  
  // 정렬: 승점 → 골득실 → 다득점
  rankings.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    return b.goalsFor - a.goalsFor;
  });
  
  // 순위 설정
  rankings.forEach((r, index) => {
    r.rank = index + 1;
  });
  
  return rankings;
}

/**
 * 리그 상태 업데이트
 */
export function updateLeagueStatus(
  league: League,
  status: League["status"]
): League {
  return {
    ...league,
    status,
    updatedAt: new Date().toISOString(),
  };
}
