// src/voice/usePageVoiceCommand.ts
// 🔥 페이지별 독립적인 음성 명령 시스템 (천재 모드 완성본)

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { parseFullEmail } from "./parseFullEmail";
import { parsePassword } from "./parsePassword";

type VoiceStep = "idle" | "listening" | "email_input" | "password_input" | "confirm_password_input";

type PageIntent = string;

type UsePageVoiceCommandOptions = {
  // TTS 함수
  speak: (text: string, onEnd?: () => void) => void;
  
  // Intent 테이블 (페이지별로 다름)
  intents: Record<string, string[]>;
  
  // Intent 처리 핸들러
  onIntent: (intent: string, text: string) => void;
  
  // 입력 콜백
  onEmailChange?: (email: string) => void;
  onPasswordChange?: (pw: string) => void;
  onConfirmPasswordChange?: (pw: string) => void;
  
  // 제출 콜백
  onSubmit?: () => void;
  
  // 페이지 진입 시 초기 안내
  initialMessage?: string;
};

type SR = SpeechRecognition | any;

declare global {
  interface Window {
    webkitSpeechRecognition?: any;
    SpeechRecognition?: any;
  }
}

/**
 * 🔥 페이지별 독립적인 음성 명령 시스템
 * - 각 페이지마다 완전히 독립적인 Intent 테이블
 * - 페이지 이동 시 자동으로 이전 시스템 정리
 * - FSM 기반 단계 관리
 */
export function usePageVoiceCommand({
  speak,
  intents,
  onIntent,
  onEmailChange,
  onPasswordChange,
  onConfirmPasswordChange,
  onSubmit,
  initialMessage,
}: UsePageVoiceCommandOptions) {
  const navigate = useNavigate();
  
  const [voiceStep, setVoiceStep] = useState<VoiceStep>("idle");
  const [isListening, setIsListening] = useState(false);
  const [preview, setPreview] = useState("");
  const [currentIntent, setCurrentIntent] = useState<string | null>(null);

  const recognitionRef = useRef<SR | null>(null);
  const hasProcessedFinalRef = useRef(false);
  const stepRef = useRef<VoiceStep>("idle");
  const sttRunningRef = useRef(false);
  const ttsRunningRef = useRef(false);
  const passwordRetryCountRef = useRef(0);
  const confirmPasswordRetryCountRef = useRef(0);
  const MAX_RETRIES = 2;

  // 🔥 Intent 매칭 함수 (페이지별 Intent 테이블 사용)
  const matchIntent = (text: string): string | null => {
    const normalized = text.toLowerCase().trim();
    
    for (const [intentKey, patterns] of Object.entries(intents)) {
      for (const pattern of patterns) {
        const regex = new RegExp(pattern.toLowerCase().replace(/\s+/g, ".*"));
        if (regex.test(normalized)) {
          return intentKey;
        }
      }
    }
    
    return null;
  };

  // STT 인스턴스 준비
  useEffect(() => {
    if (recognitionRef.current) return;
    
    const SRClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SRClass) {
      console.warn("[PageVoice] 브라우저가 음성 인식을 지원하지 않습니다.");
      return;
    }

    const r: SR = new SRClass();
    r.lang = "ko-KR";
    r.continuous = false;
    r.interimResults = true;
    r.maxAlternatives = 1;
    
    recognitionRef.current = r;
  }, []);

  // STT 정지
  const stopRecognition = () => {
    const r = recognitionRef.current;
    if (!r || !sttRunningRef.current) return;
    
    try {
      r.onresult = null;
      r.onerror = null;
      r.onend = null;
      r.stop();
      console.log("[PageVoice] STT 정지");
    } catch (e) {
      console.warn("[PageVoice] stop() 실패:", e);
    } finally {
      sttRunningRef.current = false;
      setIsListening(false);
    }
  };

  // STT 시작 (안전한 시작)
  const beginListening = (step: VoiceStep, delay: number = 400) => {
    const r = recognitionRef.current;
    if (!r) {
      console.warn("[PageVoice] recognizer 없음");
      return;
    }

    // TTS 실행 중이면 대기
    if (ttsRunningRef.current) {
      console.log("[PageVoice] TTS 실행 중 → 대기 후 재시도");
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
        console.log("[PageVoice] 추가 finalResult 무시:", trimmed);
        return;
      }
      
      hasProcessedFinalRef.current = true;
      sttRunningRef.current = false;
      setIsListening(false);
      setPreview("");

      const currentStep = stepRef.current;
      console.log("[PageVoice] finalResult:", trimmed, "step:", currentStep);

      if (currentStep === "listening") {
        // Intent 감지 단계
        const intent = matchIntent(trimmed);
        if (intent) {
          setCurrentIntent(intent);
          onIntent(intent, trimmed);
        } else {
          speak("다시 말씀해주세요.");
          setVoiceStep("idle");
        }
      } else if (currentStep === "email_input") {
        handleEmailInput(trimmed);
      } else if (currentStep === "password_input") {
        handlePasswordInput(trimmed);
      } else if (currentStep === "confirm_password_input") {
        handleConfirmPasswordInput(trimmed);
      }
    };

    r.onerror = (event: any) => {
      console.warn("[PageVoice] STT 에러:", event.error);
      sttRunningRef.current = false;
      setIsListening(false);
      setPreview("");

      const currentStep = stepRef.current;
      if (currentStep === "password_input") {
        retryPassword("error");
      } else if (currentStep === "confirm_password_input") {
        retryConfirmPassword("error");
      } else {
        speak("다시 말씀해주세요.", () => {
          setVoiceStep("idle");
        });
      }
    };

    r.onend = () => {
      console.log("[PageVoice] STT onend");
      sttRunningRef.current = false;
      setIsListening(false);
    };

    // 안전한 STT 시작
    const safeStart = () => {
      try {
        r.stop();
      } catch {}
      
      setTimeout(() => {
        try {
          r.start();
          sttRunningRef.current = true;
          setIsListening(true);
          console.log("[PageVoice] STT 시작 (step:", step, ")");
        } catch (e) {
          console.warn("[PageVoice] start() 실패:", e);
          setTimeout(() => {
            try {
              r.start();
              sttRunningRef.current = true;
              setIsListening(true);
            } catch (e2) {
              console.error("[PageVoice] 재시도도 실패:", e2);
            }
          }, 150);
        }
      }, delay);
    };

    safeStart();
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

    onEmailChange?.(parsed.email);
    console.log("[PageVoice] 이메일 파싱 성공:", parsed.email);
    setVoiceStep("idle");

    ttsRunningRef.current = true;
    speak("이메일을 확인했습니다. 비밀번호를 말씀해주세요.", () => {
      ttsRunningRef.current = false;
      setTimeout(() => beginListening("password_input", 400), 300);
    });
  };

  // 비밀번호 입력 처리
  const handlePasswordInput = (text: string) => {
    const fixed = parsePassword(text);
    console.log("[PageVoice] 비밀번호 파싱 결과:", fixed);

    if (!fixed || fixed.length < 4) {
      retryPassword("shortOrEmpty", fixed);
      return;
    }

    passwordRetryCountRef.current = 0;
    onPasswordChange?.(fixed);
    setVoiceStep("idle");
    console.log("[PageVoice] 비밀번호 파싱 성공:", fixed);

    // 비밀번호 확인이 필요한 경우 (회원가입)
    if (onConfirmPasswordChange) {
      ttsRunningRef.current = true;
      speak("비밀번호를 확인했습니다. 비밀번호 확인을 말씀해주세요.", () => {
        ttsRunningRef.current = false;
        setTimeout(() => beginListening("confirm_password_input", 400), 300);
      });
    } else {
      // 로그인 모드: 바로 제출
      speak("입력 완료. 로그인을 진행합니다.", () => {
        onSubmit?.();
      });
    }
  };

  // 비밀번호 확인 입력 처리
  const handleConfirmPasswordInput = (text: string) => {
    const fixed = parsePassword(text);
    console.log("[PageVoice] 비밀번호 확인 파싱 결과:", fixed);

    if (!fixed || fixed.length < 4) {
      retryConfirmPassword("shortOrEmpty", fixed);
      return;
    }

    confirmPasswordRetryCountRef.current = 0;
    onConfirmPasswordChange?.(fixed);
    setVoiceStep("idle");
    console.log("[PageVoice] 비밀번호 확인 파싱 성공:", fixed);

    speak("비밀번호 확인이 완료되었습니다. 회원가입을 진행합니다.", () => {
      onSubmit?.();
    });
  };

  // 비밀번호 재시도
  const retryPassword = (reason: "shortOrEmpty" | "error", fixed?: string) => {
    passwordRetryCountRef.current += 1;
    console.log(
      `[PageVoice] 비밀번호 실패 (${reason}, ${fixed?.length || 0}자) → 재시도 ${passwordRetryCountRef.current}/${MAX_RETRIES}`
    );

    if (passwordRetryCountRef.current > MAX_RETRIES) {
      console.log("[PageVoice] 비밀번호 최대 재시도 초과 → 수동 입력 전환");
      speak("수동 입력으로 전환합니다.");
      setVoiceStep("idle");
      return;
    }

    ttsRunningRef.current = true;
    speak("다시 말씀해주세요.", () => {
      ttsRunningRef.current = false;
      setTimeout(() => beginListening("password_input", 400), 300);
    });
  };

  // 비밀번호 확인 재시도
  const retryConfirmPassword = (reason: "shortOrEmpty" | "error", fixed?: string) => {
    confirmPasswordRetryCountRef.current += 1;
    console.log(
      `[PageVoice] 비밀번호 확인 실패 (${reason}, ${fixed?.length || 0}자) → 재시도 ${confirmPasswordRetryCountRef.current}/${MAX_RETRIES}`
    );

    if (confirmPasswordRetryCountRef.current > MAX_RETRIES) {
      console.log("[PageVoice] 비밀번호 확인 최대 재시도 초과 → 수동 입력 전환");
      speak("수동 입력으로 전환합니다.");
      setVoiceStep("idle");
      return;
    }

    ttsRunningRef.current = true;
    speak("비밀번호 확인을 다시 말씀해주세요.", () => {
      ttsRunningRef.current = false;
      setTimeout(() => beginListening("confirm_password_input", 400), 300);
    });
  };

  // 단일 마이크 버튼 클릭 핸들러
  const startVoiceCommand = () => {
    console.log("[PageVoice] 음성 명령 시작");
    stopRecognition();
    ttsRunningRef.current = true;
    speak("무엇을 도와드릴까요?", () => {
      ttsRunningRef.current = false;
      setTimeout(() => beginListening("listening", 400), 300);
    });
  };

  // 직접 입력 함수들
  const startVoiceEmail = () => {
    console.log("[PageVoice] 이메일 입력 시작");
    stopRecognition();
    ttsRunningRef.current = true;
    speak("이메일을 말씀해주세요.", () => {
      ttsRunningRef.current = false;
      setTimeout(() => beginListening("email_input", 400), 300);
    });
  };

  const startVoicePassword = () => {
    console.log("[PageVoice] 비밀번호 입력 시작");
    stopRecognition();
    ttsRunningRef.current = true;
    speak("비밀번호를 말씀해주세요.", () => {
      ttsRunningRef.current = false;
      setTimeout(() => beginListening("password_input", 400), 300);
    });
  };

  const startVoiceConfirmPassword = () => {
    if (onConfirmPasswordChange) {
      console.log("[PageVoice] 비밀번호 확인 입력 시작");
      stopRecognition();
      ttsRunningRef.current = true;
      speak("비밀번호 확인을 말씀해주세요.", () => {
        ttsRunningRef.current = false;
        setTimeout(() => beginListening("confirm_password_input", 400), 300);
      });
    }
  };

  // 🔥 페이지 진입 시 완전한 정리 및 초기화
  useEffect(() => {
    // 이전 페이지의 음성 명령 완전히 정리
    stopRecognition();
    window.speechSynthesis.cancel();
    ttsRunningRef.current = false;
    setVoiceStep("idle");
    setIsListening(false);
    setPreview("");
    setCurrentIntent(null);
    
    console.log("[PageVoice] 페이지 진입 - 이전 음성 명령 정리 완료");

    // 초기 안내 메시지 (선택적)
    if (initialMessage) {
      const timer = setTimeout(() => {
        if (voiceStep === "idle" && !isListening) {
          speak(initialMessage);
        }
      }, 500);

      return () => {
        clearTimeout(timer);
        stopRecognition();
        window.speechSynthesis.cancel();
        ttsRunningRef.current = false;
      };
    }

    return () => {
      stopRecognition();
      window.speechSynthesis.cancel();
      ttsRunningRef.current = false;
    };
  }, []); // 페이지 진입 시 한 번만 실행

  // 언마운트 시 정리
  useEffect(() => {
    return () => {
      stopRecognition();
      window.speechSynthesis.cancel();
      ttsRunningRef.current = false;
    };
  }, []);

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

