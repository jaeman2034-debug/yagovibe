/**
 * 대회 저장 Validation 유틸리티
 * 
 * 공지 시스템의 표준 validation 로직을 대회에 적용
 * 대부분의 로직은 공지와 동일하며, 대회 전용 필드만 추가
 */

import { NOTICE_VALIDATION, validateNotice, type ValidationResult } from "./noticeValidation";

// ✅ Validation 상수 (공지와 동일하거나 확장)
export const TOURNAMENT_VALIDATION = {
  TITLE: NOTICE_VALIDATION.TITLE, // 제목: 공지와 동일
  CONTENT: NOTICE_VALIDATION.CONTENT, // 본문: 공지와 동일
  PLACEHOLDER_TEXTS: NOTICE_VALIDATION.PLACEHOLDER_TEXTS, // 플레이스홀더: 공지와 동일
  VENUE: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 100,
  },
} as const;

/**
 * 대회 전체 Validation (제목 + 본문 + 장소)
 * @param title - 제목
 * @param content - 본문
 * @param venue - 장소 (대회 전용)
 * @returns ValidationResult
 */
export function validateTournament(
  title: string,
  content: string,
  venue?: string
): ValidationResult {
  // 제목 + 본문 검증 (공지와 동일)
  const noticeResult = validateNotice(title, content);
  if (!noticeResult.isValid) {
    return noticeResult;
  }

  // 장소 검증 (대회 전용)
  if (venue !== undefined) {
    const trimmedVenue = venue.trim();
    if (!trimmedVenue) {
      return {
        isValid: false,
        error: "장소를 입력해주세요.",
        field: 'content', // field 타입이 'title' | 'content'만 있어서 임시로 content
      };
    }
    if (trimmedVenue.length < TOURNAMENT_VALIDATION.VENUE.MIN_LENGTH) {
      return {
        isValid: false,
        error: `장소를 ${TOURNAMENT_VALIDATION.VENUE.MIN_LENGTH}자 이상 입력해주세요.`,
        field: 'content',
      };
    }
    if (trimmedVenue.length > TOURNAMENT_VALIDATION.VENUE.MAX_LENGTH) {
      return {
        isValid: false,
        error: `장소는 ${TOURNAMENT_VALIDATION.VENUE.MAX_LENGTH}자 이내로 입력해주세요.`,
        field: 'content',
      };
    }
  }

  return { isValid: true };
}

// 공지와 동일한 경고 메시지 함수 재사용
export { getWarningMessage } from "./noticeValidation";

