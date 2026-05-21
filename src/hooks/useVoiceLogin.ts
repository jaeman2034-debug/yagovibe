// useVoiceLogin.ts
import { useEffect, useRef, useState } from "react";
import { parseFullEmail } from "@/utils/parseFullEmail";
import { parsePassword } from "@/utils/parsePassword";

type VoiceStep = "idle" | "listenEmail" | "listenPassword";

type UseVoiceLoginOptions = {
  speak: (text: string, onEnd?: () => void) => void;
  onEmailChange: (email: string) => void;
  onPasswordChange: (pw: string) => void;
  onSubmit: () => void; // 이메일+비번 세팅 후 자동 로그인 호출
};

type SpeechRecognitionType =
  | (SpeechRecognition & {
      webkitSpeechRecognition?: never;
    })
  | (webkitSpeechRecognition & {
      SpeechRecognition?: never;
    });

declare global {
  interface Window {
    webkitSpeechRecognition?: {
      new (): SpeechRecognitionType;
    };
    SpeechRecognition?: {
      new (): SpeechRecognitionType;
    };
  }
}

export function useVoiceLogin({
  speak,
  onEmailChange,
  onPasswordChange,
  onSubmit,
}: UseVoiceLoginOptions) {
  const [voiceStep, setVoiceStep] = useState<VoiceStep>("idle");
  const [isListening, setIsListening] = useState(false);
  const [preview, setPreview] = useState("");

  const recognitionRef = useRef<SpeechRecognitionType | null>(null);
  const hasProcessedFinalRef = useRef(false);
  const stepRef = useRef<VoiceStep>("idle");
  const sttRunningRef = useRef(false);

  // 비밀번호 재시도
  const passwordRetryCountRef = useRef(0);
  const MAX_PASSWORD_RETRIES = 2;

  // 브라우저 STT 인스턴스 준비
  useEffect(() => {
    if (recognitionRef.current) return;

    const SR =
      (window.SpeechRecognition as any) ||
      (window.webkitSpeechRecognition as any);

    if (!SR) {
      console.warn("[STT] Browser STT not supported");
      return;
    }

    const r: SpeechRecognitionType = new SR();
    r.lang = "ko-KR";
    r.interimResults = true;
    r.maxAlternatives = 1;

    recognitionRef.current = r;
  }, []);

  // 공통 STT stop
  const stopRecognition = () => {
    const r = recognitionRef.current;
    if (!r) return;
    if (!sttRunningRef.current) return;

    try {
      r.onresult = null as any;
      r.onerror = null as any;
      r.onend = null as any;
      r.stop();
      console.log("[STT] stopRecognition 호출");
    } catch (e) {
      console.warn("[STT] stop() 실패 (이미 정지 상태일 수 있음)", e);
    } finally {
      sttRunningRef.current = false;
      setIsListening(false);
    }
  };

  // 공통 STT 시작
  const beginListening = (step: VoiceStep) => {
    const r = recognitionRef.current;
    if (!r) {
      console.warn("[STT] recognizer 없음");
      return;
    }

    // 이전 STT 강제 종료
    stopRecognition();

    stepRef.current = step;
    setVoiceStep(step);
    hasProcessedFinalRef.current = false;
    passwordRetryCountRef.current = 0;
    setPreview("");

    r.onresult = (event: SpeechRecognitionEvent) => {
      let text = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        text += event.results[i][0].transcript;
      }
      const trimmed = text.trim();
      setPreview(trimmed);

      const result = event.results[event.results.length - 1];
      const isFinal = result.isFinal;

      if (!isFinal) return;

      if (hasProcessedFinalRef.current) {
        console.log("[STT] 추가 finalResult → 무시:", trimmed);
        return;
      }
      hasProcessedFinalRef.current = true;
      sttRunningRef.current = false;
      setIsListening(false);
      setPreview("");

      const currentStep = stepRef.current;

      console.log("[STT] finalResult:", trimmed, "step:", currentStep);

      if (currentStep === "listenEmail") {
        handleEmailResult(trimmed);
      } else if (currentStep === "listenPassword") {
        handlePasswordResult(trimmed);
      }
    };

    r.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.warn("[STT] 에러:", event.error);
      sttRunningRef.current = false;
      setIsListening(false);
      setPreview("");

      const currentStep = stepRef.current;

      if (currentStep === "listenPassword") {
        retryPassword("error");
      } else {
        speak("다시.", () => {
          setVoiceStep("idle");
        });
      }
    };

    r.onend = () => {
      console.log("[STT] onend 발생");
      sttRunningRef.current = false;
      setIsListening(false);
    };

    try {
      r.start();
      sttRunningRef.current = true;
      setIsListening(true);
      console.log("[STT] start() 성공 (step:", step, ")");
    } catch (e) {
      console.warn("[STT] start() 실패:", e);
    }
  };

  // 이메일 처리
  const handleEmailResult = (text: string) => {
    if (text.length < 5) {
      console.log("[STT] 이메일 너무 짧음 → 실패:", text);
      speak("다시.", () => setVoiceStep("idle"));
      return;
    }

    const parsed = parseFullEmail(text);
    if (!parsed) {
      console.log("[STT] 이메일 파싱 실패:", text);
      speak("다시.", () => setVoiceStep("idle"));
      return;
    }

    onEmailChange(parsed.email);
    setVoiceStep("idle");
    console.log("[STT] 이메일 파싱 성공:", parsed.email);

    // 간결한 TTS + 바로 비밀번호 단계로
    speak("인식했습니다.", () => {
      // 여기서 바로 비밀번호 단계로 자동 진행
      startVoicePassword();
    });
  };

  // 비밀번호 처리
  const handlePasswordResult = (text: string) => {
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

    speak("입력 완료.", () => {
      onSubmit(); // 자동 로그인 실행
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
      console.log("[STT] 비밀번호 최대 재시도 초과 → 수동 입력으로 전환");
      speak("수동 입력으로 전환합니다.");
      setVoiceStep("idle");
      return;
    }

    speak("다시.", () => {
      beginListening("listenPassword");
    });
  };

  // 외부에서 호출할 함수들

  const startVoiceEmail = () => {
    console.log("[STT] startVoiceEmail 호출");
    stopRecognition();

    speak("이메일 말씀하세요.", () => {
      beginListening("listenEmail");
    });
  };

  const startVoicePassword = () => {
    console.log("[STT] startVoicePassword 호출");
    stopRecognition();

    speak("비밀번호 말씀하세요.", () => {
      beginListening("listenPassword");
    });
  };

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      stopRecognition();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    voiceStep,
    isListening,
    preview,
    startVoiceEmail,
    startVoicePassword,
  };
}
