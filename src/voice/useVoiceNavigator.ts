// src/voice/useVoiceNavigator.ts
// 🔥 단일 마이크로 전체 음성 네비게이션 통합 훅

import { useLocation, useNavigate } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { detectIntent, type VoiceIntent } from "./voiceIntents";
import { speak, startSTT, stopSTT } from "./voiceCore";
import { parseFullEmail, parsePassword } from "./voiceParsers";

type Step =
  | "idle"
  | "login_email"
  | "login_password"
  | "signup_email"
  | "signup_password"
  | "signup_confirm";

interface UseVoiceNavigatorOptions {
  // 로그인 페이지 setters
  setLoginEmail?: (v: string) => void;
  setLoginPassword?: (v: string) => void;
  onLoginSubmit?: () => void;

  // 회원가입 페이지 setters
  setSignupEmail?: (v: string) => void;
  setSignupPassword?: (v: string) => void;
  setSignupConfirm?: (v: string) => void;
  onSignupSubmit?: () => void;
}

/**
 * 🔥 단일 마이크로 전체 음성 네비게이션 통합 훅
 * - 로그인/회원가입/게스트/홈 네비게이션
 * - 이메일/비밀번호/비밀번호 확인 음성 입력
 * - 재입력/수정 기능
 */
export function useVoiceNavigator(options: UseVoiceNavigatorOptions = {}) {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const [isListeningCommand, setIsListeningCommand] = useState(false);
  const [isListeningField, setIsListeningField] = useState(false);
  const [lastCommandText, setLastCommandText] = useState("");
  const [lastFieldText, setLastFieldText] = useState("");
  const stepRef = useRef<Step>("idle");

  /**
   * 명령 모드 시작 (Intent 감지용)
   * 🔥 TTS 안내 후 STT 시작
   */
  const startCommandMode = async () => {
    stopSTT();
    
    // 🔥 초기 안내 TTS 재생 (페이지별 맞춤 안내)
    if (pathname.startsWith("/login")) {
      await speak("무엇을 도와드릴까요? 이메일 입력, 비밀번호 입력, 로그인, 회원가입, 게스트 둘러보기 등이 가능합니다.");
    } else if (pathname.startsWith("/signup")) {
      await speak("무엇을 도와드릴까요? 이메일 입력, 비밀번호 입력, 비밀번호 확인 입력을 할 수 있습니다.");
    } else {
      await speak("무엇을 도와드릴까요?");
    }
    
    setIsListeningCommand(true);
    setIsListeningField(false);

    startSTT({
      mode: "command",
      onFinal: async (text) => {
        setIsListeningCommand(false);
        setLastCommandText(text);
        await handleCommand(text);
      },
      onError: () => {
        setIsListeningCommand(false);
      },
    });
  };

  /**
   * 필드 입력 모드 시작
   */
  const startFieldMode = (step: Step) => {
    stopSTT();
    stepRef.current = step;
    setIsListeningField(true);

    startSTT({
      mode: "field",
      onFinal: (text) => {
        setIsListeningField(false);
        setLastFieldText(text);
        handleFieldInput(stepRef.current, text);
      },
      onError: () => {
        setIsListeningField(false);
      },
    });
  };

  /**
   * 명령 처리 (Intent 기반)
   * 🔥 Promise 기반으로 TTS 완료 후 STT 시작 보장
   */
  const handleCommand = async (text: string) => {
    // 🔥 현재 pathname 로깅 (디버깅용)
    console.log("[VoiceNavigator] 현재 pathname:", pathname, "명령:", text);
    const intent: VoiceIntent = detectIntent(text, pathname);
    console.log("[VoiceNavigator] intent:", intent, "from:", text, "pathname:", pathname);

    switch (intent) {
      // ===== 네비게이션 =====
      case "open_home":
        navigate("/");
        await speak("홈으로 이동합니다.");
        return;

      case "open_login":
        navigate("/login");
        await speak("로그인 페이지로 이동합니다.");
        return;

      case "open_signup":
        navigate("/signup");
        await speak("회원가입 페이지로 이동합니다.");
        // 🔥 페이지 이동 후 자동 안내는 useEffect에서 처리
        return;

      case "open_guest":
        navigate("/start");
        await speak("게스트 둘러보기로 이동합니다.");
        return;

      // ===== 로그인 관련 =====
      case "login_email":
        await speak("네, 이메일을 말씀해주세요.");
        startFieldMode("login_email");
        return;

      case "login_password":
        await speak("네, 비밀번호를 말씀해주세요.");
        startFieldMode("login_password");
        return;

      case "login_submit":
        if (options.onLoginSubmit) {
          await speak("로그인을 진행합니다.");
          options.onLoginSubmit?.();
        }
        return;

      // ===== 회원가입 관련 =====
      case "signup_email":
        await speak("네, 이메일을 말씀해주세요.");
        startFieldMode("signup_email");
        return;

      case "signup_password":
        await speak("네, 비밀번호를 말씀해주세요.");
        startFieldMode("signup_password");
        return;

      case "signup_confirm":
        await speak("네, 비밀번호 확인을 말씀해주세요.");
        startFieldMode("signup_confirm");
        return;

      case "signup_submit":
        if (options.onSignupSubmit) {
          await speak("회원가입을 진행합니다.");
          options.onSignupSubmit?.();
          // 🔥 회원가입 완료 후 안내
          setTimeout(async () => {
            await speak("회원가입이 완료되었습니다.");
          }, 1000);
        }
        return;

      // ===== 리셋 관련 =====
      case "reset_email":
        if (pathname.startsWith("/login")) {
          options.setLoginEmail?.("");
        } else if (pathname.startsWith("/signup")) {
          options.setSignupEmail?.("");
        }
        await speak("이메일을 다시 입력합니다. 이메일을 말씀해주세요.");
        const step = pathname.startsWith("/login") ? "login_email" : "signup_email";
        startFieldMode(step);
        return;

      case "reset_password":
        if (pathname.startsWith("/login")) {
          options.setLoginPassword?.("");
          await speak("비밀번호를 다시 입력합니다. 비밀번호를 말씀해주세요.");
          startFieldMode("login_password");
        } else if (pathname.startsWith("/signup")) {
          options.setSignupPassword?.("");
          await speak("비밀번호를 다시 입력합니다. 비밀번호를 말씀해주세요.");
          startFieldMode("signup_password");
        }
        return;

      case "reset_confirm":
        options.setSignupConfirm?.("");
        await speak("비밀번호 확인을 다시 입력합니다. 말씀해주세요.");
        startFieldMode("signup_confirm");
        return;

      case "unknown":
      default:
        await speak("잘 이해하지 못했습니다. 다시 말씀해주세요.");
        return;
    }
  };

  /**
   * 필드 입력 처리
   * 🔥 Promise 기반으로 TTS 완료 후 다음 단계 진행
   */
  const handleFieldInput = async (step: Step, rawText: string) => {
    console.log("[VoiceNavigator] fieldInput step:", step, "text:", rawText);

    if (step === "login_email" || step === "signup_email") {
      const parsed = parseFullEmail(rawText);
      if (!parsed) {
        await speak("이메일을 잘 이해하지 못했습니다. 다시 말씀해주세요.");
        // 🔥 재입력 모드로 다시 시작
        startFieldMode(step);
        return;
      }

      if (step === "login_email") {
        options.setLoginEmail?.(parsed);
        await speak("이메일을 입력했습니다. 다음은 비밀번호입니다. 말씀해주세요.");
        // 🔥 로그인 모드: 비밀번호 단계로 자동 진행
        setTimeout(() => {
          startFieldMode("login_password");
        }, 500);
      } else {
        options.setSignupEmail?.(parsed);
        await speak("이메일을 입력했습니다. 다음은 비밀번호입니다. 말씀해주세요.");
        // 🔥 회원가입 모드: 비밀번호 단계로 자동 진행
        setTimeout(() => {
          startFieldMode("signup_password");
        }, 500);
      }

      stepRef.current = "idle";
      return;
    }

    if (step === "login_password" || step === "signup_password" || step === "signup_confirm") {
      const fixed = parsePassword(rawText);
      if (!fixed || fixed.length < 4) {
        await speak("비밀번호가 너무 짧습니다. 다시 말씀해주세요.");
        // 🔥 재입력 모드로 다시 시작
        startFieldMode(step);
        return;
      }

      if (step === "login_password") {
        options.setLoginPassword?.(fixed);
        await speak("비밀번호를 인식했습니다.");
      } else if (step === "signup_password") {
        options.setSignupPassword?.(fixed);
        await speak("비밀번호를 인식했습니다. 비밀번호 확인을 말씀해주세요.");
        // 🔥 회원가입 모드: 비밀번호 확인 단계로 자동 진행
        setTimeout(() => {
          startFieldMode("signup_confirm");
        }, 500);
      } else if (step === "signup_confirm") {
        options.setSignupConfirm?.(fixed);
        await speak("비밀번호 확인을 인식했습니다.");
      }

      stepRef.current = "idle";
      return;
    }
  };

  /**
   * 마이크 버튼 클릭 핸들러
   * 항상 "명령 모드"부터 시작
   * 🔥 Promise 기반으로 TTS 완료 후 STT 시작 보장
   */
  const onMicButtonClick = async () => {
    await startCommandMode();
  };

  // 🔥 페이지 진입 시 자동 TTS 안내
  useEffect(() => {
    // 이전 TTS/STT 정리
    stopSTT();
    window.speechSynthesis.cancel();

    // 페이지별 초기 안내 (약간의 지연 후 실행)
    const timer = setTimeout(async () => {
      if (pathname.startsWith("/login")) {
        await speak("로그인 페이지입니다. 무엇을 도와드릴까요? 이메일 입력, 비밀번호 입력, 로그인, 회원가입, 게스트 둘러보기 등이 가능합니다.");
      } else if (pathname.startsWith("/signup")) {
        await speak("회원가입 페이지입니다. 무엇을 도와드릴까요? 이메일 입력, 비밀번호 입력, 비밀번호 확인 입력을 할 수 있습니다.");
      }
    }, 500); // 페이지 전환 후 안정화 대기

    return () => {
      clearTimeout(timer);
      stopSTT();
      window.speechSynthesis.cancel();
    };
  }, [pathname]);

  return {
    onMicButtonClick,
    isListeningCommand,
    isListeningField,
    isListening: isListeningCommand || isListeningField,
    lastCommandText,
    lastFieldText,
    currentStep: stepRef.current,
  };
}

