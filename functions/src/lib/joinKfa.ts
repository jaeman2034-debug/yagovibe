/**
 * 🔥 JoinKFA 자동 검증 (스텁 + 확장 포인트)
 * Phase 1-4: 참가 신청 검증
 */

export type JoinKfaVerifyResult =
  | { status: "APPROVED"; reason?: string }
  | { status: "HOLD"; reason?: string }
  | { status: "REJECTED"; reason?: string };

export async function verifyJoinKfaEligibility(application: any): Promise<JoinKfaVerifyResult> {
  // TODO: 실제 JoinKFA API 연동 (예: 선수 등록 여부, 소속, 자격기간 등)
  // 지금은 스텁: 필드가 없으면 보류
  
  if (!application?.teamId) {
    return { status: "HOLD", reason: "MISSING_TEAM" };
  }

  // 예: 특정 조건 불일치
  if (
    application?.requestedDivision &&
    application?.eligibleDivision &&
    application.requestedDivision !== application.eligibleDivision
  ) {
    return { status: "REJECTED", reason: "DIVISION_MISMATCH" };
  }

  return { status: "APPROVED" };
}

