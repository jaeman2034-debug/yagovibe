/**
 * 🔥 천재 모드: 에러 분류 시스템
 * 
 * 원칙: 실패는 숨기지 말고 분류한다
 * - 에러 = 데이터
 * - 문자열 의존 ❌ / 코드 기반 분류 ⭕
 */

export enum AppErrorCode {
  // 인증 관련
  AUTH_REQUIRED = 'AUTH_REQUIRED',
  AUTH_EXPIRED = 'AUTH_EXPIRED',
  AUTH_INVALID = 'AUTH_INVALID',

  // 네트워크 관련
  NETWORK_FAILED = 'NETWORK_FAILED',
  NETWORK_TIMEOUT = 'NETWORK_TIMEOUT',
  CORS_ERROR = 'CORS_ERROR',

  // 보안 관련
  INSECURE_API_URL = 'INSECURE_API_URL',
  MIXED_CONTENT = 'MIXED_CONTENT',

  // AI 분석 관련
  AI_EMPTY_RESULT = 'AI_EMPTY_RESULT',
  AI_PARSE_ERROR = 'AI_PARSE_ERROR',
  AI_TIMEOUT = 'AI_TIMEOUT',

  // 파일 관련
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  FILE_INVALID_TYPE = 'FILE_INVALID_TYPE',
  FILE_PROCESSING_ERROR = 'FILE_PROCESSING_ERROR',

  // 서버 관련
  SERVER_ERROR = 'SERVER_ERROR',
  SERVER_UNAVAILABLE = 'SERVER_UNAVAILABLE',

  // 기타
  UNKNOWN = 'UNKNOWN',
}

/**
 * 에러 코드를 사용자 친화적 메시지로 변환
 */
export function getErrorMessage(code: AppErrorCode, context?: {
  isKakaoInApp?: boolean;
  isMobile?: boolean;
}): string {
  const { isKakaoInApp = false, isMobile = false } = context || {};

  switch (code) {
    case AppErrorCode.AUTH_REQUIRED:
    case AppErrorCode.AUTH_EXPIRED:
    case AppErrorCode.AUTH_INVALID:
      return '로그인이 만료되었습니다. 다시 로그인해주세요.';

    case AppErrorCode.NETWORK_FAILED:
    case AppErrorCode.NETWORK_TIMEOUT:
      if (isKakaoInApp) {
        return '카카오톡 인앱에서는 분석이 불안정할 수 있어요.\nChrome에서 열어주세요.';
      }
      return '네트워크가 불안정합니다. 잠시 후 다시 시도해주세요.';

    case AppErrorCode.CORS_ERROR:
      return '서버 연결 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';

    case AppErrorCode.INSECURE_API_URL:
    case AppErrorCode.MIXED_CONTENT:
      return '서비스 설정 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';

    case AppErrorCode.AI_EMPTY_RESULT:
      return 'AI 분석 결과를 받을 수 없었습니다. 다시 시도해주세요.';

    case AppErrorCode.AI_PARSE_ERROR:
      return 'AI 분석 결과를 처리하는 중 오류가 발생했습니다.';

    case AppErrorCode.AI_TIMEOUT:
      return 'AI 분석 시간이 초과되었습니다. 다시 시도해주세요.';

    case AppErrorCode.FILE_TOO_LARGE:
      return '이미지 용량이 너무 큽니다. 더 작은 이미지를 선택해주세요.';

    case AppErrorCode.FILE_INVALID_TYPE:
      return '지원하지 않는 이미지 형식입니다.';

    case AppErrorCode.FILE_PROCESSING_ERROR:
      return '이미지 파일을 처리할 수 없습니다. 다른 이미지를 선택해주세요.';

    case AppErrorCode.SERVER_ERROR:
    case AppErrorCode.SERVER_UNAVAILABLE:
      return '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';

    default:
      return '오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
  }
}

/**
 * 에러가 AppErrorCode인지 확인
 */
export function isAppError(error: unknown): error is Error & { code?: AppErrorCode } {
  return error instanceof Error && 
    Object.values(AppErrorCode).includes(error.message as AppErrorCode);
}

