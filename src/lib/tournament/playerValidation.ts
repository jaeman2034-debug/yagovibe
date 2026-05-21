/**
 * 🔥 선수 명단 입력 검증 (11명 조건, 절대 안 깨짐)
 * 
 * 검증 위치는 3단:
 * 1. 프론트 (UX 가이드)
 * 2. 서버 (최종 진실)
 * 3. FSM 전이 시 재검증
 */

import { MIN_PLAYERS, MAX_PLAYERS } from "@/constants/rosterPolicy";

/**
 * ① 프론트 (UX 가이드)
 */
export interface FrontendValidationResult {
  canProceed: boolean;
  playerCount: number;
  minRequired: number;
  maxAllowed: number;
  message?: string;
  hint?: string;
}

/**
 * 프론트엔드 선수 수 검증
 */
export function validatePlayerCountFrontend(
  playerCount: number
): FrontendValidationResult {
  const canProceed = playerCount >= MIN_PLAYERS && playerCount <= MAX_PLAYERS;
  
  let message: string | undefined;
  let hint: string | undefined;
  
  if (playerCount < MIN_PLAYERS) {
    message = `선수는 최소 ${MIN_PLAYERS}명 이상이어야 합니다.`;
    hint = "팀 관리에서 선수 명단을 입력하세요";
  } else if (playerCount > MAX_PLAYERS) {
    message = `선수는 최대 ${MAX_PLAYERS}명까지 가능합니다.`;
    hint = "선수 명단을 확인하세요";
  }
  
  return {
    canProceed,
    playerCount,
    minRequired: MIN_PLAYERS,
    maxAllowed: MAX_PLAYERS,
    message,
    hint,
  };
}

/**
 * ② 서버 검증용 에러 코드 (서버에서 사용)
 */
export const VALIDATION_ERROR_CODES = {
  MIN_PLAYERS_NOT_MET: "MIN_PLAYERS_NOT_MET",
  MAX_PLAYERS_EXCEEDED: "MAX_PLAYERS_EXCEEDED",
} as const;

/**
 * 서버 검증용 에러 메시지
 */
export const VALIDATION_ERROR_MESSAGES = {
  [VALIDATION_ERROR_CODES.MIN_PLAYERS_NOT_MET]: "선수는 최소 11명 이상이어야 합니다",
  [VALIDATION_ERROR_CODES.MAX_PLAYERS_EXCEEDED]: "선수는 최대 25명까지 가능합니다",
} as const;

/**
 * 서버 검증용 힌트
 */
export const VALIDATION_HINTS = {
  [VALIDATION_ERROR_CODES.MIN_PLAYERS_NOT_MET]: "팀 관리에서 선수 명단을 입력하세요",
  [VALIDATION_ERROR_CODES.MAX_PLAYERS_EXCEEDED]: "선수 명단을 확인하세요",
} as const;

/**
 * 🧠 UX 메시지 표준 (서버에서 반환하는 형태)
 */
export interface ValidationErrorResponse {
  code: string;
  message: string;
  hint: string;
  playerCount: number;
  minRequired: number;
  maxAllowed: number;
}

/**
 * 서버 검증 실패 시 반환할 표준 에러 응답 생성
 */
export function createValidationErrorResponse(
  code: keyof typeof VALIDATION_ERROR_CODES,
  playerCount: number
): ValidationErrorResponse {
  return {
    code: VALIDATION_ERROR_CODES[code],
    message: VALIDATION_ERROR_MESSAGES[code],
    hint: VALIDATION_HINTS[code],
    playerCount,
    minRequired: MIN_PLAYERS,
    maxAllowed: MAX_PLAYERS,
  };
}
