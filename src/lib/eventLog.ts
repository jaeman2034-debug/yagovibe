/**
 * 📊 이벤트 로그 유틸리티
 * 
 * 사용자 행동 추적 및 분석을 위한 이벤트 로깅
 * - STT 사용률
 * - TTS 사용률
 * - 추천 문장 클릭률
 * - 플랫폼별 사용 패턴
 */

// ⚠️ Lazy import로 순환 참조 방지
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { getAuth } from "firebase/auth";
// ⚠️ isIOS, isPWA도 동적 import로 변경 (모듈 로드 시점 실행 방지)

/**
 * 이벤트 로그 추적
 * ⚠️ db를 동적 import하여 순환 참조 방지
 * ⚠️ platform, isPWA는 파라미터로 받아서 speech.ts 의존성 제거
 * 
 * @param event - 이벤트 이름 (예: "stt_click", "stt_result")
 * @param params - 추가 파라미터 (platform, isPWA 포함 가능)
 */
export async function track(event: string, params: Record<string, any> = {}) {
  try {
    // 동적 import로 firebase.ts 로드 (순환 참조 방지)
    const { db } = await import("@/lib/firebase");
    
    const auth = getAuth();
    const uid = auth.currentUser?.uid ?? null;

    // 플랫폼 정보는 파라미터로 받거나 기본값 사용
    // ⚠️ speech.ts import 제거 (순환 참조 방지)
    const platform = params.platform || "unknown";
    const isPWA = params.isPWA ?? false;

    const userAgent =
      typeof navigator !== "undefined" && navigator.userAgent
        ? navigator.userAgent.slice(0, 500)
        : null;

    // params를 먼저 펼치면 호출부가 uid/event를 덮어쓸 수 있음 → Rules(uid==auth) 실패 원인이 됨
    await addDoc(collection(db, "eventLogs"), {
      ...params,
      event,
      uid,
      platform,
      isPWA,
      createdAt: serverTimestamp(),
      userAgent,
    });
  } catch (error) {
    // UX는 막지 않되, 권한·경로 문제는 콘솔에서 즉시 드러나야 함
    console.error("📊 [eventLog] 이벤트 로깅 실패:", event, error);
  }
}

/**
 * STT 관련 이벤트 추적 헬퍼
 * ⚠️ track 함수를 직접 참조 (자기 자신 import 제거)
 */
export const trackSTT = {
  click: async (meta: Record<string, any> = {}) => await track("stt_click", meta),
  blocked: async (reason: string, meta: Record<string, any> = {}) =>
    await track("stt_blocked", { reason, ...meta }),
  start: async (meta: Record<string, any> = {}) => await track("stt_start", meta),
  result: async (textLength: number, meta: Record<string, any> = {}) =>
    await track("stt_result", { textLength, ...meta }),
  error: async (errorCode: string, meta: Record<string, any> = {}) =>
    await track("stt_error", { errorCode, ...meta }),
};

/**
 * TTS 관련 이벤트 추적 헬퍼
 * ⚠️ track 함수를 직접 참조 (자기 자신 import 제거)
 */
export const trackTTS = {
  play: async (meta: Record<string, any> = {}) => await track("tts_play", meta),
  error: async (errorCode: string, meta: Record<string, any> = {}) =>
    await track("tts_error", { errorCode, ...meta }),
};

/**
 * 추천 문장 관련 이벤트 추적 헬퍼
 * ⚠️ track 함수를 직접 참조 (자기 자신 import 제거)
 */
export const trackSuggestion = {
  click: async (suggestionText: string, meta: Record<string, any> = {}) =>
    await track("suggest_click", { suggestionText, ...meta }),
  longPress: async (suggestionText: string, meta: Record<string, any> = {}) =>
    await track("suggest_longpress", { suggestionText, ...meta }),
};

/**
 * QR 로그인 관련 이벤트 추적 헬퍼
 */
export const trackQRLogin = {
  // PC: QR 세션 생성
  sessionCreated: async (sessionId: string, meta: Record<string, any> = {}) =>
    await track("qr_login_session_created", { sessionId, ...meta }),
  
  // PC: QR 코드 표시
  qrDisplayed: async (sessionId: string, meta: Record<string, any> = {}) =>
    await track("qr_login_qr_displayed", { sessionId, ...meta }),
  
  // 모바일: QR 스캔
  qrScanned: async (sessionId: string, meta: Record<string, any> = {}) =>
    await track("qr_login_qr_scanned", { sessionId, ...meta }),
  
  // 모바일: 전화번호 입력 시작
  phoneInputStart: async (sessionId: string, meta: Record<string, any> = {}) =>
    await track("qr_login_phone_input_start", { sessionId, ...meta }),
  
  // 모바일: SMS 인증 요청
  smsRequested: async (sessionId: string, phoneNumber: string, meta: Record<string, any> = {}) =>
    await track("qr_login_sms_requested", { sessionId, phoneNumber: phoneNumber.replace(/\d(?=\d{4})/g, "*"), ...meta }),
  
  // 모바일: SMS 인증 성공
  smsVerified: async (sessionId: string, userId: string, meta: Record<string, any> = {}) =>
    await track("qr_login_sms_verified", { sessionId, userId, ...meta }),
  
  // 모바일: SMS 인증 실패
  smsFailed: async (sessionId: string, errorCode: string, meta: Record<string, any> = {}) =>
    await track("qr_login_sms_failed", { sessionId, errorCode, ...meta }),
  
  // PC: Custom Token 수신
  tokenReceived: async (sessionId: string, meta: Record<string, any> = {}) =>
    await track("qr_login_token_received", { sessionId, ...meta }),
  
  // PC: 자동 로그인 성공
  loginSuccess: async (sessionId: string, userId: string, meta: Record<string, any> = {}) =>
    await track("qr_login_success", { sessionId, userId, ...meta }),
  
  // PC: 자동 로그인 실패
  loginFailed: async (sessionId: string, errorCode: string, meta: Record<string, any> = {}) =>
    await track("qr_login_failed", { sessionId, errorCode, ...meta }),
  
  // 세션 만료
  sessionExpired: async (sessionId: string, reason: string, meta: Record<string, any> = {}) =>
    await track("qr_login_session_expired", { sessionId, reason, ...meta }),
  
  // 세션 소비 완료
  sessionConsumed: async (sessionId: string, userId: string, meta: Record<string, any> = {}) =>
    await track("qr_login_session_consumed", { sessionId, userId, ...meta }),
  
  // QR 재생성
  qrRegenerated: async (oldSessionId: string, newSessionId: string, meta: Record<string, any> = {}) =>
    await track("qr_login_qr_regenerated", { oldSessionId, newSessionId, ...meta }),
};
