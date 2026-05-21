// src/voice/useSignupVoiceFlow.ts
// 🔥 회원가입 페이지용 음성 명령 흐름 훅 (v2 안정화 버전)

import { useCallback, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { speechEngine } from "./speechEngine";
import { parseIntent, type GlobalIntent } from "./intents";
import { isIntentAllowed, getPageContext } from "./intentWhitelist";

interface Options {
  onEmailInputVoice?: () => void;
  onPasswordInputVoice?: () => void;
  onPasswordConfirmVoice?: () => void;
  onSubmitSignup?: () => Promise<void> | void;
  // 🔥 필드 초기화 콜백
  onResetEmail?: () => void;
  onResetPassword?: () => void;
  onResetConfirm?: () => void;
}

export const useSignupVoiceFlow = (opts: Options) => {
  const navigate = useNavigate();

  const handleIntent = useCallback(
    async (intent: GlobalIntent) => {
      switch (intent) {
        case "email_input":
          // 🔥 단계 전환 시 stopSTT() → TTS → STT 순서 보장
          speechEngine.stopSTT();
          await speechEngine.speak("이메일을 말씀해주세요.");
          // TTS 완료 대기 후 STT 시작
          await new Promise((r) => setTimeout(r, 500));
          opts.onEmailInputVoice?.();
          return;

        case "password_input":
          // 🔥 safeSpeak 패턴: stopSTT() → TTS → 완료 후 STT 시작
          await speechEngine.safeSpeak("비밀번호를 말씀해주세요.", () => {
            setTimeout(() => {
              opts.onPasswordInputVoice?.();
            }, 500);
          });
          return;

        case "password_confirm_input":
          // 🔥 safeSpeak 패턴: stopSTT() → TTS → 완료 후 STT 시작
          await speechEngine.safeSpeak("비밀번호를 다시 말씀해주세요.", () => {
            setTimeout(() => {
              opts.onPasswordConfirmVoice?.();
            }, 500);
          });
          return;

        case "restart":
          await speechEngine.speak("처음부터 다시 시작합니다.");
          // 입력 필드 초기화
          opts.onResetEmail?.();
          opts.onResetPassword?.();
          opts.onResetConfirm?.();
          return;

        case "help":
          await speechEngine.speak("이메일 입력, 비밀번호 입력, 비밀번호 확인 입력 또는 가입하기 중 원하시는 작업을 말씀해주세요.");
          return;

        case "cancel":
          await speechEngine.speak("음성 입력을 취소했습니다.");
          return;

        case "signup":
          await speechEngine.speak("회원가입을 진행합니다. 잠시만 기다려주세요.");
          try {
            await opts.onSubmitSignup?.();
            // 🔥 성공 시 안내는 handleSignup 내부에서 처리
            // 실패 시 안내도 handleSignup 내부에서 처리
          } catch (e) {
            await speechEngine.speak("회원가입 중 오류가 발생했습니다. 다시 시도하시려면 이메일 입력이라고 말씀해주세요.");
          }
          return;

        case "login":
          await speechEngine.speak("로그인 페이지로 이동합니다.");
          navigate("/login");
          return;

        default:
          await speechEngine.speak(
            "잘 이해하지 못했어요. 이메일 입력, 비밀번호 입력, 비밀번호 확인 입력, 가입하기 중 하나를 말씀해주세요."
          );
          return;
      }
    },
    [navigate, opts]
  );

  const startVoiceCommand = useCallback(async () => {
    // 🔥 [명령 모드]: Intent 인식
    const heard = await speechEngine.promptAndListen(
      "이메일 입력, 비밀번호 입력, 비밀번호 확인 입력 또는 가입하기 중 원하시는 작업을 말씀해주세요.",
      "command"
    );

    console.log("[Voice][signup] heard:", heard);
    const intent = parseIntent(heard, "/signup"); // 🔥 페이지 정보 전달
    console.log("[Voice][signup] intent:", intent);

    // 🔥 Intent Whitelist 검증
    const pageContext = getPageContext("/signup");
    if (!isIntentAllowed(intent, pageContext)) {
      console.warn("[Voice][signup] 허용되지 않은 intent:", intent);
      await speechEngine.speak("이 페이지에서는 사용할 수 없는 명령입니다. 이메일 입력, 비밀번호 입력, 비밀번호 확인 입력 또는 가입하기 중 하나를 말씀해주세요.");
      return;
    }

    await handleIntent(intent);
  }, [handleIntent]);

  // 🔥 [입력 모드]: 페이지 도착 후 자동으로 이메일 입력 모드로 전환
  // Intent 모드와 Input 모드 분리 아키텍처
  const startEmailInputMode = useCallback(async () => {
    // 🔥 Input 모드로 전환: 이메일 입력 시작
    await speechEngine.speak("이메일을 말씀해주세요.");
    setTimeout(() => {
      opts.onEmailInputVoice?.();
    }, 500);
  }, [opts]);

  // 🔥 페이지 진입 시 자동 안내 (아키텍처 요구사항)
  // 🔥 StrictMode 대응: ref로 중복 실행 방지 + 페이지별 독립 실행
  const hasAnnouncedRef = useRef<string | null>(null);
  const location = useLocation();
  
  useEffect(() => {
    const currentPath = location.pathname;
    
    // 🔥 이미 이 페이지에서 안내했으면 다시 안내하지 않음
    if (hasAnnouncedRef.current === currentPath) {
      return;
    }
    
    // 🔥 이 페이지에서 안내 완료 표시
    hasAnnouncedRef.current = currentPath;
    
    // 페이지 진입 시 한 번만 자동 안내 (간결한 멘트)
    const timer = setTimeout(async () => {
      await speechEngine.speak("이메일 입력, 비밀번호 입력, 비밀번호 확인 입력 중 무엇을 하시겠습니까?");
    }, 800); // 페이지 로드 후 충분한 지연

    return () => {
      clearTimeout(timer);
      // cleanup 시 ref 초기화하지 않음 (한 번만 실행 보장)
    };
  }, [location.pathname]); // 경로 변경 시에만 실행

  return { startVoiceCommand };
};

