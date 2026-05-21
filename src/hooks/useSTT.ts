/**
 * 🎤 STT (Speech-to-Text) 훅 - 실전용
 * 
 * Web Speech API를 사용한 음성 인식 훅
 * - Chrome / Android / Edge / Samsung Internet 지원
 * - iOS Safari 지원 (인식률은 조금 낮음)
 * - 별도 서버 비용 없음
 * - 붙이면 바로 동작
 */

import { useRef, useState, useCallback, useEffect } from "react";

declare global {
  interface Window {
    webkitSpeechRecognition?: any;
    SpeechRecognition?: any;
  }
}

interface UseSTTOptions {
  onResult?: (text: string) => void;
  onError?: (error: any) => void;
  lang?: string;
}

export function useSTT(options: UseSTTOptions = {}) {
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const [listening, setListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  // 🔥 브라우저 지원 여부 확인
  useEffect(() => {
    const supported = 
      typeof window !== "undefined" &&
      (("webkitSpeechRecognition" in window) || ("SpeechRecognition" in window));
    setIsSupported(supported);
    console.log("🎤 [useSTT] 브라우저 지원 여부:", supported);
  }, []);

  const startSTT = useCallback((onResult?: (text: string) => void) => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      const error = new Error("이 브라우저는 음성 입력을 지원하지 않습니다.");
      console.warn("🎤 [useSTT] 브라우저 미지원:", error);
      if (options.onError) {
        options.onError(error);
      } else {
        alert("이 브라우저는 음성 입력을 지원하지 않습니다.\nChrome 또는 Chrome 기반 브라우저를 사용해주세요.");
      }
      return;
    }

    // 🔥 기존 인식 중이면 중지
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // 무시
      }
    }

    const recognition = new SpeechRecognition();
    recognition.lang = options.lang || "ko-KR";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      console.log("🎤 [useSTT] 음성 인식 시작");
      setListening(true);
    };

    recognition.onend = () => {
      console.log("🎤 [useSTT] 음성 인식 종료");
      setListening(false);
      recognitionRef.current = null;
    };

    recognition.onerror = (event: any) => {
      console.warn("🎤 [useSTT] 음성 인식 오류:", event.error);
      setListening(false);
      recognitionRef.current = null;

      // no-speech는 조용히 처리
      if (event.error === "no-speech") {
        return;
      }

      if (options.onError) {
        options.onError(event);
      } else {
        // 기본 에러 처리
        if (event.error === "not-allowed") {
          alert("마이크 권한이 거부되었습니다.\n브라우저 설정에서 마이크 권한을 허용해주세요.");
        } else if (event.error === "network") {
          alert("네트워크 오류가 발생했습니다.\n인터넷 연결을 확인해주세요.");
        } else {
          console.warn("🎤 [useSTT] 음성 인식 오류:", event.error);
        }
      }
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const result = event.results[0];
      if (!result) return;

      const transcript = result[0].transcript.trim();
      console.log("🎤 [useSTT] 인식 결과:", transcript);

      // 콜백 호출
      if (onResult) {
        onResult(transcript);
      }
      if (options.onResult) {
        options.onResult(transcript);
      }
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
    } catch (error) {
      console.error("🎤 [useSTT] start 실패:", error);
      setListening(false);
      if (options.onError) {
        options.onError(error);
      }
    }
  }, [options]);

  const stopSTT = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
        console.log("🎤 [useSTT] 음성 인식 중지");
      } catch (e) {
        console.warn("🎤 [useSTT] stop 실패:", e);
      }
      recognitionRef.current = null;
    }
    setListening(false);
  }, []);

  return { startSTT, stopSTT, listening, isSupported };
}
