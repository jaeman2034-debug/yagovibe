/**
 * 🔥 API 에러 핸들링 & Lazy Signup 연결 (STEP 3 LOCK)
 * 
 * 핵심 원칙:
 * - API가 AUTH_REQUIRED 에러 반환 → Lazy Signup 모달 열기
 * - API는 상태를 모른다 → "복귀"는 전부 프론트 책임
 * - 이 한 줄로 모든 Lazy Signup 연결
 */

import { savePostSignupAction, PostSignupAction } from "./userState";

/**
 * API 에러 코드 표준화
 * 
 * 서버는 이 코드만 반환:
 * {
 *   "code": "AUTH_REQUIRED"
 * }
 */
export type APIErrorCode = "AUTH_REQUIRED" | "FORBIDDEN" | "NOT_FOUND" | "VALIDATION_ERROR" | "SERVER_ERROR";

export interface APIError {
  code: APIErrorCode;
  message?: string;
  data?: any;
}

/**
 * API 호출 시 발생하는 에러를 표준화된 APIError로 변환
 */
export function normalizeAPIError(error: any): APIError {
  // 이미 APIError 형식이면 그대로 반환
  if (error && typeof error === "object" && "code" in error) {
    return error as APIError;
  }

  // HTTP 에러 응답 (예: fetch/axios)
  if (error?.response?.data) {
    return {
      code: error.response.data.code || "SERVER_ERROR",
      message: error.response.data.message,
      data: error.response.data,
    };
  }

  // 네트워크 에러 등
  return {
    code: "SERVER_ERROR",
    message: error?.message || "알 수 없는 오류가 발생했습니다",
  };
}

/**
 * API 에러를 Lazy Signup으로 연결
 * 
 * 사용 예시:
 * ```typescript
 * try {
 *   await sendMessage(chatId, message);
 * } catch (error) {
 *   const apiError = normalizeAPIError(error);
 *   if (handleAuthRequired(apiError, {
 *     type: "SEND_CHAT",
 *     payload: { chatId, message }
 *   })) {
 *     return; // Lazy Signup 모달 열림, 여기서 종료
 *   }
 *   // 다른 에러 처리
 * }
 * ```
 * 
 * @param error API 에러
 * @param actionContext 가입 후 복귀할 액션 (선택)
 * @returns Lazy Signup 모달이 열렸으면 true, 아니면 false
 */
export function handleAuthRequired(
  error: APIError,
  actionContext?: PostSignupAction
): boolean {
  if (error.code === "AUTH_REQUIRED") {
    // 가입 후 복귀할 액션 저장
    if (actionContext) {
      savePostSignupAction(actionContext);
    }

    // Lazy Signup 모달 열기
    // 🔥 실제 구현은 앱 구조에 맞게 조정 필요
    // 예시: window.dispatchEvent(new CustomEvent("open-signup-modal"));
    // 또는 전역 상태 관리 (Zustand, Redux)
    
    // 현재는 console만 남기고, 실제 모달은 별도 컴포넌트에서 처리
    console.log("🔒 [apiErrorHandler] AUTH_REQUIRED → Lazy Signup 모달 열기 필요");
    
    return true; // Lazy Signup 모달 열림
  }

  return false; // 다른 에러
}

/**
 * API 호출 래퍼 (에러 자동 처리)
 * 
 * 사용 예시:
 * ```typescript
 * const result = await callAPI(
 *   () => fetch("/api/chats/123/messages", { method: "POST", body: ... }),
 *   {
 *     type: "SEND_CHAT",
 *     payload: { chatId: "123", message: "안녕하세요" }
 *   }
 * );
 * ```
 */
export async function callAPI<T>(
  apiCall: () => Promise<T>,
  actionContext?: PostSignupAction
): Promise<T | null> {
  try {
    return await apiCall();
  } catch (error) {
    const apiError = normalizeAPIError(error);
    
    // AUTH_REQUIRED면 Lazy Signup 모달 열고 null 반환
    if (handleAuthRequired(apiError, actionContext)) {
      return null;
    }

    // 다른 에러는 그대로 throw (호출자가 처리)
    throw apiError;
  }
}

/**
 * API 에러를 사용자 친화적 메시지로 변환 (선택)
 */
export function getErrorMessage(error: APIError): string {
  switch (error.code) {
    case "AUTH_REQUIRED":
      return "로그인이 필요합니다";
    case "FORBIDDEN":
      return "권한이 없습니다";
    case "NOT_FOUND":
      return "요청한 리소스를 찾을 수 없습니다";
    case "VALIDATION_ERROR":
      return error.message || "입력값을 확인해주세요";
    case "SERVER_ERROR":
      return error.message || "서버 오류가 발생했습니다";
    default:
      return error.message || "알 수 없는 오류가 발생했습니다";
  }
}

