// src/voice/useVoiceLogin.ts
import { useEffect, useRef, useState } from "react";
import { parseFullEmail } from "./parseFullEmail";
import { parsePassword } from "./parsePassword";

type VoiceStep = "idle" | "listenEmail" | "listenPassword";

type UseVoiceLoginOptions = {
  speak: (text: string, onEnd?: () => void) => void; // TTS 함수
  onEmailChange: (email: string) => void;
  onPasswordChange: (pw: string) => void;
  onSubmit: () => void; // 이메일+비번 준비 후 로그인 실행
};

type SR = SpeechRecognition | any;

declare global {
  interface Window {
    webkitSpeechRecognition?: any;
    SpeechRecognition?: any;
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

  const recognitionRef = useRef<SR | null>(null);
  const hasProcessedFinalRef = useRef(false);
  const stepRef = useRef<VoiceStep>("idle");
  const sttRunningRef = useRef(false);

  // 비밀번호 재시도
  const passwordRetryCountRef = useRef(0);
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

  // 이메일 처리
  const handleEmailResult = (text: string) => {
    if (text.length < 5) {
      console.log("[STT] 이메일 너무 짧음:", text);
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
    console.log("[STT] 이메일 파싱 성공:", parsed.email);
    setVoiceStep("idle");

    // 간결한 멘트 + (옵션) 바로 비밀번호 단계로 넘어가고 싶으면 아래 유지
    speak("인식했습니다.", () => {
      // 자동 비밀번호 단계
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
      onSubmit(); // 자동 로그인
    });
  };

  // 비밀번호 재시도 로직
  const retryPassword = (reason: "shortOrEmpty" | "error", fixed?: string) => {
    passwordRetryCountRef.current += 1;
    console.log(
      `[STT] 비밀번호 실패 (${reason}, ${
        fixed?.length || 0
      }자) → 재시도 ${passwordRetryCountRef.current}/${MAX_PASSWORD_RETRIES}`,
    );

    if (passwordRetryCountRef.current > MAX_PASSWORD_RETRIES) {
      console.log("[STT] 비밀번호 최대 재시도 초과 → 수동 입력 전환");
      speak("수동 입력으로 전환합니다.");
      setVoiceStep("idle");
      return;
    }

    speak("다시.", () => {
      beginListening("listenPassword");
    });
  };

  // 외부에서 호출하는 함수들
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

  // 공통 STT stop
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
      console.warn("[STT] stop() 실패 (이미 정지 상태일 수 있음)", e);
    } finally {
      sttRunningRef.current = false;
      setIsListening(false);
    }
  };

  // 공통 STT start
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

      if (currentStep === "listenEmail") {
        handleEmailResult(trimmed);
      } else if (currentStep === "listenPassword") {
        handlePasswordResult(trimmed);
      }
    };

    r.onerror = (event: any) => {
      console.warn("[STT] 에러:", event.error);
      sttRunningRef.current = false;
      setIsListening(false);
      setPreview("");

      const currentStep = stepRef.current;
      if (currentStep === "listenPassword") {
        retryPassword("error");
      } else {
        speak("다시.", () => setVoiceStep("idle"));
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

  // 언마운트 시 정리
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

