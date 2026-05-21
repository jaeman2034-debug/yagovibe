// src/voice/useVoiceIntentEngine.ts
// 🔥 사용자 주도 음성 Intent 엔진 (대화형 UI)

import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { detectVoiceIntent } from "./voiceIntents";
import { parseFullEmail } from "./parseFullEmail";
import { parsePassword } from "./parsePassword";

type VoiceStep = "idle" | "listening" | "email" | "password" | "confirm";

type UseVoiceIntentEngineOptions = {
  // TTS 함수
  speak: (text: string, onEnd?: () => void) => void;
  
  // Intent 테이블
  intents: Record<string, string[]>;
  
  // 상태 업데이트 콜백
  onEmailChange: (email: string) => void;
  onPasswordChange: (pw: string) => void;
  onConfirmPasswordChange?: (pw: string) => void;
  
  // 제출 콜백
  onSubmit: () => void;
  
  // 네비게이션 콜백 (선택적)
  onNavigate?: (path: string) => void;
};

type SR = SpeechRecognition | any;

declare global {
  interface Window {
    webkitSpeechRecognition?: any;
    SpeechRecognition?: any;
  }
}

/**
 * 🔥 사용자 주도 음성 Intent 엔진
 * - 사용자가 먼저 말함 → Intent 분석 → UI 반응
 * - TTS는 STT 입력 후 반응만 수행
 * - 유연한 단계 전환
 */
export function useVoiceIntentEngine({
  speak,
  intents,
  onEmailChange,
  onPasswordChange,
  onConfirmPasswordChange,
  onSubmit,
  onNavigate,
}: UseVoiceIntentEngineOptions) {
  const navigate = useNavigate();
  
  const [voiceStep, setVoiceStep] = useState<VoiceStep>("idle");
  const [isListening, setIsListening] = useState(false);
  const [preview, setPreview] = useState("");
  const [currentIntent, setCurrentIntent] = useState<string | null>(null);

  const recognitionRef = useRef<SR | null>(null);
  const stepRef = useRef<VoiceStep>("idle");
  const sttRunningRef = useRef(false);
  const ttsRunningRef = useRef(false);

  // STT 인스턴스 준비
  useEffect(() => {
    if (recognitionRef.current) return;
    
    const SRClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SRClass) {
      console.warn("[VoiceIntent] 브라우저가 음성 인식을 지원하지 않습니다.");
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
  const stopRecognition = useCallback(() => {
    const r = recognitionRef.current;
    if (!r || !sttRunningRef.current) return;
    
    try {
      r.onresult = null;
      r.onerror = null;
      r.onend = null;
      r.stop();
      console.log("[VoiceIntent] STT 정지");
    } catch (e) {
      console.warn("[VoiceIntent] stop() 실패:", e);
    } finally {
      sttRunningRef.current = false;
      setIsListening(false);
    }
  }, []);

  // STT 시작 (단계별 입력용)
  const startSTTForStep = useCallback((step: VoiceStep, onResult: (text: string) => void) => {
    const r = recognitionRef.current;
    if (!r) {
      console.warn("[VoiceIntent] recognizer 없음");
      return;
    }

    // TTS 실행 중이면 대기
    if (ttsRunningRef.current) {
      console.log("[VoiceIntent] TTS 실행 중 → 대기 후 재시도");
      setTimeout(() => startSTTForStep(step, onResult), 200);
      return;
    }

    stopRecognition();

    stepRef.current = step;
    setVoiceStep(step);
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

      console.log("[VoiceIntent] STT 결과:", trimmed, "step:", step);
      sttRunningRef.current = false;
      setIsListening(false);
      setPreview("");

      // 🔥 Intent 명령이 들어오면 Intent 처리로 전환
      const intent = detectVoiceIntent(trimmed, intents);
      if (intent) {
        handleVoiceCommand(trimmed, intent);
        return;
      }

      // 일반 입력 처리
      onResult(trimmed);
    };

    r.onerror = (event: any) => {
      const errorType = event.error;
      console.warn("[VoiceIntent] STT 에러:", errorType);
      sttRunningRef.current = false;
      setIsListening(false);
      setPreview("");

      // no-speech는 재시도하지 않음
      if (errorType === "no-speech") {
        console.log("[VoiceIntent] no-speech → idle로 전환");
        setVoiceStep("idle");
        return;
      }

      // 다른 오류는 재시도 안내
      speak("다시 말씀해주세요.", () => {
        setVoiceStep("idle");
      });
    };

    r.onend = () => {
      console.log("[VoiceIntent] STT onend");
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
          console.log("[VoiceIntent] STT 시작 (step:", step, ")");
        } catch (e) {
          console.warn("[VoiceIntent] start() 실패:", e);
          setTimeout(() => {
            try {
              r.start();
              sttRunningRef.current = true;
              setIsListening(true);
            } catch (e2) {
              console.error("[VoiceIntent] 재시도도 실패:", e2);
            }
          }, 150);
        }
      }, 300);
    };

    safeStart();
  }, [intents, speak, stopRecognition]);

  // 🔥 Voice Command 핸들러 (핵심 로직)
  const handleVoiceCommand = useCallback((text: string, intent: string) => {
    console.log("[VoiceIntent] Intent 감지:", intent, "원문:", text);
    setCurrentIntent(intent);

    switch (intent) {
      // 이메일 입력 열기
      case "open_email":
        speak("이메일 입력을 시작합니다.", () => {
          stepRef.current = "email";
          startSTTForStep("email", (inputText) => {
            const parsed = parseFullEmail(inputText);
            if (!parsed) {
              speak("이메일을 잘못 들었습니다. 다시 말씀해주세요.");
              return;
            }
            onEmailChange(parsed.email);
            speak(`이메일 ${parsed.email}을 입력했습니다.`);
            setVoiceStep("idle");
            stepRef.current = "idle";
          });
        });
        break;

      // 비밀번호 입력 열기
      case "open_password":
        speak("비밀번호를 입력해주세요.", () => {
          stepRef.current = "password";
          startSTTForStep("password", (inputText) => {
            const fixed = parsePassword(inputText);
            if (!fixed || fixed.length < 4) {
              speak("비밀번호가 너무 짧습니다. 다시 말씀해주세요.");
              return;
            }
            onPasswordChange(fixed);
            speak("비밀번호를 입력했습니다.");
            setVoiceStep("idle");
            stepRef.current = "idle";
          });
        });
        break;

      // 비밀번호 확인 입력 열기
      case "open_confirm":
        if (onConfirmPasswordChange) {
          speak("비밀번호 확인을 입력해주세요.", () => {
            stepRef.current = "confirm";
            startSTTForStep("confirm", (inputText) => {
              const fixed = parsePassword(inputText);
              if (!fixed || fixed.length < 4) {
                speak("비밀번호 확인이 너무 짧습니다. 다시 말씀해주세요.");
                return;
              }
              onConfirmPasswordChange(fixed);
              speak("비밀번호 확인을 입력했습니다.");
              setVoiceStep("idle");
              stepRef.current = "idle";
            });
          });
        }
        break;

      // 이메일 리셋
      case "reset_email":
        onEmailChange("");
        speak("이메일을 지웠습니다. 다시 입력해주세요.", () => {
          stepRef.current = "email";
          startSTTForStep("email", (inputText) => {
            const parsed = parseFullEmail(inputText);
            if (!parsed) {
              speak("이메일을 잘못 들었습니다. 다시 말씀해주세요.");
              return;
            }
            onEmailChange(parsed.email);
            speak(`이메일 ${parsed.email}을 입력했습니다.`);
            setVoiceStep("idle");
            stepRef.current = "idle";
          });
        });
        break;

      // 비밀번호 리셋
      case "reset_password":
        onPasswordChange("");
        speak("비밀번호를 지웠습니다. 다시 입력해주세요.", () => {
          stepRef.current = "password";
          startSTTForStep("password", (inputText) => {
            const fixed = parsePassword(inputText);
            if (!fixed || fixed.length < 4) {
              speak("비밀번호가 너무 짧습니다. 다시 말씀해주세요.");
              return;
            }
            onPasswordChange(fixed);
            speak("비밀번호를 입력했습니다.");
            setVoiceStep("idle");
            stepRef.current = "idle";
          });
        });
        break;

      // 비밀번호 확인 리셋
      case "reset_confirm":
        if (onConfirmPasswordChange) {
          onConfirmPasswordChange("");
          speak("비밀번호 확인을 지웠습니다. 다시 입력해주세요.", () => {
            stepRef.current = "confirm";
            startSTTForStep("confirm", (inputText) => {
              const fixed = parsePassword(inputText);
              if (!fixed || fixed.length < 4) {
                speak("비밀번호 확인이 너무 짧습니다. 다시 말씀해주세요.");
                return;
              }
              onConfirmPasswordChange(fixed);
              speak("비밀번호 확인을 입력했습니다.");
              setVoiceStep("idle");
              stepRef.current = "idle";
            });
          });
        }
        break;

      // 다음 단계
      case "next":
        const current = stepRef.current;
        if (current === "email") {
          speak("비밀번호를 입력해주세요.", () => {
            stepRef.current = "password";
            startSTTForStep("password", (inputText) => {
              const fixed = parsePassword(inputText);
              if (!fixed || fixed.length < 4) {
                speak("비밀번호가 너무 짧습니다. 다시 말씀해주세요.");
                return;
              }
              onPasswordChange(fixed);
              speak("비밀번호를 입력했습니다.");
              setVoiceStep("idle");
              stepRef.current = "idle";
            });
          });
        } else if (current === "password" && onConfirmPasswordChange) {
          speak("비밀번호 확인을 입력해주세요.", () => {
            stepRef.current = "confirm";
            startSTTForStep("confirm", (inputText) => {
              const fixed = parsePassword(inputText);
              if (!fixed || fixed.length < 4) {
                speak("비밀번호 확인이 너무 짧습니다. 다시 말씀해주세요.");
                return;
              }
              onConfirmPasswordChange(fixed);
              speak("비밀번호 확인을 입력했습니다.");
              setVoiceStep("idle");
              stepRef.current = "idle";
            });
          });
        } else {
          speak("다음 단계가 없습니다.");
        }
        break;

      // 이전 단계
      case "back":
        const currentStep = stepRef.current;
        if (currentStep === "password") {
          speak("이메일을 입력해주세요.", () => {
            stepRef.current = "email";
            startSTTForStep("email", (inputText) => {
              const parsed = parseFullEmail(inputText);
              if (!parsed) {
                speak("이메일을 잘못 들었습니다. 다시 말씀해주세요.");
                return;
              }
              onEmailChange(parsed.email);
              speak(`이메일 ${parsed.email}을 입력했습니다.`);
              setVoiceStep("idle");
              stepRef.current = "idle";
            });
          });
        } else if (currentStep === "confirm") {
          speak("비밀번호를 입력해주세요.", () => {
            stepRef.current = "password";
            startSTTForStep("password", (inputText) => {
              const fixed = parsePassword(inputText);
              if (!fixed || fixed.length < 4) {
                speak("비밀번호가 너무 짧습니다. 다시 말씀해주세요.");
                return;
              }
              onPasswordChange(fixed);
              speak("비밀번호를 입력했습니다.");
              setVoiceStep("idle");
              stepRef.current = "idle";
            });
          });
        } else {
          speak("이전 단계가 없습니다.");
        }
        break;

      // 제출
      case "submit_signup":
      case "submit_login":
        speak("가입을 진행합니다.", () => {
          onSubmit();
        });
        break;

      // 네비게이션
      case "go_login":
        if (onNavigate) {
          onNavigate("/login");
        } else {
          navigate("/login");
        }
        break;

      case "go_home":
        if (onNavigate) {
          onNavigate("/");
        } else {
          navigate("/");
        }
        break;

      case "go_signup":
        if (onNavigate) {
          onNavigate("/signup");
        } else {
          navigate("/signup");
        }
        break;

      case "go_guest":
        if (onNavigate) {
          onNavigate("/start");
        } else {
          navigate("/start");
        }
        break;

      // 취소
      case "cancel":
        stopRecognition();
        speak("취소되었습니다.");
        setVoiceStep("idle");
        break;

      default:
        console.warn("[VoiceIntent] 알 수 없는 Intent:", intent);
        speak("다시 말씀해주세요.");
    }
  }, [
    speak,
    intents,
    onEmailChange,
    onPasswordChange,
    onConfirmPasswordChange,
    onSubmit,
    onNavigate,
    navigate,
    startSTTForStep,
    stopRecognition,
  ]);

  // 🔥 마이크 버튼 클릭 → Intent 감지 모드 시작
  const startVoiceCommand = useCallback(() => {
    console.log("[VoiceIntent] 음성 명령 시작");
    stopRecognition();
    ttsRunningRef.current = true;
    speak("무엇을 도와드릴까요?", () => {
      ttsRunningRef.current = false;
      startSTTForStep("listening", (text) => {
        const intent = detectVoiceIntent(text, intents);
        if (intent) {
          handleVoiceCommand(text, intent);
        } else {
          speak("다시 말씀해주세요. 예: 이메일 입력, 비밀번호 입력, 가입하기");
          setVoiceStep("idle");
        }
      });
    });
  }, [speak, intents, startSTTForStep, stopRecognition, handleVoiceCommand]);

  // 페이지 진입 시 정리
  useEffect(() => {
    stopRecognition();
    window.speechSynthesis.cancel();
    ttsRunningRef.current = false;
    setVoiceStep("idle");
    setIsListening(false);
    setPreview("");
    setCurrentIntent(null);

    return () => {
      stopRecognition();
      window.speechSynthesis.cancel();
      ttsRunningRef.current = false;
    };
  }, [stopRecognition]);

  return {
    voiceStep,
    isListening,
    preview,
    currentIntent,
    startVoiceCommand,
  };
}

