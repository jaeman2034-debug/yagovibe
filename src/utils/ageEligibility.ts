/**
 * 🔥 연령 적합성 판별 유틸리티
 * 
 * 대회의 ageRule을 기준으로 선수의 참가 가능 여부를 자동 판별
 */

import type { AgeRule } from "@/components/association/tournament/TournamentAgeRuleForm";

export interface AgeEligibilityResult {
  eligible: boolean;
  reason: string;
  ageGroup?: string; // "U-12", "OVER-40" 등
}

export interface PlayerInput {
  name: string;
  birthDate?: string; // YYYY-MM-DD 형식
  birthYear?: number; // 출생연도 (직접 입력 시)
  position?: string;
  notes?: string;
}

/**
 * 생년월일 문자열에서 출생연도 추출
 */
export function extractBirthYear(birthDate: string): number | null {
  // YYYY-MM-DD 형식
  const match = birthDate.match(/^(\d{4})/);
  if (match) {
    return parseInt(match[1], 10);
  }
  
  // YYYYMMDD 형식
  const match2 = birthDate.match(/^(\d{4})/);
  if (match2) {
    return parseInt(match2[1], 10);
  }
  
  return null;
}

/**
 * 연령 적합성 판별
 * 
 * @param player 선수 정보 (birthYear 또는 birthDate 필요)
 * @param ageRule 대회 연령 기준
 * @returns 판별 결과
 */
export function checkAgeEligibility(
  player: PlayerInput,
  ageRule?: AgeRule
): AgeEligibilityResult {
  // 연령 기준이 없으면 모두 가능
  if (!ageRule || ageRule.type === "OPEN") {
    return {
      eligible: true,
      reason: "연령 제한 없음",
    };
  }

  // 출생연도 추출
  let birthYear: number | null = null;
  
  if (player.birthYear) {
    birthYear = player.birthYear;
  } else if (player.birthDate) {
    birthYear = extractBirthYear(player.birthDate);
  }

  // 출생연도를 알 수 없으면 확인 필요
  if (birthYear === null) {
    return {
      eligible: false,
      reason: "생년월일 오류 또는 누락",
    };
  }

  const currentYear = new Date().getFullYear();
  const age = currentYear - birthYear;

  // U대회 판별
  if (ageRule.type === "U") {
    const maxBirthYear = ageRule.maxBirthYear;
    if (maxBirthYear === undefined) {
      return {
        eligible: false,
        reason: "연령 기준 설정 오류",
      };
    }

    if (birthYear <= maxBirthYear) {
      return {
        eligible: true,
        reason: "연령 OK",
        ageGroup: `U-${age}`,
      };
    } else {
      return {
        eligible: false,
        reason: `연령 초과 (${maxBirthYear}년생 이하만 가능)`,
        ageGroup: `U-${currentYear - maxBirthYear}`,
      };
    }
  }

  // OVER대회 판별
  if (ageRule.type === "OVER") {
    const minBirthYear = ageRule.minBirthYear;
    if (minBirthYear === undefined) {
      return {
        eligible: false,
        reason: "연령 기준 설정 오류",
      };
    }

    if (birthYear >= minBirthYear) {
      return {
        eligible: true,
        reason: "연령 OK",
        ageGroup: `OVER-${age}`,
      };
    } else {
      return {
        eligible: false,
        reason: `연령 미달 (${minBirthYear}년생 이상만 가능)`,
        ageGroup: `OVER-${currentYear - minBirthYear}`,
      };
    }
  }

  return {
    eligible: false,
    reason: "알 수 없는 연령 기준",
  };
}

/**
 * 선수 목록 일괄 검증
 */
export function verifyPlayerList(
  players: PlayerInput[],
  ageRule?: AgeRule
): Array<PlayerInput & { verification: AgeEligibilityResult }> {
  return players.map((player) => ({
    ...player,
    verification: checkAgeEligibility(player, ageRule),
  }));
}

/**
 * 검증 결과를 그룹별로 분류
 */
export function groupPlayersByEligibility(
  verifiedPlayers: Array<PlayerInput & { verification: AgeEligibilityResult }>
) {
  const eligible: typeof verifiedPlayers = [];
  const ineligible: typeof verifiedPlayers = [];
  const needsCheck: typeof verifiedPlayers = [];

  verifiedPlayers.forEach((player) => {
    if (player.verification.eligible) {
      eligible.push(player);
    } else if (player.verification.reason.includes("오류") || player.verification.reason.includes("누락")) {
      needsCheck.push(player);
    } else {
      ineligible.push(player);
    }
  });

  return {
    eligible,
    ineligible,
    needsCheck,
  };
}

