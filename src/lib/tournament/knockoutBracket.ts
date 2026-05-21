/**
 * 🔥 토너먼트 대진 자동 생성 (리그+토너먼트 혼합 구조)
 * 
 * 규칙:
 * - 같은 조 1·2위는 첫 경기에서 만나지 않음
 * - A조 1위 vs B조 2위, B조 1위 vs A조 2위
 */

import type { Match } from "@/types/tournament";

export interface QualifiedTeam {
  teamId: string;
  teamName: string;
  groupId: string;
  groupRank: number; // 1 = 1위, 2 = 2위
}

export interface KnockoutMatch {
  id: string;
  round: number; // 1 = 16강, 2 = 8강, 3 = 4강, 4 = 결승
  matchNumber: number; // 라운드 내 경기 번호
  homeTeam: QualifiedTeam | null;
  awayTeam: QualifiedTeam | null;
  winnerRef?: string; // 다음 라운드 참조 (예: "round2_match1")
  status: "scheduled" | "in_progress" | "completed";
}

/**
 * 토너먼트 대진 생성 (같은 조 회피 규칙 적용)
 */
export function generateKnockoutBracket(
  qualifiedTeams: QualifiedTeam[],
  avoidSameGroup: boolean = true
): KnockoutMatch[] {
  // 1위팀과 2위팀 분리
  const winners = qualifiedTeams.filter((t) => t.groupRank === 1);
  const runnersUp = qualifiedTeams.filter((t) => t.groupRank === 2);
  
  // 조 개수 확인
  const groupCount = Math.max(
    ...qualifiedTeams.map((t) => parseInt(t.groupId.replace(/[^0-9]/g, "")) || 0)
  );
  
  // 브라켓 크기 계산 (2^n)
  const bracketSize = Math.pow(2, Math.ceil(Math.log2(qualifiedTeams.length)));
  
  // 부족한 팀은 BYE 처리
  const byeCount = bracketSize - qualifiedTeams.length;
  
  const matches: KnockoutMatch[] = [];
  let matchIdCounter = 1;
  
  // 1라운드 대진 생성
  if (avoidSameGroup) {
    // 같은 조 회피 규칙 적용
    // A조 1위 vs B조 2위, B조 1위 vs A조 2위 패턴
    
    // 조별로 그룹화
    const winnersByGroup = new Map<string, QualifiedTeam[]>();
    const runnersUpByGroup = new Map<string, QualifiedTeam[]>();
    
    for (const team of winners) {
      if (!winnersByGroup.has(team.groupId)) {
        winnersByGroup.set(team.groupId, []);
      }
      winnersByGroup.get(team.groupId)!.push(team);
    }
    
    for (const team of runnersUp) {
      if (!runnersUpByGroup.has(team.groupId)) {
        runnersUpByGroup.set(team.groupId, []);
      }
      runnersUpByGroup.get(team.groupId)!.push(team);
    }
    
    // 조 순서대로 매칭 (A조 1위 vs B조 2위, B조 1위 vs A조 2위)
    const groupIds = Array.from(winnersByGroup.keys()).sort();
    
    for (let i = 0; i < groupIds.length; i++) {
      const currentGroupId = groupIds[i];
      const nextGroupId = groupIds[(i + 1) % groupIds.length];
      
      const currentWinner = winnersByGroup.get(currentGroupId)?.[0];
      const nextRunnerUp = runnersUpByGroup.get(nextGroupId)?.[0];
      
      if (currentWinner && nextRunnerUp) {
        matches.push({
          id: `round1_match${matchIdCounter++}`,
          round: 1,
          matchNumber: matchIdCounter - 1,
          homeTeam: currentWinner,
          awayTeam: nextRunnerUp,
          winnerRef: `round2_match${Math.ceil(matchIdCounter / 2)}`,
          status: "scheduled",
        });
      }
    }
    
    // 남은 팀들 매칭 (같은 조가 아닌 팀끼리)
    const remainingWinners = winners.filter(
      (w) => !matches.some((m) => m.homeTeam?.teamId === w.teamId || m.awayTeam?.teamId === w.teamId)
    );
    const remainingRunnersUp = runnersUp.filter(
      (r) => !matches.some((m) => m.homeTeam?.teamId === r.teamId || m.awayTeam?.teamId === r.teamId)
    );
    
    // 남은 팀들 매칭 (같은 조 회피)
    for (const winner of remainingWinners) {
      const opponent = remainingRunnersUp.find((r) => r.groupId !== winner.groupId);
      if (opponent) {
        matches.push({
          id: `round1_match${matchIdCounter++}`,
          round: 1,
          matchNumber: matchIdCounter - 1,
          homeTeam: winner,
          awayTeam: opponent,
          winnerRef: `round2_match${Math.ceil(matchIdCounter / 2)}`,
          status: "scheduled",
        });
        // 매칭된 팀 제거
        const index = remainingRunnersUp.indexOf(opponent);
        if (index > -1) {
          remainingRunnersUp.splice(index, 1);
        }
      }
    }
  } else {
    // 같은 조 회피 규칙 없이 순차 매칭
    for (let i = 0; i < winners.length && i < runnersUp.length; i++) {
      matches.push({
        id: `round1_match${matchIdCounter++}`,
        round: 1,
        matchNumber: matchIdCounter - 1,
        homeTeam: winners[i],
        awayTeam: runnersUp[i],
        winnerRef: `round2_match${Math.ceil(matchIdCounter / 2)}`,
        status: "scheduled",
      });
    }
  }
  
  // 2라운드 이후 자동 생성 (토너먼트 트리 구조)
  let currentRound = 2;
  let currentRoundMatches = matches.length;
  
  while (currentRoundMatches > 1) {
    const nextRoundMatches = Math.ceil(currentRoundMatches / 2);
    
    for (let i = 1; i <= nextRoundMatches; i++) {
      matches.push({
        id: `round${currentRound}_match${i}`,
        round: currentRound,
        matchNumber: i,
        homeTeam: null, // 승자 참조로 채워짐
        awayTeam: null,
        winnerRef:
          currentRoundMatches > 2
            ? `round${currentRound + 1}_match${Math.ceil(i / 2)}`
            : undefined, // 결승은 winnerRef 없음
        status: "scheduled",
      });
    }
    
    currentRoundMatches = nextRoundMatches;
    currentRound++;
  }
  
  return matches;
}

/**
 * 브라켓 크기 계산 (2^n)
 */
export function calculateBracketSize(teamCount: number): number {
  return Math.pow(2, Math.ceil(Math.log2(teamCount)));
}

