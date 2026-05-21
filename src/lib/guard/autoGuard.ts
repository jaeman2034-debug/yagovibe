/**
 * Auto-Guard 로직
 * 
 * 시뮬레이션 결과를 바탕으로 자동 차단/승인요청
 */

export type AutoGuardResult =
  | { forcedVerdict: "block"; reason: string }
  | { forcedVerdict: "review_required"; reason: string }
  | { forcedVerdict: null };

/**
 * 시뮬레이션 위험 점수에 따른 자동 가드레일
 * 
 * @param input.riskScore 시뮬레이션 결과의 riskScore
 * @returns AutoGuardResult
 */
export function autoGuardFromSimulation(input: {
  riskScore?: number | null;
}): AutoGuardResult {
  if (input.riskScore == null) return { forcedVerdict: null };

  if (input.riskScore >= 80) {
    return {
      forcedVerdict: "block",
      reason: `시뮬레이션 위험 점수 ${input.riskScore} ≥ 80`,
    };
  }

  if (input.riskScore >= 60) {
    return {
      forcedVerdict: "review_required",
      reason: `시뮬레이션 위험 점수 ${input.riskScore} ≥ 60`,
    };
  }

  return { forcedVerdict: null };
}

