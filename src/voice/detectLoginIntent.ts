// src/voice/detectLoginIntent.ts

export type LoginIntent =
  | "email_login" // 이메일 로그인
  | "signup" // 회원가입
  | "phone_login" // 전화번호 로그인
  | "forgot_password" // 비밀번호 찾기
  | "guest" // 게스트 둘러보기
  | "cancel" // 취소/종료
  | "email_input" // 이메일 입력 (회원가입/로그인 공통)
  | "password_input" // 비밀번호 입력
  | "confirm_password_input" // 비밀번호 확인 입력
  | "unknown"; // 알 수 없음

/**
 * 음성 명령을 분석하여 로그인 관련 Intent를 감지
 * @param text - 인식된 음성 텍스트
 * @param currentPath - 현재 페이지 경로 (페이지별 Intent 필터링용)
 */
export function detectLoginIntent(text: string, currentPath?: string): LoginIntent {
  if (!text) return "unknown";

  const normalized = text.toLowerCase().trim();
  const isSignupPage = currentPath === "/signup";
  const isLoginPage = currentPath === "/login" || !currentPath;

  // 🔥 회원가입 페이지에서는 네비게이션 Intent 무시
  if (!isSignupPage) {
    // 회원가입 (로그인 페이지에서만)
    if (
      /회원가입|가입할게|가입|새 계정|계정 만들기|회원 등록|가입하기/.test(
        normalized
      )
    ) {
      return "signup";
    }

    // 전화번호 로그인 (로그인 페이지에서만)
    if (
      /전화번호|핸드폰|폰번호|휴대폰|번호로|전화로|폰으로/.test(normalized) &&
      /로그인|입장|접속/.test(normalized)
    ) {
      return "phone_login";
    }

    // 비밀번호 찾기 (로그인 페이지에서만)
    if (
      /비밀번호.*찾|비번.*찾|비밀번호.*잊|비번.*잊|패스워드.*찾|password.*find|forgot/.test(
        normalized
      )
    ) {
      return "forgot_password";
    }

    // 게스트 (로그인 페이지에서만)
    if (
      /게스트|둘러보기|그냥 볼|그냥 보기|둘러|체험|체험하기|로그인.*없|가입.*없/.test(
        normalized
      )
    ) {
      return "guest";
    }

    // 이메일 로그인 (로그인 페이지에서만)
    if (/로그인|입장|접속/.test(normalized)) {
      return "email_login";
    }
  } else {
    // 🔥 회원가입 페이지에서만 허용되는 Intent
    // "로그인으로" → 로그인 페이지로 이동
    if (/로그인.*갈|로그인.*이동|로그인.*가|로그인.*으로/.test(normalized)) {
      return "email_login"; // 로그인 페이지로 이동
    }
  }

  // 취소/종료 (모든 페이지 공통)
  if (/그만|취소|중지|종료|안 할|하지 않|stop|cancel/.test(normalized)) {
    return "cancel";
  }

  // 이메일 입력 (회원가입/로그인 공통) - 수정/재입력 키워드 포함
  if (
    /이메일.*입력|이메일.*말|이메일.*입력하|이메일.*다시|이메일.*수정|이메일.*재입력|email.*input|email.*enter|email.*다시/.test(
      normalized
    )
  ) {
    return "email_input";
  }

  // 비밀번호 입력 - 수정/재입력 키워드 포함
  if (
    /비밀번호.*입력|비밀번호.*말|비밀번호.*입력하|비밀번호.*다시|비밀번호.*수정|비밀번호.*재입력|비번.*다시|비번.*수정|password.*input|password.*enter|password.*다시/.test(
      normalized
    )
  ) {
    return "password_input";
  }

  // 비밀번호 확인 입력 - 수정/재입력 키워드 포함
  if (
    /비밀번호.*확인|비밀번호.*재입력|비밀번호.*다시|비밀번호.*확인.*다시|비밀번호.*확인.*수정|비밀번호.*확인.*재입력|비번.*확인.*다시|password.*confirm|password.*re.*enter/.test(
      normalized
    )
  ) {
    return "confirm_password_input";
  }

  return "unknown";
}

