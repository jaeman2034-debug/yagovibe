/**
 * 🔥 Round-Robin 대진표 생성 유틸리티
 * 
 * 역할:
 * - 팀 목록을 받아서 모든 팀이 한 번씩 경기하는 대진표 생성
 * - 홈/원정 자동 배정
 */

export interface RoundRobinMatch {
  homeTeamId: string;
  awayTeamId: string;
  round: number;
}

/**
 * Round-Robin 대진표 생성
 * 
 * @param teamIds 팀 ID 목록
 * @returns 대진표 (라운드별 경기 목록)
 */
export function generateRoundRobin(teamIds: string[]): RoundRobinMatch[] {
  if (teamIds.length < 2) {
    return [];
  }

  const teams = [...teamIds];
  const matches: RoundRobinMatch[] = [];

  // 홀수 개면 "BYE" 추가 (자동 승 처리)
  if (teams.length % 2 === 1) {
    teams.push("BYE");
  }

  const numTeams = teams.length;
  const numRounds = numTeams - 1;
  const matchesPerRound = numTeams / 2;

  // 각 라운드 생성
  for (let round = 1; round <= numRounds; round++) {
    for (let match = 0; match < matchesPerRound; match++) {
      const home = teams[match];
      const away = teams[numTeams - 1 - match];

      // BYE는 제외
      if (home !== "BYE" && away !== "BYE") {
        matches.push({
          homeTeamId: home,
          awayTeamId: away,
          round,
        });
      }
    }

    // 팀 순서 회전 (첫 번째 팀은 고정, 나머지만 회전)
    teams.splice(1, 0, teams.pop()!);
  }

  return matches;
}

/**
 * Double Round-Robin 생성 (홈/원정 각각 한 번씩)
 */
export function generateDoubleRoundRobin(teamIds: string[]): RoundRobinMatch[] {
  const firstHalf = generateRoundRobin(teamIds);
  const secondHalf = firstHalf.map((match) => ({
    homeTeamId: match.awayTeamId,
    awayTeamId: match.homeTeamId,
    round: match.round + firstHalf.length / (teamIds.length / 2),
  }));

  return [...firstHalf, ...secondHalf];
}
