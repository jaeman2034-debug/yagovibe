/**
 * 🔥 자동 승인 로직 (승인 규칙 기반)
 * 
 * 승인 규칙에 맞는 선수를 자동으로 승인
 */

import type { Tournament, TournamentPlayerRecord } from "@/types/tournament";
import { matchPlayerWithJoinKfa, type JoinKfaCache } from "./joinKfaCache";

/**
 * 선수가 승인 규칙에 맞는지 확인
 */
export function checkAutoApproveEligibility(
  player: TournamentPlayerRecord,
  tournament: Tournament,
  joinKfaCache: JoinKfaCache | null
): {
  eligible: boolean;
  reason: string;
} {
  const rules = tournament.approvalRules;
  
  // 승인 규칙이 없으면 자동 승인 불가
  if (!rules || !rules.autoApproveEnabled) {
    return {
      eligible: false,
      reason: "자동 승인이 비활성화되어 있습니다",
    };
  }

  // 1. 연령 기준 체크
  if (rules.ageCheck.requireEligible) {
    // 연령 적합 필수
    if (player.ageCheck.eligible !== true) {
      // 확인필요는 허용 여부에 따라
      if (player.ageCheck.eligible === null) {
        if (!rules.ageCheck.allowNeedsReview) {
          return {
            eligible: false,
            reason: "연령 확인필요는 자동 승인 불가",
          };
        }
      } else {
        // 연령 불가
        return {
          eligible: false,
          reason: "연령 불가로 자동 승인 불가",
        };
      }
    }
  }

  // 2. JoinKFA 기준 체크
  if (rules.joinKfa.requireVerified || !rules.joinKfa.allowMismatch || !rules.joinKfa.allowNotFound) {
    const joinKfaMatch = matchPlayerWithJoinKfa(
      player.name,
      player.birthDateISO || player.birthDateRaw,
      player.birthYear || undefined,
      joinKfaCache
    );

    if (rules.joinKfa.requireVerified) {
      // JoinKFA verified 필수
      if (joinKfaMatch.status !== "verified") {
        return {
          eligible: false,
          reason: `JoinKFA 인증 필요 (현재: ${joinKfaMatch.status})`,
        };
      }
    }

    if (!rules.joinKfa.allowMismatch && joinKfaMatch.status === "mismatch") {
      return {
        eligible: false,
        reason: "JoinKFA 불일치는 자동 승인 불가",
      };
    }

    if (!rules.joinKfa.allowNotFound && joinKfaMatch.status === "not_found") {
      return {
        eligible: false,
        reason: "JoinKFA 없음은 자동 승인 불가",
      };
    }
  }

  // 모든 조건 통과
  return {
    eligible: true,
    reason: "승인 규칙에 부합하여 자동 승인 가능",
  };
}

/**
 * 승인 규칙에 맞는 선수 목록 필터링
 */
export function filterAutoApproveEligiblePlayers(
  players: TournamentPlayerRecord[],
  tournament: Tournament,
  joinKfaCache: JoinKfaCache | null
): {
  eligible: TournamentPlayerRecord[];
  ineligible: Array<{ player: TournamentPlayerRecord; reason: string }>;
} {
  const eligible: TournamentPlayerRecord[] = [];
  const ineligible: Array<{ player: TournamentPlayerRecord; reason: string }> = [];

  for (const player of players) {
    // 이미 승인된 선수는 제외
    if (player.approvalStatus === "approved") {
      continue;
    }

    const check = checkAutoApproveEligibility(player, tournament, joinKfaCache);
    
    if (check.eligible) {
      eligible.push(player);
    } else {
      ineligible.push({ player, reason: check.reason });
    }
  }

  return { eligible, ineligible };
}

