// src/voice/intentWhitelist.ts
// 🔥 페이지별 허용 Intent Whitelist 구성

import { type GlobalIntent } from "./intents";

export type PageContext = "login" | "signup" | "phone-login" | "sports-hub" | "unknown";

/**
 * 각 페이지에서 허용되는 Intent 목록
 * 🔥 페이지별로 허용 intent만 활성화하여 오인식 방지
 */
export const getIntentWhitelist = (pageContext: PageContext): GlobalIntent[] => {
  switch (pageContext) {
    case "login":
      return [
        "email_input",
        "password_input",
        "login",
        "signup", // 회원가입 페이지로 이동
        "guest",
        "phone_login", // 전화번호 로그인
        "help",
        "cancel",
      ];

    case "signup":
      return [
        "email_input",
        "password_input",
        "password_confirm_input",
        "signup", // 회원가입 완료
        "login", // 로그인 페이지로 이동
        "restart",
        "help",
        "cancel",
      ];

    case "phone-login":
      return [
        "phone_input", // 전화번호 입력
        "send_code", // 인증번호 받기
        "verify_code_input", // 인증번호 입력
        "go_back", // 뒤로 가기
        "home", // 홈으로
        "login_email", // 이메일 로그인 화면 이동
        "restart", // 다시 입력 (전화번호 초기화)
        "help",
        "cancel",
      ];

    case "sports-hub":
      return [
        "help",
        "cancel",
        // 스포츠 허브 전용 intent는 여기에 추가
      ];

    default:
      return [];
  }
};

/**
 * Intent가 현재 페이지에서 허용되는지 확인
 */
export const isIntentAllowed = (
  intent: GlobalIntent,
  pageContext: PageContext
): boolean => {
  const whitelist = getIntentWhitelist(pageContext);
  return whitelist.includes(intent);
};

/**
 * 현재 경로에서 PageContext 추출
 */
export const getPageContext = (pathname: string): PageContext => {
  if (pathname.startsWith("/login/phone")) return "phone-login";
  if (pathname.startsWith("/login")) return "login";
  if (pathname.startsWith("/signup")) return "signup";
  if (pathname.startsWith("/hub")) return "sports-hub";
  if (pathname.startsWith("/sports-hub")) return "sports-hub";
  return "unknown";
};

