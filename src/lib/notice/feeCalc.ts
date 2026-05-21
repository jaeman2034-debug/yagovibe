/**
 * 🔥 참가비 계산 로직
 * 순수 함수: 팀 수 기준 총 참가비 계산
 * 
 * ⚠️ 단일 소스 원칙: 이 함수만 참가비의 진실
 */

import type { FeePolicy } from "@/components/notice/FeeSummaryBox";

export interface FeeCalculationResult {
  extraTeams: number; // 추가 팀 수
  extraFee: number; // 추가 참가비
  total: number; // 총 참가비
}

/**
 * 기본 참가비 정책 (fallback용)
 * ⚠️ 이 값은 실제 대회 정책과 다를 수 있으므로, feePolicySnapshot을 우선 사용해야 함
 */
export const DEFAULT_FEE_POLICY: FeePolicy = {
  baseFee: 200000,
  baseTeamCount: 2,
  extraFeePerTeam: 100000,
};

/**
 * 참가비 계산
 * @param teamCount 참가 팀 수
 * @param feePolicy 참가비 정책
 * @returns 계산 결과
 * 
 * @example
 * calcEntryFee(3, { baseFee: 200000, baseTeamCount: 2, extraFeePerTeam: 100000 })
 * // => { extraTeams: 1, extraFee: 100000, total: 300000 }
 */
export function calcEntryFee(
  teamCount: number,
  feePolicy: FeePolicy
): FeeCalculationResult {
  // 최소값 보장
  const validTeamCount = Math.max(1, teamCount);

  // 추가 팀 수 계산: baseTeamCount 초과분만 추가 팀으로 계산
  const extraTeams = Math.max(0, validTeamCount - feePolicy.baseTeamCount);

  // 추가 참가비 계산
  const extraFee = extraTeams * feePolicy.extraFeePerTeam;

  // 총 참가비
  const total = feePolicy.baseFee + extraFee;

  // 🔥 디버그 로그 (개발 환경에서만)
  if (process.env.NODE_ENV === "development") {
    console.log("[참가비 계산]", {
      teamCount: validTeamCount,
      baseFee: feePolicy.baseFee,
      baseTeamCount: feePolicy.baseTeamCount,
      extraTeams,
      extraFeePerTeam: feePolicy.extraFeePerTeam,
      extraFee,
      total,
      formula: `${feePolicy.baseFee} + (${extraTeams} × ${feePolicy.extraFeePerTeam}) = ${total}`,
    });
  }

  return {
    extraTeams,
    extraFee,
    total,
  };
}

/**
 * 참가비 계산 결과를 설명 문구로 변환
 */
export function formatFeeCalculation(
  teamCount: number,
  result: FeeCalculationResult,
  feePolicy: FeePolicy
): string {
  if (result.extraTeams === 0) {
    return `${teamCount}팀 참가 시: ${feePolicy.baseFee.toLocaleString()}원`;
  }

  return `${teamCount}팀 참가 시: ${feePolicy.baseFee.toLocaleString()}원 + (${result.extraTeams} × ${feePolicy.extraFeePerTeam.toLocaleString()}원) = ${result.total.toLocaleString()}원`;
}
