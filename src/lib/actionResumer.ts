/**
 * 🔥 가입 후 액션 복귀 로직 (STEP 4 LOCK)
 * 
 * 핵심 원칙:
 * - 가입 완료 후 반드시 지켜야 할 순서
 * 1. 인증 성공
 * 2. postSignupAction 존재 확인
 * 3. 해당 액션 자동 실행
 * 4. 모달/가입 화면 완전 종료
 * 
 * 사용자가 느끼는 흐름:
 * "아까 누른 게 지금 실행됐네"
 */

import { PostSignupAction } from "./userState";
import { useNavigate } from "react-router-dom";

/**
 * 액션 타입별 실제 실행 함수
 */
export function resumeAction(action: PostSignupAction): void {
  switch (action.type) {
    case "SEND_CHAT":
      // 채팅 보내기 액션 실행
      if (action.payload?.chatId && action.payload?.message) {
        // 실제 채팅 전송 API 호출
        // 예시: sendChatMessage(action.payload.chatId, action.payload.message);
        console.log("🔔 [actionResumer] 채팅 보내기 복귀:", action.payload);
      }
      break;

    case "CREATE_LISTING":
      // 상품 등록 액션 실행
      console.log("🔔 [actionResumer] 상품 등록 복귀:", action.payload);
      // 실제 상품 등록 폼 열기
      // 예시: openCreateListingForm(action.payload);
      break;

    case "ADD_FAVORITE":
      // 찜 추가 액션 실행
      if (action.payload?.itemId) {
        // 실제 찜 API 호출
        // 예시: addFavorite(action.payload.itemId);
        console.log("🔔 [actionResumer] 찜 추가 복귀:", action.payload);
      }
      break;

    case "REQUEST_TRADE":
      // 거래 요청 액션 실행
      console.log("🔔 [actionResumer] 거래 요청 복귀:", action.payload);
      // 실제 거래 요청 폼 열기
      break;

    case "MAKE_PAYMENT":
      // 결제 액션 실행
      console.log("🔔 [actionResumer] 결제 복귀:", action.payload);
      // 실제 결제 프로세스 시작
      break;

    default:
      console.warn("⚠️ [actionResumer] 알 수 없는 액션 타입:", action.type);
  }
}

/**
 * React Hook 버전 (라우팅 포함)
 */
export function useActionResumer() {
  // 실제로는 useNavigate 등을 사용할 수 있지만,
  // 여기서는 유틸리티 함수로만 제공
  return { resumeAction };
}

