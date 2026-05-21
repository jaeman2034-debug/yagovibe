// src/voice/useLoginVoiceFlow.ts
// 🔥 로그인 페이지용 음성 명령 흐름 훅 (v2 안정화 버전)

import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { speechEngine } from "./speechEngine";
import { parseIntent, type GlobalIntent } from "./intents";
import { isIntentAllowed, getPageContext } from "./intentWhitelist";

interface Options {
  onEmailInputVoice?: () => void; // 필드 모드 훅(이미 만든 useVoiceLoginFields와 연결)
  onPasswordInputVoice?: () => void; // "
  onLogin?: () => Promise<void> | void;
  onGuest?: () => void;
  onPhoneLogin?: () => void; // 전화번호 로그인
}

export const useLoginVoiceFlow = (opts: Options) => {
  const navigate = useNavigate();

  const handleIntent = useCallback(
    async (intent: GlobalIntent) => {
      switch (intent) {
        case "signup":
          await speechEngine.speak("회원가입 페이지로 이동합니다.");
          navigate("/signup");
          return;

        case "login":
          await speechEngine.speak("로그인합니다.");
          await opts.onLogin?.();
          return;

        case "guest":
          await speechEngine.speak("게스트 모드로 입장합니다.");
          opts.onGuest?.();
          return;

        case "phone_login":
          // 🔥 stopSTT() → TTS → 페이지 이동
          speechEngine.stopSTT();
          await speechEngine.speak("전화번호 로그인 페이지로 이동합니다.");
          navigate("/login/phone");
          return;

        case "email_input":
          // 🔥 safeSpeak 패턴: stopSTT() → TTS → 완료 후 STT 시작
          await speechEngine.safeSpeak("이메일을 말씀해주세요.", () => {
            setTimeout(() => {
              opts.onEmailInputVoice?.();
            }, 500);
          });
          return;

        case "password_input":
          // 🔥 safeSpeak 패턴: stopSTT() → TTS → 완료 후 STT 시작
          await speechEngine.safeSpeak("비밀번호를 말씀해주세요.", () => {
            setTimeout(() => {
              opts.onPasswordInputVoice?.();
            }, 500);
          });
          return;

        default:
          await speechEngine.speak(
            "잘 이해하지 못했어요. 이메일 입력, 비밀번호 입력, 로그인, 회원가입, 전화번호 로그인, 게스트 둘러보기 중 하나를 말씀해주세요."
          );
          return;
      }
    },
    [navigate, opts]
  );

  // 로그인 페이지에서 "음성 명령 실행" 버튼이 누를 함수
  const startVoiceCommand = useCallback(async () => {
    // 🔥 promptAndListen: TTS → STT 순서 보장
    const heard = await speechEngine.promptAndListen(
      "무엇을 도와드릴까요? 이메일 입력, 비밀번호 입력, 로그인, 회원가입, 전화번호 로그인, 게스트 둘러보기 중 말씀해주세요.",
      "command"
    );

    console.log("[Voice][login] heard:", heard);
    const intent = parseIntent(heard, "/login"); // 🔥 페이지 정보 전달
    console.log("[Voice][login] intent:", intent);

    // 🔥 Intent Whitelist 검증
    const pageContext = getPageContext("/login");
    if (!isIntentAllowed(intent, pageContext)) {
      console.warn("[Voice][login] 허용되지 않은 intent:", intent);
      await speechEngine.speak("이 페이지에서는 사용할 수 없는 명령입니다. 이메일 입력, 비밀번호 입력, 로그인, 회원가입, 전화번호 로그인, 게스트 둘러보기 중 하나를 말씀해주세요.");
      return;
    }

    // 인텐트 실행
    await handleIntent(intent);
  }, [handleIntent]);

  return { startVoiceCommand };
};

