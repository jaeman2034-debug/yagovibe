// src/pages/SignupPage.voice.ts
// 🔥 회원가입 페이지 전용 Intent 테이블 및 핸들러

import { useNavigate } from "react-router-dom";

/**
 * 회원가입 페이지 전용 Intent 테이블
 * 🔥 수정/재입력 명령 포함
 */
export const signupIntents = {
  email: [
    "이메일 입력",
    "이메일 말할게",
    "이메일",
    "이메일 다시",
    "이메일 수정",
    "이메일 다시 입력",
    "email 다시",
    "이메일 재입력",
  ],
  password: [
    "비밀번호 입력",
    "비밀번호 말할게",
    "비밀번호",
    "비밀번호 다시",
    "비밀번호 수정",
    "비밀번호 다시 입력",
    "비번 다시",
    "비번 수정",
    "비밀번호 재입력",
  ],
  passwordCheck: [
    "비밀번호 확인",
    "비밀번호 확인 입력",
    "확인 비밀번호",
    "비밀번호 확인 다시",
    "비밀번호 확인 수정",
    "비밀번호 확인 다시 입력",
    "비번 확인 다시",
    "비번 확인 수정",
    "비밀번호 확인 재입력",
  ],
  submit: ["가입하기", "회원가입 완료", "가입", "완료", "회원가입"],
  back: ["로그인 갈게", "로그인으로", "로그인 페이지", "돌아가기"],
  cancel: ["취소", "그만", "중지"],
};

/**
 * 회원가입 페이지 Intent 핸들러
 * 🔥 수정/재입력 기능 포함
 */
export function createSignupIntentHandler(
  navigate: ReturnType<typeof useNavigate>,
  onEmailInput: () => void,
  onPasswordInput: () => void,
  onConfirmPasswordInput: () => void,
  onSubmit: () => void,
  onEmailReset?: () => void, // 🔥 이메일 초기화 콜백
  onPasswordReset?: () => void, // 🔥 비밀번호 초기화 콜백
  onConfirmReset?: () => void // 🔥 비밀번호 확인 초기화 콜백
) {
  return (intent: string, text: string) => {
    console.log("[SignupPage] Intent 처리:", intent, "원문:", text);

    switch (intent) {
      case "email":
        // 🔥 이메일 수정/재입력: 기존 값 초기화 후 재입력 시작
        onEmailReset?.(); // 기존 이메일 값 초기화
        onEmailInput(); // 이메일 입력 시작
        break;

      case "password":
        // 🔥 비밀번호 수정/재입력: 기존 값 초기화 후 재입력 시작
        onPasswordReset?.(); // 기존 비밀번호 값 초기화
        onPasswordInput(); // 비밀번호 입력 시작
        break;

      case "passwordCheck":
        // 🔥 비밀번호 확인 수정/재입력: 기존 값 초기화 후 재입력 시작
        onConfirmReset?.(); // 기존 비밀번호 확인 값 초기화
        onConfirmPasswordInput(); // 비밀번호 확인 입력 시작
        break;

      case "submit":
        onSubmit();
        break;

      case "back":
        navigate("/login");
        break;

      case "cancel":
        // 취소 처리
        break;

      default:
        console.warn("[SignupPage] 알 수 없는 Intent:", intent);
    }
  };
}

