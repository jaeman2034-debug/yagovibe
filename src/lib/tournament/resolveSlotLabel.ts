/**
 * Match Slot을 팀명 레이블로 변환하는 유틸리티
 * BracketDisplay와 VenueSchedule에서 공통 사용
 */

import type { Match, MatchSlot } from "@/types/tournament";

/**
 * 슬롯을 레이블 문자열로 변환
 */
export function resolveSlotLabel(
  slot: MatchSlot | undefined,
  fallback: string | undefined = "대기중"
): string {
  if (!slot) return fallback || "대기중";

  if (slot.type === "TEAM") {
    return slot.teamName || fallback || "대기중";
  }

  // WINNER_OF_MATCH 타입
  if (slot.refMatchNumber) {
    return `${slot.refMatchNumber} 경기 승자`;
  }

  if (slot.refMatchId) {
    return `${slot.refMatchId} 경기 승자`;
  }

  return "대기중";
}

/**
 * Match에서 홈/원정 팀 레이블 추출
 */
export function getMatchTeamLabels(match: Match): {
  homeLabel: string;
  awayLabel: string;
} {
  const homeLabel = resolveSlotLabel(
    match.homeSlot,
    match.teamA
  );

  const awayLabel = resolveSlotLabel(
    match.awaySlot,
    match.teamB
  );

  return { homeLabel, awayLabel };
}

/**
 * 라운드 레이블 (짧은 표기)
 */
export function getRoundLabel(round: string): string {
  if (round.includes("결승")) return "결승";
  if (round.includes("준결승")) return "준결승";
  if (round.includes("4강")) return "4강";
  if (round.includes("8강")) return "8강";
  if (round.includes("16강")) return "16강";
  if (round.includes("1회전") || round.includes("1라운드")) return "1회전";
  if (round.includes("3·4위전") || round.includes("3-4위")) return "3-4위전";
  return round;
}

