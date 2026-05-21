/**
 * 🔥 출전료(참가비) 계산 도메인 로직
 * 
 * 정책:
 * - 기본 참가비: 200,000원 (1~2팀)
 * - 추가 참가비: (팀 수 - 2) * 100,000원 (3팀부터)
 * - 합계: 기본 + 추가
 */

export interface EntryFeeResult {
  base: number;          // 기본 참가비 (200,000원)
  extra: number;         // 추가 참가비
  total: number;         // 총 참가비
  extraTeams: number;    // 추가 팀 수 (3팀부터)
}

/**
 * 출전료 계산 (정답 함수)
 * 
 * 조건:
 * - 1~2팀: 200,000원
 * - 3팀부터: (팀 수 - 2) × 100,000원 추가
 * 
 * @param teamCount 참가 팀 수
 * @returns 계산 결과
 * 
 * @example
 * calcEntryFee(1) // { base: 200000, extra: 0, total: 200000, extraTeams: 0 }
 * calcEntryFee(2) // { base: 200000, extra: 0, total: 200000, extraTeams: 0 }
 * calcEntryFee(3) // { base: 200000, extra: 100000, total: 300000, extraTeams: 1 }
 * calcEntryFee(5) // { base: 200000, extra: 300000, total: 500000, extraTeams: 3 }
 */
export function calcEntryFee(teamCount: number): EntryFeeResult {
  // 최소값 보장 (0팀이면 0원 처리)
  const validTeamCount = Math.max(0, teamCount);
  
  if (validTeamCount === 0) {
    return {
      base: 0,
      extra: 0,
      total: 0,
      extraTeams: 0,
    };
  }

  // 기본 참가비: 200,000원 (1~2팀)
  const base = 200_000;
  
  // 추가 팀 수 계산 (3팀부터)
  const extraTeams = Math.max(0, validTeamCount - 2);
  
  // 추가 참가비 계산
  const extra = extraTeams * 100_000;
  
  // 총 참가비
  const total = base + extra;

  return {
    base,
    extra,
    total,
    extraTeams,
  };
}

/**
 * 참가비 계산 (별칭, 기존 코드 호환성)
 */
export function calculateEntryFee(teamCount: number): number {
  return calcEntryFee(teamCount).total;
}
