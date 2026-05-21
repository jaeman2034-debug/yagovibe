/**
 * 🔥 자동 스케줄링
 * 
 * 역할:
 * - 조별 리그 (ROUND_ROBIN): 라운드로빈 방식
 * - 토너먼트 (KNOCKOUT): 단판/왕복 토너먼트
 */

import { createRound } from "./round";
import { createMatch } from "./match";

export type SchedulingMode = "ROUND_ROBIN" | "KNOCKOUT";

export interface SchedulingOptions {
  tournamentId: string;
  teams: string[];
  mode: SchedulingMode;
  startDate?: Date;
  matchesPerDay?: number; // 하루 최대 경기 수
}

/**
 * 조별 리그 스케줄링 (라운드로빈)
 * 
 * n팀 → n-1 라운드
 * 각 라운드에 n/2 경기
 */
async function scheduleRoundRobin({
  tournamentId,
  teams,
  startDate,
  matchesPerDay = 4,
}: {
  tournamentId: string;
  teams: string[];
  startDate?: Date;
  matchesPerDay?: number;
}): Promise<void> {
  const teamCount = teams.length;
  
  if (teamCount < 2) {
    throw new Error("최소 2팀이 필요합니다.");
  }

  // 홀수 팀이면 가상 팀 추가 (부전승)
  const isOdd = teamCount % 2 === 1;
  let workingTeams = isOdd ? [...teams, "BYE"] : [...teams];
  const rounds = workingTeams.length - 1;

  // 라운드별 경기 생성
  for (let round = 0; round < rounds; round++) {
    const roundName = `라운드 ${round + 1}`;
    const roundId = await createRound({
      tournamentId,
      name: roundName,
      order: round + 1,
    });

    // 이 라운드의 경기 조합
    const matches: Array<[string, string]> = [];
    
    // 첫 번째 팀 고정, 나머지 팀 회전
    for (let i = 0; i < workingTeams.length / 2; i++) {
      const home = workingTeams[i];
      const away = workingTeams[workingTeams.length - 1 - i];
      
      if (home !== "BYE" && away !== "BYE") {
        matches.push([home, away]);
      }
    }

    // 팀 회전 (첫 번째 팀 제외)
    const first = workingTeams[0];
    const rest = workingTeams.slice(1);
    workingTeams.splice(1, 0, rest.pop()!);

    // 경기 생성
    for (let matchIndex = 0; matchIndex < matches.length; matchIndex++) {
      const [homeTeamId, awayTeamId] = matches[matchIndex];
      
      // 날짜 계산 (하루 최대 경기 수 제한)
      const dayOffset = Math.floor(matchIndex / matchesPerDay);
      const scheduledAt = startDate
        ? new Date(startDate.getTime() + dayOffset * 24 * 60 * 60 * 1000)
        : undefined;

      await createMatch({
        tournamentId,
        roundId,
        homeTeamId,
        awayTeamId,
        scheduledAt,
      });
    }
  }
}

/**
 * 토너먼트 스케줄링 (KNOCKOUT)
 * 
 * 2^k 팀으로 보정
 * 8강/4강/결승 자동 생성
 */
async function scheduleKnockout({
  tournamentId,
  teams,
  startDate,
  matchesPerDay = 2,
}: {
  tournamentId: string;
  teams: string[];
  startDate?: Date;
  matchesPerDay?: number;
}): Promise<void> {
  const teamCount = teams.length;
  
  if (teamCount < 2) {
    throw new Error("최소 2팀이 필요합니다.");
  }

  // 2의 거듭제곱으로 보정 (부전승 처리)
  let bracketSize = 2;
  while (bracketSize < teamCount) {
    bracketSize *= 2;
  }

  // 라운드 수 계산
  const rounds = Math.log2(bracketSize);
  const roundNames = ["결승", "준결승", "4강", "8강", "16강", "32강"];

  // 각 라운드의 경기 수
  let matchesInRound = bracketSize / 2;
  let currentTeams = [...teams];

  // 부전승 처리 (2의 거듭제곱이 아닐 경우)
  while (currentTeams.length < bracketSize) {
    currentTeams.push("BYE");
  }

  // 라운드별 경기 생성 (결승 → 예선 순으로 역순)
  for (let roundIndex = rounds - 1; roundIndex >= 0; roundIndex--) {
    const roundName =
      roundNames[roundIndex] || `라운드 ${rounds - roundIndex}`;
    const roundId = await createRound({
      tournamentId,
      name: roundName,
      order: rounds - roundIndex,
    });

    const matches: Array<[string, string]> = [];

    // 현재 라운드의 경기 조합
    for (let i = 0; i < matchesInRound; i++) {
      const home = currentTeams[i * 2];
      const away = currentTeams[i * 2 + 1];

      if (home !== "BYE" && away !== "BYE") {
        matches.push([home, away]);
      }
    }

    // 날짜 계산
    const dayOffset = rounds - 1 - roundIndex;
    const roundDate = startDate
      ? new Date(startDate.getTime() + dayOffset * 24 * 60 * 60 * 1000)
      : undefined;

    // 경기 생성
    for (const [homeTeamId, awayTeamId] of matches) {
      await createMatch({
        tournamentId,
        roundId,
        homeTeamId,
        awayTeamId,
        scheduledAt: roundDate,
      });
    }

    // 다음 라운드를 위한 팀 준비 (현재 라운드의 승자들)
    // 실제로는 경기 결과를 기다려야 하지만, 여기서는 플레이스홀더
    matchesInRound /= 2;
    if (roundIndex > 0) {
      // 다음 라운드용 플레이스홀더 (실제로는 경기 결과 반영 필요)
      currentTeams = Array(matchesInRound * 2)
        .fill("TBD")
        .map((_, i) => `TBD_${i}`);
    }
  }
}

/**
 * 자동 스케줄링 메인 함수
 */
export async function scheduleTournament(
  options: SchedulingOptions
): Promise<void> {
  const { tournamentId, teams, mode, startDate, matchesPerDay = 4 } = options;

  if (!tournamentId || !teams || teams.length === 0) {
    throw new Error("BAD_ARGS: 필수 파라미터가 누락되었습니다.");
  }

  if (mode === "ROUND_ROBIN") {
    await scheduleRoundRobin({
      tournamentId,
      teams,
      startDate,
      matchesPerDay,
    });
  } else if (mode === "KNOCKOUT") {
    await scheduleKnockout({
      tournamentId,
      teams,
      startDate,
      matchesPerDay: matchesPerDay / 2, // 토너먼트는 하루 경기 수 적음
    });
  } else {
    throw new Error(`알 수 없는 스케줄링 모드: ${mode}`);
  }
}
