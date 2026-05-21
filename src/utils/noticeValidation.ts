/**
 * 공지 저장 Validation 유틸리티
 * 
 * 공지 시스템의 표준 validation 로직
 * 대회/시설 등 다른 엔티티에도 재사용 가능하도록 설계
 */

// ✅ Validation 상수 (표준 기준)
export const NOTICE_VALIDATION = {
  TITLE: {
    MIN_LENGTH: 2, // 최소 2자 이상 (엄격한 기준)
    MAX_LENGTH: 200,
    WARNING_THRESHOLD: 180, // 180자 이상 시 경고
  },
  CONTENT: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 10000,
    WARNING_THRESHOLD: 9000, // 9,000자 이상 시 경고
  },
  // 플레이스홀더 텍스트 목록 (실제 본문이 아닌 더미 텍스트) - 원천 차단
  PLACEHOLDER_TEXTS: [
    "대회 안내 본문 전체",
    "본문 내용을 입력하세요",
    "공지 내용을 입력하세요",
    "내용을 입력하세요",
    "공지 본문",
    "본문을 입력하세요",
    "공지 내용",
    "내용 입력",
  ],
} as const;

// ✅ Validation 결과 타입
export interface ValidationResult {
  isValid: boolean;
  error?: string;
  field?: 'title' | 'content';
}

/**
 * 제목 Validation
 * @param title - 검증할 제목 문자열
 * @returns ValidationResult
 */
export function validateNoticeTitle(title: string): ValidationResult {
  const trimmed = title.trim();
  
  // 1. 빈 문자열 체크
  if (!trimmed) {
    return {
      isValid: false,
      error: "제목을 입력해주세요.",
      field: 'title',
    };
  }
  
  // 2. 최소 길이 체크 (엄격한 기준: 2자 이상)
  if (trimmed.length < NOTICE_VALIDATION.TITLE.MIN_LENGTH) {
    return {
      isValid: false,
      error: `제목을 ${NOTICE_VALIDATION.TITLE.MIN_LENGTH}자 이상 입력해주세요. (현재: ${trimmed.length}자)`,
      field: 'title',
    };
  }
  
  // 3. 최대 길이 체크
  if (trimmed.length > NOTICE_VALIDATION.TITLE.MAX_LENGTH) {
    return {
      isValid: false,
      error: `제목은 ${NOTICE_VALIDATION.TITLE.MAX_LENGTH}자 이내로 입력해주세요. (현재: ${trimmed.length}자)`,
      field: 'title',
    };
  }
  
  return { isValid: true };
}

/**
 * 본문 Validation
 * @param content - 검증할 본문 문자열
 * @returns ValidationResult
 */
export function validateNoticeContent(content: string): ValidationResult {
  const trimmed = content.trim();
  
  // 1. 빈 문자열 체크 (공백만 입력 차단)
  if (!trimmed) {
    return {
      isValid: false,
      error: "본문 내용을 입력해주세요.",
      field: 'content',
    };
  }
  
  // 2. 플레이스홀더 텍스트 감지 및 차단 (원천 차단)
  if (NOTICE_VALIDATION.PLACEHOLDER_TEXTS.some(placeholder => trimmed === placeholder)) {
    return {
      isValid: false,
      error: "본문 내용을 실제로 입력해주세요. (플레이스홀더는 저장되지 않습니다)",
      field: 'content',
    };
  }
  
  // 3. 최대 길이 체크
  if (trimmed.length > NOTICE_VALIDATION.CONTENT.MAX_LENGTH) {
    return {
      isValid: false,
      error: `본문은 ${NOTICE_VALIDATION.CONTENT.MAX_LENGTH.toLocaleString()}자 이내로 입력해주세요. (현재: ${trimmed.length.toLocaleString()}자)`,
      field: 'content',
    };
  }
  
  return { isValid: true };
}

/**
 * 공지 전체 Validation (제목 + 본문)
 * @param title - 제목
 * @param content - 본문
 * @returns ValidationResult
 */
export function validateNotice(title: string, content: string): ValidationResult {
  // 제목 검증
  const titleResult = validateNoticeTitle(title);
  if (!titleResult.isValid) {
    return titleResult;
  }
  
  // 본문 검증
  const contentResult = validateNoticeContent(content);
  if (!contentResult.isValid) {
    return contentResult;
  }
  
  return { isValid: true };
}

/**
 * 경고 메시지 생성 (임박 알림용)
 * @param field - 필드명 ('title' | 'content')
 * @param length - 현재 길이
 * @returns 경고 메시지 (없으면 null)
 */
export function getWarningMessage(field: 'title' | 'content', length: number): string | null {
  if (field === 'title') {
    if (length > NOTICE_VALIDATION.TITLE.MAX_LENGTH) {
      return `⚠️ 제목이 최대 길이를 초과했습니다. (${length}/${NOTICE_VALIDATION.TITLE.MAX_LENGTH}자)`;
    }
    if (length >= NOTICE_VALIDATION.TITLE.WARNING_THRESHOLD) {
      return `⚠️ 제목이 너무 깁니다. (${length}/${NOTICE_VALIDATION.TITLE.MAX_LENGTH}자)`;
    }
  } else if (field === 'content') {
    if (length > NOTICE_VALIDATION.CONTENT.MAX_LENGTH) {
      return `⚠️ 본문이 최대 길이를 초과했습니다. (${length.toLocaleString()}/${NOTICE_VALIDATION.CONTENT.MAX_LENGTH.toLocaleString()}자)`;
    }
    if (length >= NOTICE_VALIDATION.CONTENT.WARNING_THRESHOLD) {
      return `⚠️ 본문이 너무 깁니다. (${length.toLocaleString()}/${NOTICE_VALIDATION.CONTENT.MAX_LENGTH.toLocaleString()}자)`;
    }
  }
  
  return null;
}

