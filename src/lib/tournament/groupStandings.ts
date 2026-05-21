/**
 * 🔥 조별 성적 관리 (리그+토너먼트 혼합 구조)
 * 
 * 기능:
 * 1. 조별리그 경기 종료 시 자동 순위 계산
 * 2. 본선 진출팀 자동 선별
 * 3. 동률 처리 규칙 적용
 */

import type { GroupStanding, KnockoutQualificationRule } from "@/types/tournament";

/**
 * 조별 성적 업데이트 (경기 결과 반영)
 */
export function updateGroupStanding(
  standing: GroupStanding,
  matchResult: {
    teamId: string;
    goalsFor: number;
    goalsAgainst: number;
    isHome: boolean;
  }
): GroupStanding {
  const { teamId, goalsFor, goalsAgainst } = matchResult;
  
  // 자신의 팀이 아니면 변경 없음
  if (standing.teamId !== teamId) {
    return standing;
  }
  
  // 경기 결과 반영
  const newPlayed = standing.played + 1;
  const newGoalsFor = standing.goalsFor + goalsFor;
  const newGoalsAgainst = standing.goalsAgainst + goalsAgainst;
  const newGoalDifference = newGoalsFor - newGoalsAgainst;
  
  // 승/무/패 계산
  let newWin = standing.win;
  let newDraw = standing.draw;
  let newLoss = standing.loss;
  
  if (goalsFor > goalsAgainst) {
    newWin += 1;
  } else if (goalsFor === goalsAgainst) {
    newDraw += 1;
  } else {
    newLoss += 1;
  }
  
  // 승점 계산 (승 3점, 무 1점)
  const newPoints = newWin * 3 + newDraw;
  
  return {
    ...standing,
    played: newPlayed,
    win: newWin,
    draw: newDraw,
    loss: newLoss,
    goalsFor: newGoalsFor,
    goalsAgainst: newGoalsAgainst,
    goalDifference: newGoalDifference,
    points: newPoints,
  };
}

/**
 * 조별 순위 정렬 (동률 처리 규칙 적용)
 */
export function sortGroupStandings(
  standings: GroupStanding[],
  tiebreakerOrder: KnockoutQualificationRule["tiebreakerOrder"]
): GroupStanding[] {
  const sorted = [...standings];
  
  sorted.sort((a, b) => {
    // 동률 처리 규칙 순서대로 비교
    for (const rule of tiebreakerOrder) {
      let diff = 0;
      
      switch (rule) {
        case "points":
          diff = b.points - a.points; // 승점 높은 순
          break;
        case "goalDifference":
          diff = b.goalDifference - a.goalDifference; // 득실차 큰 순
          break;
        case "goalsFor":
          diff = b.goalsFor - a.goalsFor; // 다득점 순
          break;
        case "headToHead":
          // TODO: 향후 구현 (상대전적)
          diff = 0;
          break;
        case "draw":
          // 추첨 (랜덤, 하지만 동일한 결과를 보장하기 위해 teamId로 결정)
          diff = a.teamId.localeCompare(b.teamId);
          break;
      }
      
      if (diff !== 0) {
        return diff;
      }
    }
    
    // 모든 규칙이 동일하면 teamId로 결정 (안정적 정렬)
    return a.teamId.localeCompare(b.teamId);
  });
  
  // 순위 부여
  sorted.forEach((standing, index) => {
    standing.rank = index + 1;
  });
  
  return sorted;
}

/**
 * 본선 진출팀 자동 선별
 */
export function selectQualifiedTeams(
  groupStandings: Map<string, GroupStanding[]>, // groupId -> standings[]
  qualificationRule: KnockoutQualificationRule
): Array<{
  teamId: string;
  teamName: string;
  groupId: string;
  groupRank: number;
}> {
  const qualifiedTeams: Array<{
    teamId: string;
    teamName: string;
    groupId: string;
    groupRank: number;
  }> = [];
  
  // 각 조에서 상위 N팀 선별
  for (const [groupId, standings] of groupStandings.entries()) {
    // 동률 처리 규칙 적용하여 정렬
    const sorted = sortGroupStandings(standings, qualificationRule.tiebreakerOrder);
    
    // 상위 N팀 선택
    const topTeams = sorted.slice(0, qualificationRule.teamsPerGroup);
    
    for (const team of topTeams) {
      qualifiedTeams.push({
        teamId: team.teamId,
        teamName: team.teamName,
        groupId,
        groupRank: team.rank,
      });
    }
  }
  
  return qualifiedTeams;
}

/**
 * 조별리그 완료 여부 확인
 */
export function isGroupLeagueCompleted(
  groupStandings: Map<string, GroupStanding[]>,
  expectedMatchesPerTeam: number // 조 내 팀 수 - 1 (단일 라운드 로빈)
): boolean {
  for (const standings of groupStandings.values()) {
    for (const standing of standings) {
      // 모든 팀이 예상 경기 수를 완료했는지 확인
      if (standing.played < expectedMatchesPerTeam) {
        return false;
      }
    }
  }
  return true;
}

