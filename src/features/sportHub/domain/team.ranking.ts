/**
 * 🔥 Team Ranking - 팀 랭킹 시스템
 * 
 * 팀 레벨 자동, MVP 배지, 지역 랭킹
 */

import type { Team } from "./team.types";
import type { Region } from "./region.types";

/**
 * 팀 레벨 계산
 */
export function calculateTeamLevel(team: Team): Team["level"] {
  const { wins, totalMatches } = team.stats;
  
  if (totalMatches === 0) {
    return "beginner";
  }
  
  const winRate = wins / totalMatches;
  
  if (winRate >= 0.6 && totalMatches >= 10) {
    return "pro";
  } else if (winRate >= 0.4 || totalMatches >= 5) {
    return "normal";
  } else {
    return "beginner";
  }
}

/**
 * 팀 통계 업데이트 (경기 결과 반영)
 */
export function updateTeamStats(
  team: Team,
  isWin: boolean,
  isDraw: boolean,
  goalsFor: number,
  goalsAgainst: number
): Team {
  const stats = {
    ...team.stats,
    totalMatches: team.stats.totalMatches + 1,
    wins: team.stats.wins + (isWin ? 1 : 0),
    draws: team.stats.draws + (isDraw ? 1 : 0),
    losses: team.stats.losses + (!isWin && !isDraw ? 1 : 0),
    goalsFor: team.stats.goalsFor + goalsFor,
    goalsAgainst: team.stats.goalsAgainst + goalsAgainst,
  };
  
  // 레벨 재계산
  const level = calculateTeamLevel({ ...team, stats });
  
  return {
    ...team,
    stats,
    level,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * 지역별 팀 랭킹
 */
export type RegionalTeamRanking = {
  teamId: string;
  teamName: string;
  level: Team["level"];
  stats: Team["stats"];
  winRate: number;
  rank: number;
};

/**
 * 지역별 팀 랭킹 계산
 */
export function calculateRegionalRanking(
  teams: Team[],
  region: Region
): RegionalTeamRanking[] {
  const regionalTeams = teams.filter((t) => t.region === region);
  
  const rankings: RegionalTeamRanking[] = regionalTeams.map((team) => {
    const winRate =
      team.stats.totalMatches > 0
        ? team.stats.wins / team.stats.totalMatches
        : 0;
    
    return {
      teamId: team.id,
      teamName: team.name,
      level: team.level,
      stats: team.stats,
      winRate,
      rank: 0, // 정렬 후 설정
    };
  });
  
  // 정렬: 레벨 → 승률 → 총 경기 수
  rankings.sort((a, b) => {
    const levelOrder: Record<Team["level"], number> = {
      pro: 3,
      normal: 2,
      beginner: 1,
    };
    
    if (levelOrder[b.level] !== levelOrder[a.level]) {
      return levelOrder[b.level] - levelOrder[a.level];
    }
    
    if (b.winRate !== a.winRate) {
      return b.winRate - a.winRate;
    }
    
    return b.stats.totalMatches - a.stats.totalMatches;
  });
  
  // 순위 설정
  rankings.forEach((r, index) => {
    r.rank = index + 1;
  });
  
  return rankings;
}
