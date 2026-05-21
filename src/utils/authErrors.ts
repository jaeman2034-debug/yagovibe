/**
 * 🔥 Firebase Phone Auth 에러 분류 및 메시지 매핑
 * 
 * 실전 SMS 발송 실패 원인을 정확히 분류하고,
 * 사용자 친화적인 메시지를 제공합니다.
 */

export type AuthErrorType =
  | "SMS_QUOTA" // 🔥 운영 관점: SMS 쿼터 초과
  | "CAPTCHA" // 🔥 운영 관점: reCAPTCHA 실패 (봇 감지)
  | "RATE_LIMIT" // 🔥 운영 관점: 과도한 요청
  | "SMS_COOLDOWN" // 🔥 쿨다운 중 (1분 내 재요청)
  | "DAILY_LIMIT" // 🔥 일일 제한 초과
  | "COUNTRY_NOT_ALLOWED" // 🔥 국가 제한
  | "INVALID_PHONE"
  | "INVALID_APP_CREDENTIAL" // Phone Auth: reCAPTCHA 컨테이너·도메인·API 키 제한 등
  | "CODE_EXPIRED"
  | "INVALID_CODE"
  | "RETRY_LIMIT"
  | "NO_VERIFICATION_ID" // 🔥 verificationId 없음 (SMS 미발송)
  | "TIMEOUT" // 🔥 타임아웃
  | "UNKNOWN";

/**
 * 🔥 SMS 실패 원인 분류 (운영 관점)
 * 
 * 실전 운영에서 필요한 에러 분류:
 * - SMS_QUOTA: 일일 SMS 한도 초과
 * - CAPTCHA: 봇 감지 / 보안 검증 실패
 * - RATE_LIMIT: 과도한 요청 (DDoS 방어)
 */
export function classifySMSError(error: any): AuthErrorType {
  // 🔥 원본 에러가 있으면 우선 사용 (에러 정보 보존)
  const originalError = error?.originalError || error;
  const code = originalError?.code || error?.code || "";
  const message = (error?.message || "").toLowerCase();
  const originalMessage = error?.message || ""; // 🔥 원본 메시지 (한글 매칭용)
  const errorString = JSON.stringify(error).toLowerCase();

  // 🔥 타임아웃 에러 (추가)
  if (code.includes("timeout") || code === "TIMEOUT" || message.includes("timeout") || message.includes("타임아웃") || message.includes("초과")) {
    return "TIMEOUT";
  }
  
  // 🔥 verificationId 없음 (SMS 미발송)
  if (code === "NO_VERIFICATION_ID" || message.includes("verificationId") || message.includes("SMS가 발송되지 않았습니다") || message.includes("테스트 전화번호")) {
    return "NO_VERIFICATION_ID";
  }

  // SMS 쿼터 초과
  if (code.includes("quota") || code.includes("quota-exceeded") || message.includes("quota") || errorString.includes("quota")) {
    return "SMS_QUOTA";
  }

  // Phone Auth: reCAPTCHA DOM·도메인·브라우저 환경
  if (
    code.includes("invalid-app-credential") ||
    message.includes("invalid-app-credential")
  ) {
    return "INVALID_APP_CREDENTIAL";
  }

  // reCAPTCHA 실패 (봇 감지) - 강화된 검사
  if (
    code.includes("captcha") || 
    code.includes("captcha-check-failed") || 
    code.includes("recaptcha") ||
    message.includes("captcha") || 
    message.includes("recaptcha") ||
    errorString.includes("captcha") ||
    errorString.includes("recaptcha")
  ) {
    return "CAPTCHA";
  }

  // 🔥 과도한 요청 (Rate Limit) - 한글 메시지 포함
  if (
    code.includes("too-many-requests") || 
    code.includes("too-many") ||
    message.includes("too many") || 
    message.includes("too-many") || 
    message.includes("rate limit") ||
    errorString.includes("too-many") ||
    // 🔥 한글 메시지 체크 (원본 메시지 사용)
    originalMessage.includes("너무 빠르게") ||
    originalMessage.includes("너무 빠르게 요청") ||
    originalMessage.includes("잠시 후 다시 시도") ||
    originalMessage.includes("재시도") ||
    message.includes("너무 빠르게") ||
    message.includes("잠시 후")
  ) {
    return "RATE_LIMIT";
  }

  // 전화번호 형식 오류
  if (
    code.includes("invalid-phone") || 
    code.includes("invalid-phone-number") || 
    code.includes("malformed-phone-number") ||
    message.includes("invalid phone") ||
    message.includes("malformed phone")
  ) {
    return "INVALID_PHONE";
  }

  // 인증번호 만료
  if (code.includes("code-expired") || code.includes("expired-code") || message.includes("expired") || message.includes("만료")) {
    return "CODE_EXPIRED";
  }

  // 잘못된 인증번호
  if (
    code.includes("invalid-verification-code") || 
    code.includes("invalid-code") ||
    message.includes("invalid code") || 
    message.includes("invalid verification") ||
    message.includes("잘못된")
  ) {
    return "INVALID_CODE";
  }

  // 재시도 한도 초과 (커스텀)
  if (message.includes("retry_limit") || message.includes("retry limit") || code === "RETRY_LIMIT") {
    return "RETRY_LIMIT";
  }

  // 쿨다운 중
  if (message.includes("sms_cooldown") || message.includes("cooldown") || code === "SMS_COOLDOWN") {
    return "SMS_COOLDOWN";
  }

  // 일일 제한 초과
  if (message.includes("daily_limit") || message.includes("일일") || message.includes("초과")) {
    return "DAILY_LIMIT";
  }

  // 국가 제한
  if (message.includes("country_not_allowed") || message.includes("국가") || message.includes("지원하지 않는")) {
    return "COUNTRY_NOT_ALLOWED";
  }

  // 🔥 내부 오류 (Firebase Auth 내부 문제)
  if (
    code.includes("internal-error") || 
    code.includes("internal") ||
    message.includes("internal error") ||
    message.includes("internal")
  ) {
    return "CAPTCHA"; // 내부 오류는 보통 reCAPTCHA 문제
  }

  // 🔥 네트워크 오류
  if (
    code.includes("network") || 
    code.includes("unavailable") ||
    message.includes("network") ||
    message.includes("unavailable") ||
    message.includes("네트워크")
  ) {
    return "RATE_LIMIT"; // 네트워크 오류는 일시적이므로 재시도 안내
  }

  // 🔥 UNKNOWN인 경우 상세 로깅
  console.error("❌ [authErrors] 알 수 없는 에러 타입:", {
    code,
    message: error?.message,
    error: error,
    stack: error?.stack,
  });

  return "UNKNOWN";
}

/**
 * 🔥 호환성: parseAuthError는 classifySMSError의 별칭
 */
export function parseAuthError(error: any): AuthErrorType {
  return classifySMSError(error);
}

/**
 * 에러 타입별 사용자 친화적인 메시지
 */
/**
 * 🔥 실전 운영용 에러 메시지 (사용자 친화적)
 * 
 * 운영 관점에서 사용자에게 전달할 메시지:
 * - 명확한 원인 설명
 * - 다음 액션 안내
 * - 고객센터 연락처 (필요 시)
 */
/**
 * 🔥 실전 운영용 에러 메시지 (사용자 친화적 + 정교화)
 * 
 * Firebase Phone Auth 에러 코드를 정확히 매핑하여
 * 사용자에게 명확하고 친화적인 메시지를 제공합니다.
 */
export const SMS_ERROR_MESSAGE: Record<AuthErrorType, string> = {
  SMS_QUOTA: "오늘 인증 한도를 초과했어요. 내일 다시 시도해주세요.",
  CAPTCHA: "보안 확인에 실패했어요. 새로고침 후 다시 시도해주세요.",
  RATE_LIMIT: "너무 빠르게 요청했어요. 잠시 후 다시 시도해주세요.",
  SMS_COOLDOWN: "너무 자주 요청했어요. 1분 후 다시 시도해주세요.",
  DAILY_LIMIT: "오늘 인증 횟수를 초과했어요. 내일 다시 시도해주세요.",
  COUNTRY_NOT_ALLOWED: "현재 이 국가의 전화번호는 지원하지 않습니다.",
  INVALID_PHONE:
    "전화번호를 입력해주세요 (자동으로 +82 형식으로 변환됩니다). 번호가 맞는지 다시 확인해 주세요.",
  INVALID_APP_CREDENTIAL:
    "문자 인증 보안 단계에 실패했어요. 새로고침 후 다시 시도하거나 일반 브라우저(Chrome 등)에서 열어 주세요.",
  CODE_EXPIRED: "인증번호가 만료되었어요. 다시 요청해주세요.",
  INVALID_CODE: "인증번호가 올바르지 않아요. 다시 확인해주세요.",
  RETRY_LIMIT: "재시도 한도를 초과했어요. 잠시 후 다시 시도해주세요.",
  NO_VERIFICATION_ID: "SMS가 발송되지 않았어요. Firebase Console에서 테스트 전화번호를 삭제하고 다시 시도해주세요.",
  TIMEOUT: "SMS 전송 시간이 초과되었어요. 네트워크 연결을 확인하거나 잠시 후 다시 시도해주세요.",
  UNKNOWN: "인증에 실패했어요. 고객센터로 문의해주세요.",
};

/**
 * 🔥 Firebase Phone Auth 에러 코드 → 사용자 메시지 매핑 (정교화)
 * 
 * Firebase의 실제 에러 코드를 정확히 매핑하여
 * 사용자에게 명확한 안내를 제공합니다.
 */
export function mapPhoneAuthError(error: any): string {
  const code = error?.code || "";
  const message = (error?.message || "").toLowerCase();

  // 🔥 SMS 쿼터 초과
  if (code.includes("quota") || code.includes("quota-exceeded") || message.includes("quota")) {
    return "오늘 인증 횟수를 초과했어요. 내일 다시 시도해 주세요.";
  }

  // 🔥 과도한 요청 (Rate Limit)
  if (code.includes("too-many-requests") || code.includes("DAILY_LIMIT") || message.includes("too many") || message.includes("rate limit")) {
    return "오늘 인증 횟수를 초과했어요. 내일 다시 시도해 주세요.";
  }

  if (code.includes("invalid-app-credential") || message.includes("invalid-app-credential")) {
    return "문자 인증 보안 단계에 실패했어요. 새로고침 후 다시 시도하거나 Chrome·Safari 등 일반 브라우저에서 열어 주세요.";
  }

  // 🔥 전화번호 형식 오류
  if (code.includes("invalid-phone-number") || code.includes("invalid-phone") || message.includes("invalid phone")) {
    return "전화번호 형식이 올바르지 않아요. 010으로 시작하는 휴대폰 번호인지 확인해 주세요.";
  }

  // 🔥 SMS 발송 제한
  if (code.includes("quota-exceeded") || message.includes("quota")) {
    return "SMS 발송이 일시적으로 제한되었어요. 잠시 후 다시 시도해 주세요.";
  }

  // 🔥 기본 메시지 (기존 getErrorMessage 사용)
  return getErrorMessage(error);
}

/**
 * 🔥 호환성: ERROR_MESSAGES는 SMS_ERROR_MESSAGE의 별칭
 */
export const ERROR_MESSAGES = SMS_ERROR_MESSAGE;

/**
 * 🔥 에러 타입에 따른 사용자 친화적 메시지 반환
 */
export function getErrorMessage(error: any): string {
  const errorType = classifySMSError(error);
  
  // 🔥 UNKNOWN 에러인 경우 원본 에러 정보를 포함한 더 자세한 메시지
  if (errorType === "UNKNOWN") {
    const code = error?.code || "";
    const message = error?.message || "";
    
    // 🔥 인앱 브라우저 감지 시 특별 안내
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent.toLowerCase() : '';
    const isInApp = ua.includes("kakao") || ua.includes("naver") || ua.includes("instagram") || 
                    ua.includes("fb") || ua.includes("line") || ua.includes("samsungbrowser") ||
                    (ua.includes("wv") && ua.includes("android"));
    
    if (isInApp) {
      return "인앱 브라우저에서는 인증이 제한될 수 있습니다. Chrome 또는 Safari에서 다시 시도해주세요.";
    }
    
    // 🔥 원본 에러 코드가 있으면 포함
    if (code) {
      console.error("❌ [authErrors] UNKNOWN 에러 상세:", {
        code,
        message,
        error,
      });
      return `인증에 실패했어요. (오류 코드: ${code}) 고객센터로 문의해주세요.`;
    }
  }
  
  return SMS_ERROR_MESSAGE[errorType];
}

/**
 * 에러 로깅 (실전 모니터링용)
 */
/**
 * 🔥 에러 로깅 (실전 모니터링용)
 * 
 * 운영 관점에서 필요한 정보:
 * - 에러 타입 (분류)
 * - 원본 에러 코드/메시지
 * - 컨텍스트 (단계, 전화번호, 재시도 횟수)
 * - 타임스탬프
 */
export function logAuthError(
  error: any,
  context: {
    step: "send" | "verify";
    phoneNumber?: string;
    retryCount?: number;
  }
) {
  const errorType = classifySMSError(error);
  const errorInfo = {
    type: errorType,
    code: error?.code,
    message: error?.message,
    context,
    timestamp: new Date().toISOString(),
  };

  console.error("❌ [Auth Error]", errorInfo);

  // 📊 실전 모니터링: 여기에 Analytics/Logging 서비스 연동 가능
  // 예: trackEvent('phone_auth_error', errorInfo);
  // 예: sendToMonitoringService('sms_failure', errorInfo);

  return errorInfo;
}
