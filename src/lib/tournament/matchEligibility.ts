/**
 * 🔥 출전 자격 제어 유틸리티
 * 
 * 커서 지시문 4️⃣, 5️⃣ 기반:
 * - 승인된 선수만 대회 출전 자격을 가진다
 * - 미승인 또는 반려된 선수는 현장 출전 불가
 * - 현장에서는 시스템 승인 상태를 기준으로 출전 여부 판단
 * - 현장 판단으로 승인 상태를 변경할 수 없다
 */

import type { TournamentPlayerRecord, ApprovalStatus } from "./playerRepository";

/**
 * 출전 자격 체크 결과
 */
export interface MatchEligibilityCheck {
  eligible: boolean;
  reason: string;
  status: ApprovalStatus;
}

/**
 * 선수의 출전 자격 확인
 * 
 * 커서 지시문 4️⃣:
 * - 승인된 선수만 대회 출전 자격을 가진다
 */
export function checkMatchEligibility(player: TournamentPlayerRecord): MatchEligibilityCheck {
  // 승인된 선수만 출전 가능
  if (player.approvalStatus === "approved") {
    return {
      eligible: true,
      reason: "출전 가능 (승인됨)",
      status: player.approvalStatus,
    };
  }

  // 반려된 선수
  if (player.approvalStatus === "rejected") {
    return {
      eligible: false,
      reason: player.rejectionReason 
        ? `출전 불가 (반려: ${player.rejectionReason})` 
        : "출전 불가 (반려됨)",
      status: player.approvalStatus,
    };
  }

  // 검수중인 선수
  return {
    eligible: false,
    reason: "출전 불가 (검수중)",
    status: player.approvalStatus,
  };
}

/**
 * 팀의 출전 가능 선수 필터링
 */
export function getEligiblePlayers(players: TournamentPlayerRecord[]): TournamentPlayerRecord[] {
  return players.filter(p => p.approvalStatus === "approved");
}

/**
 * 팀의 출전 불가 선수 필터링
 */
export function getIneligiblePlayers(players: TournamentPlayerRecord[]): TournamentPlayerRecord[] {
  return players.filter(p => p.approvalStatus !== "approved");
}

/**
 * 출전 명단 검증
 * 
 * 커서 지시문 4️⃣:
 * - 미승인 또는 반려된 선수는 현장 출전이 불가하다
 */
export function validateMatchRoster(
  submittedPlayerIds: string[],
  allPlayers: TournamentPlayerRecord[]
): {
  valid: boolean;
  eligiblePlayers: TournamentPlayerRecord[];
  ineligiblePlayers: TournamentPlayerRecord[];
  errors: string[];
} {
  const eligiblePlayers: TournamentPlayerRecord[] = [];
  const ineligiblePlayers: TournamentPlayerRecord[] = [];
  const errors: string[] = [];

  for (const playerId of submittedPlayerIds) {
    const player = allPlayers.find(p => p.id === playerId);
    
    if (!player) {
      errors.push(`선수 ID ${playerId}를 찾을 수 없습니다.`);
      continue;
    }

    const check = checkMatchEligibility(player);
    
    if (check.eligible) {
      eligiblePlayers.push(player);
    } else {
      ineligiblePlayers.push(player);
      errors.push(`${player.name}: ${check.reason}`);
    }
  }

  return {
    valid: ineligiblePlayers.length === 0 && errors.length === 0,
    eligiblePlayers,
    ineligiblePlayers,
    errors,
  };
}

/**
 * 현장 출전 체크인 검증
 * 
 * 커서 지시문 4️⃣:
 * - 현장에서는 시스템 승인 상태를 기준으로 출전 여부를 판단한다
 * - 현장 판단으로 승인 상태를 변경할 수 없다
 */
export function validateOnSiteCheckIn(
  player: TournamentPlayerRecord
): {
  allowed: boolean;
  reason: string;
  canOverride: false; // 현장에서 절대 오버라이드 불가
} {
  const check = checkMatchEligibility(player);
  
  return {
    allowed: check.eligible,
    reason: check.reason,
    canOverride: false, // 커서 지시문 4️⃣: 현장 판단으로 승인 상태를 변경할 수 없다
  };
}

/**
 * QR 체크인 시 출전 자격 검증
 */
export function validateQrCheckIn(
  playerId: string,
  allPlayers: TournamentPlayerRecord[]
): {
  allowed: boolean;
  player: TournamentPlayerRecord | null;
  reason: string;
} {
  const player = allPlayers.find(p => p.id === playerId);
  
  if (!player) {
    return {
      allowed: false,
      player: null,
      reason: "등록되지 않은 선수입니다.",
    };
  }

  const check = checkMatchEligibility(player);
  
  return {
    allowed: check.eligible,
    player,
    reason: check.reason,
  };
}

