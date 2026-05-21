// src/pages/LoginPage.voice.ts
// 🔥 로그인 페이지 전용 Intent 테이블 및 핸들러

import { useNavigate } from "react-router-dom";

/**
 * 로그인 페이지 전용 Intent 테이블
 */
export const loginIntents = {
  email: ["이메일 입력", "이메일 말할게", "이메일"],
  password: ["비밀번호 입력", "비밀번호 말할게", "비밀번호"],
  login: ["로그인", "접속", "들어가기", "로그인 할게"],
  signup: ["회원가입", "가입할래", "가입", "회원가입 할게"],
  guest: ["게스트 둘러보기", "게스트", "둘러보기", "그냥 볼게"],
  phone: ["전화번호 로그인", "전화번호", "핸드폰 로그인"],
  forgot: ["비밀번호 찾기", "비밀번호 잊었어", "비번 찾기"],
  cancel: ["취소", "그만", "중지"],
};

/**
 * 로그인 페이지 Intent 핸들러
 */
export function createLoginIntentHandler(
  navigate: ReturnType<typeof useNavigate>,
  onEmailInput: () => void,
  onPasswordInput: () => void,
  onLogin: () => void
) {
  return (intent: string, text: string) => {
    console.log("[LoginPage] Intent 처리:", intent, "원문:", text);

    switch (intent) {
      case "email":
        onEmailInput();
        break;

      case "password":
        onPasswordInput();
        break;

      case "login":
        onLogin();
        break;

      case "signup":
        navigate("/signup");
        break;

      case "guest":
        navigate("/start");
        break;

      case "phone":
        navigate("/phone-login");
        break;

      case "forgot":
        navigate("/forgot-password");
        break;

      case "cancel":
        // 취소 처리
        break;

      default:
        console.warn("[LoginPage] 알 수 없는 Intent:", intent);
    }
  };
}

