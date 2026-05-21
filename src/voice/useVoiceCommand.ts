// src/voice/useVoiceCommand.ts
import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { detectLoginIntent, type LoginIntent } from "./detectLoginIntent";
import { parseFullEmail } from "./parseFullEmail";
import { parsePassword } from "./parsePassword";

type VoiceStep = "idle" | "listening" | "processing" | "email_input" | "password_input" | "confirm_password_input";

type UseVoiceCommandOptions = {
  speak: (text: string, onEnd?: () => void) => void;
  onEmailChange: (email: string) => void;
  onPasswordChange: (pw: string) => void;
  onConfirmPasswordChange?: (pw: string) => void; // 회원가입용
  onSubmit: () => void;
  onIntentDetected?: (intent: LoginIntent) => void;
  mode?: "login" | "signup"; // 로그인 모드 또는 회원가입 모드
};

type SR = SpeechRecognition | any;

declare global {
  interface Window {
    webkitSpeechRecognition?: any;
    SpeechRecognition?: any;
  }
}

export function useVoiceCommand({
  speak,
  onEmailChange,
  onPasswordChange,
  onConfirmPasswordChange,
  onSubmit,
  onIntentDetected,
  mode = "login",
}: UseVoiceCommandOptions) {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;
  const [voiceStep, setVoiceStep] = useState<VoiceStep>("idle");
  const [isListening, setIsListening] = useState(false);
  const [preview, setPreview] = useState("");
  const [currentIntent, setCurrentIntent] = useState<LoginIntent | null>(null);

  const recognitionRef = useRef<SR | null>(null);
  const hasProcessedFinalRef = useRef(false);
  const stepRef = useRef<VoiceStep>("idle");
  const sttRunningRef = useRef(false);
  const passwordRetryCountRef = useRef(0);
  const confirmPasswordRetryCountRef = useRef(0);
  const ttsRunningRef = useRef(false); // TTS 실행 중 플래그
  const MAX_PASSWORD_RETRIES = 2;

  // STT 인스턴스 준비
  useEffect(() => {
    if (recognitionRef.current) return;

    const SRClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SRClass) {
      console.warn("Browser STT not supported");
      return;
    }

    const r: SR = new SRClass();
    r.lang = "ko-KR";
    r.interimResults = true;
    r.maxAlternatives = 1;

    recognitionRef.current = r;
  }, []);

  // STT stop
  const stopRecognition = () => {
    const r = recognitionRef.current;
    if (!r || !sttRunningRef.current) return;

    try {
      r.onresult = null;
      r.onerror = null;
      r.onend = null;
      r.stop();
      console.log("[STT] stopRecognition 호출");
    } catch (e) {
      console.warn("[STT] stop() 실패", e);
    } finally {
      sttRunningRef.current = false;
      setIsListening(false);
    }
  };

  // Intent 처리 (현재 경로 기반 분기)
  const handleIntent = (intent: LoginIntent, text: string) => {
    console.log("[Intent] 감지됨:", intent, "원문:", text, "현재 경로:", currentPath);
    setCurrentIntent(intent);
    onIntentDetected?.(intent);

    // 🔥 회원가입 페이지 내에서의 세부 Intent 처리
    if (currentPath === "/signup" || mode === "signup") {
      switch (intent) {
        case "email_input":
          // 🔥 회원가입 모드에서 이메일 수정/재입력: 기존 값 초기화
          if (mode === "signup" && onEmailChange) {
            onEmailChange(""); // 기존 이메일 값 초기화
            console.log("[VoiceCommand] 이메일 초기화 (재입력 모드)");
          }
          ttsRunningRef.current = true;
          speak("이메일을 말씀해주세요.", () => {
            ttsRunningRef.current = false;
            setTimeout(() => beginListening("email_input", 400), 300);
          });
          return;

        case "password_input":
          // 🔥 회원가입 모드에서 비밀번호 수정/재입력: 기존 값 초기화
          if (mode === "signup" && onPasswordChange) {
            onPasswordChange(""); // 기존 비밀번호 값 초기화
            console.log("[VoiceCommand] 비밀번호 초기화 (재입력 모드)");
          }
          ttsRunningRef.current = true;
          speak("비밀번호를 말씀해주세요.", () => {
            ttsRunningRef.current = false;
            setTimeout(() => beginListening("password_input", 400), 300);
          });
          return;

        case "confirm_password_input":
          // 🔥 회원가입 모드에서 비밀번호 확인 수정/재입력: 기존 값 초기화
          if (mode === "signup" && onConfirmPasswordChange) {
            onConfirmPasswordChange(""); // 기존 비밀번호 확인 값 초기화
            console.log("[VoiceCommand] 비밀번호 확인 초기화 (재입력 모드)");
          }
          ttsRunningRef.current = true;
          speak("비밀번호 확인을 말씀해주세요.", () => {
            ttsRunningRef.current = false;
            setTimeout(() => beginListening("confirm_password_input", 400), 300);
          });
          return;

        case "email_login":
          // 회원가입 페이지에서 "로그인으로" 명령
          speak("로그인 페이지로 이동합니다.", () => {
            navigate("/login");
          });
          return;

        case "cancel":
          speak("취소되었습니다.");
          setVoiceStep("idle");
          return;

        // 회원가입 페이지에서 다른 Intent는 무시 (로그인, 회원가입, 게스트 등)
        case "signup":
        case "phone_login":
        case "forgot_password":
        case "guest":
          speak("회원가입 페이지에서는 이 명령을 사용할 수 없습니다. 예: 이메일 입력, 비밀번호 입력");
          setVoiceStep("idle");
          return;

        // 회원가입 페이지에서 다른 Intent는 무시
        default:
          // 이메일 형식이면 바로 입력으로 처리
          const parsed = parseFullEmail(text);
          if (parsed) {
            onEmailChange(parsed.email);
            ttsRunningRef.current = true;
            speak("이메일을 확인했습니다. 비밀번호를 말씀해주세요.", () => {
              ttsRunningRef.current = false;
              setTimeout(() => beginListening("password_input", 400), 300);
            });
            return;
          }
          speak("다시 말씀해주세요. 예: 이메일 입력, 비밀번호 입력, 비밀번호 확인 입력");
          setVoiceStep("idle");
          return;
      }
    }

    // 🔥 로그인 페이지 또는 다른 페이지에서의 Intent 처리
    switch (intent) {
      case "signup":
        speak("회원가입 페이지로 이동합니다.", () => {
          navigate("/signup");
        });
        break;

      case "phone_login":
        speak("전화번호 로그인 페이지로 이동합니다.", () => {
          navigate("/phone-login");
        });
        break;

      case "forgot_password":
        speak("비밀번호 찾기 페이지로 이동합니다.", () => {
          navigate("/forgot-password");
        });
        break;

      case "guest":
        speak("게스트 모드로 둘러보기를 시작합니다.", () => {
          navigate("/start");
        });
        break;

      case "cancel":
        speak("취소되었습니다.");
        setVoiceStep("idle");
        break;

      case "email_login":
        // 이메일 로그인 시작
        ttsRunningRef.current = true;
        speak("이메일을 말씀해주세요.", () => {
          ttsRunningRef.current = false;
          setTimeout(() => beginListening("email_input", 400), 300);
        });
        break;

      case "email_input":
        // 이메일 입력 시작 (로그인 페이지)
        ttsRunningRef.current = true;
        speak("이메일을 말씀해주세요.", () => {
          ttsRunningRef.current = false;
          setTimeout(() => beginListening("email_input", 400), 300);
        });
        break;

      case "password_input":
        // 비밀번호 입력 시작 (로그인 페이지)
        ttsRunningRef.current = true;
        speak("비밀번호를 말씀해주세요.", () => {
          ttsRunningRef.current = false;
          setTimeout(() => beginListening("password_input", 400), 300);
        });
        break;

      default:
        // 알 수 없는 명령이지만 이메일 형식이면 이메일 입력으로 처리
        const parsed = parseFullEmail(text);
        if (parsed) {
          onEmailChange(parsed.email);
          speak("이메일을 확인했습니다. 비밀번호를 말씀해주세요.", () => {
            beginListening("password_input");
          });
        } else {
          speak("다시 말씀해주세요.");
          setVoiceStep("idle");
        }
    }
  };

  // 이메일 입력 처리
  const handleEmailInput = (text: string) => {
    if (text.length < 5) {
      ttsRunningRef.current = true;
      speak("이메일이 너무 짧습니다. 다시 말씀해주세요.", () => {
        ttsRunningRef.current = false;
        setTimeout(() => beginListening("email_input", 400), 300);
      });
      return;
    }

    const parsed = parseFullEmail(text);
    if (!parsed) {
      ttsRunningRef.current = true;
      speak("이메일을 잘못 들었습니다. 다시 말씀해주세요.", () => {
        ttsRunningRef.current = false;
        setTimeout(() => beginListening("email_input", 400), 300);
      });
      return;
    }

    onEmailChange(parsed.email);
    console.log("[STT] 이메일 파싱 성공:", parsed.email);
    setVoiceStep("idle");

    // 🔥 회원가입 모드에서는 자동으로 비밀번호 단계로 넘어가지 않음 (사용자가 명시적으로 말할 때만)
    if (mode === "signup") {
      speak("이메일을 확인했습니다. 비밀번호를 입력하려면 마이크 버튼을 누르고 '비밀번호 입력'이라고 말씀해주세요.", () => {
        // idle 상태 유지
      });
    } else {
      // 로그인 모드: 자동으로 비밀번호 단계로
      ttsRunningRef.current = true;
      speak("이메일을 확인했습니다. 비밀번호를 말씀해주세요.", () => {
        ttsRunningRef.current = false;
        setTimeout(() => beginListening("password_input", 400), 300);
      });
    }
  };

  // 비밀번호 입력 처리
  const handlePasswordInput = (text: string) => {
    const fixed = parsePassword(text);
    console.log("[STT] 비밀번호 파싱 결과:", fixed);

    if (!fixed || fixed.length < 4) {
      retryPassword("shortOrEmpty", fixed);
      return;
    }

    passwordRetryCountRef.current = 0;
    onPasswordChange(fixed);
    setVoiceStep("idle");
    console.log("[STT] 비밀번호 파싱 성공:", fixed);

    if (mode === "signup") {
      // 회원가입 모드: 비밀번호 확인 단계 안내 (자동 시작하지 않음 - no-speech 무한 루프 방지)
      speak("비밀번호를 확인했습니다. 비밀번호 확인을 입력하려면 마이크 버튼을 누르고 '비밀번호 확인 입력'이라고 말씀해주세요.", () => {
        // 🔥 자동으로 STT 시작하지 않고 idle 상태 유지
      });
    } else {
      // 로그인 모드: 바로 로그인
      speak("입력 완료. 로그인을 진행합니다.", () => {
        onSubmit();
      });
    }
  };

  // 비밀번호 확인 입력 처리 (회원가입 전용)
  const handleConfirmPasswordInput = (text: string) => {
    const fixed = parsePassword(text);
    console.log("[STT] 비밀번호 확인 파싱 결과:", fixed);

    if (!fixed || fixed.length < 4) {
      ttsRunningRef.current = true;
      speak("비밀번호 확인이 너무 짧습니다. 다시 말씀해주세요.", () => {
        ttsRunningRef.current = false;
        setTimeout(() => beginListening("confirm_password_input", 400), 300);
      });
      return;
    }

    if (onConfirmPasswordChange) {
      onConfirmPasswordChange(fixed);
    }
    setVoiceStep("idle");
    console.log("[STT] 비밀번호 확인 파싱 성공:", fixed);

    speak("비밀번호 확인이 완료되었습니다. 회원가입을 진행합니다.", () => {
      onSubmit();
    });
  };

  // 비밀번호 재시도
  const retryPassword = (reason: "shortOrEmpty" | "error", fixed?: string) => {
    passwordRetryCountRef.current += 1;
    console.log(
      `[STT] 비밀번호 실패 (${reason}, ${
        fixed?.length || 0
      }자) → 재시도 ${passwordRetryCountRef.current}/${MAX_PASSWORD_RETRIES}`
    );

    if (passwordRetryCountRef.current > MAX_PASSWORD_RETRIES) {
      console.log("[STT] 비밀번호 최대 재시도 초과 → 수동 입력 전환");
      speak("수동 입력으로 전환합니다.");
      setVoiceStep("idle");
      return;
    }

    speak("비밀번호를 다시 말씀해주세요.", () => {
      beginListening("password_input");
    });
  };

  // STT 시작 (TTS 완료 후 안전하게 시작)
  const beginListening = (step: VoiceStep, delay: number = 400) => {
    const r = recognitionRef.current;
    if (!r) {
      console.warn("[STT] recognizer 없음");
      return;
    }

    // 🔥 TTS가 실행 중이면 대기
    if (ttsRunningRef.current) {
      console.log("[STT] TTS 실행 중 → 대기 후 재시도");
      setTimeout(() => beginListening(step, delay), 200);
      return;
    }

    stopRecognition();

    stepRef.current = step;
    setVoiceStep(step);
    hasProcessedFinalRef.current = false;
    setPreview("");

    r.onresult = (event: any) => {
      let text = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        text += event.results[i][0].transcript;
      }
      const trimmed = text.trim();
      setPreview(trimmed);

      const last = event.results[event.results.length - 1];
      const isFinal = last.isFinal;

      if (!isFinal) return;

      if (hasProcessedFinalRef.current) {
        console.log("[STT] 추가 finalResult 무시:", trimmed);
        return;
      }
      hasProcessedFinalRef.current = true;
      sttRunningRef.current = false;
      setIsListening(false);
      setPreview("");

      const currentStep = stepRef.current;
      console.log("[STT] finalResult:", trimmed, "step:", currentStep);

      if (currentStep === "listening") {
        // Intent 감지 단계 (현재 경로 전달)
        const intent = detectLoginIntent(trimmed, currentPath);
        handleIntent(intent, trimmed);
      } else if (currentStep === "email_input") {
        handleEmailInput(trimmed);
      } else if (currentStep === "password_input") {
        // 🔥 비밀번호 입력 중에도 "이메일 다시" 같은 Intent 명령이 들어올 수 있음
        const intent = detectLoginIntent(trimmed, currentPath);
        if (intent === "email_input") {
          // 이메일 재입력 명령이면 이메일 단계로 전환
          handleIntent(intent, trimmed);
          return;
        }
        handlePasswordInput(trimmed);
      } else if (currentStep === "confirm_password_input") {
        // 🔥 비밀번호 확인 입력 중에도 "이메일 다시", "비밀번호 다시" 같은 Intent 명령이 들어올 수 있음
        const intent = detectLoginIntent(trimmed, currentPath);
        if (intent === "email_input" || intent === "password_input") {
          // 이메일/비밀번호 재입력 명령이면 해당 단계로 전환
          handleIntent(intent, trimmed);
          return;
        }
        handleConfirmPasswordInput(trimmed);
      }
    };

    r.onerror = (event: any) => {
      const errorType = event.error;
      console.warn("[STT] 에러:", errorType);
      sttRunningRef.current = false;
      setIsListening(false);
      setPreview("");

      const currentStep = stepRef.current;

      // 🔥 no-speech 오류는 재시도하지 않고 idle로 전환 (무한 루프 방지)
      if (errorType === "no-speech") {
        console.log("[STT] no-speech 감지 → 재시도하지 않고 idle로 전환");
        setVoiceStep("idle");
        return; // 재시도하지 않음
      }

      // 다른 오류는 기존 로직대로 처리
      if (currentStep === "password_input") {
        retryPassword("error");
      } else if (currentStep === "confirm_password_input") {
        // confirm_password_input도 no-speech가 아니면 재시도
        ttsRunningRef.current = true;
        speak("비밀번호 확인을 다시 말씀해주세요.", () => {
          ttsRunningRef.current = false;
          setTimeout(() => beginListening("confirm_password_input", 400), 300);
        });
      } else {
        speak("다시 말씀해주세요.", () => {
          setVoiceStep("idle");
        });
      }
    };

    r.onend = () => {
      console.log("[STT] onend 발생");
      sttRunningRef.current = false;
      setIsListening(false);
    };

    // 🔥 안전한 STT 시작: stop → delay → start
    const safeStart = () => {
      try {
        r.stop(); // 먼저 정지
      } catch {}
      
      setTimeout(() => {
        try {
          r.start();
          sttRunningRef.current = true;
          setIsListening(true);
          console.log("[STT] start() 성공 (step:", step, ")");
        } catch (e) {
          console.warn("[STT] start() 실패:", e);
          // 재시도
          setTimeout(() => {
            try {
              r.start();
              sttRunningRef.current = true;
              setIsListening(true);
            } catch (e2) {
              console.error("[STT] 재시도도 실패:", e2);
            }
          }, 150);
        }
      }, delay);
    };

    safeStart();
  };

  // 단일 마이크 버튼 클릭 핸들러
  const startVoiceCommand = () => {
    console.log("[VoiceCommand] 시작");
    stopRecognition();
    ttsRunningRef.current = true;
    speak("무엇을 도와드릴까요? 예: 로그인, 회원가입, 게스트 둘러보기", () => {
      ttsRunningRef.current = false;
      setTimeout(() => beginListening("listening", 400), 300);
    });
  };

  // 🔥 페이지 이동 시 이전 STT/TTS 완전 정리
  useEffect(() => {
    // 경로 변경 시 이전 음성 명령 정리
    stopRecognition();
    window.speechSynthesis.cancel();
    ttsRunningRef.current = false;
    setVoiceStep("idle");
    setIsListening(false);
    setPreview("");
    setCurrentIntent(null);
    console.log("[VoiceCommand] 페이지 변경 감지, 이전 음성 명령 정리:", currentPath);
  }, [currentPath]);

  // 언마운트 시 정리
  useEffect(() => {
    return () => {
      stopRecognition();
      window.speechSynthesis.cancel();
      ttsRunningRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 직접 입력 함수들 (회원가입/로그인 페이지에서 버튼 클릭 시 사용)
  const startVoiceEmail = () => {
    console.log("[VoiceCommand] 이메일 입력 시작");
    stopRecognition();
    ttsRunningRef.current = true;
    speak("이메일을 말씀해주세요.", () => {
      ttsRunningRef.current = false;
      setTimeout(() => beginListening("email_input", 400), 300);
    });
  };

  const startVoicePassword = () => {
    console.log("[VoiceCommand] 비밀번호 입력 시작");
    stopRecognition();
    ttsRunningRef.current = true;
    speak("비밀번호를 말씀해주세요.", () => {
      ttsRunningRef.current = false;
      setTimeout(() => beginListening("password_input", 400), 300);
    });
  };

  const startVoiceConfirmPassword = () => {
    if (mode === "signup") {
      console.log("[VoiceCommand] 비밀번호 확인 입력 시작");
      stopRecognition();
      ttsRunningRef.current = true;
      speak("비밀번호 확인을 말씀해주세요.", () => {
        ttsRunningRef.current = false;
        setTimeout(() => beginListening("confirm_password_input", 400), 300);
      });
    }
  };

  return {
    voiceStep,
    isListening,
    preview,
    currentIntent,
    startVoiceCommand,
    startVoiceEmail,
    startVoicePassword,
    startVoiceConfirmPassword,
  };
}

