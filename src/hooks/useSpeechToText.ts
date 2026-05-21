/**
 * 🎤 음성 인식 (STT) 훅
 * Web Speech API를 사용한 음성 → 텍스트 변환
 */
import { useEffect, useRef, useState } from "react";
import type { STTStatus } from "@/types/stt";

export interface UseSpeechToTextOptions {
  onResult: (text: string) => void;
  onEnd?: () => void;
  onError?: (error: Error) => void;
  onNoSpeech?: () => void; // 🔥 no-speech 콜백 추가
  lang?: string;
  continuous?: boolean;
  interimResults?: boolean;
}

export function useSpeechToText({
  onResult,
  onEnd,
  onError,
  onNoSpeech, // 🔥 no-speech 콜백
  lang = "ko-KR",
  continuous = false,
  interimResults = false,
}: UseSpeechToTextOptions) {
  const recognitionRef = useRef<any>(null);
  const finalTextRef = useRef<string>(""); // 🔥 최종 결과 누적
  const onResultRef = useRef(onResult); // 🔥 콜백 ref로 저장 (dependency 문제 해결)
  const onEndRef = useRef(onEnd);
  const onErrorRef = useRef(onError);
  const onNoSpeechRef = useRef(onNoSpeech); // 🔥 no-speech 콜백 ref
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [sttStatus, setSttStatus] = useState<STTStatus>('idle'); // 🔥 Phase 20: STT 상태

  // 🔥 콜백 ref 업데이트
  useEffect(() => {
    onResultRef.current = onResult;
    onEndRef.current = onEnd;
    onErrorRef.current = onError;
    onNoSpeechRef.current = onNoSpeech;
  }, [onResult, onEnd, onError, onNoSpeech]);

  useEffect(() => {
    // Web Speech API 지원 확인
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn("⚠️ Web Speech API가 지원되지 않는 브라우저입니다.");
      setIsSupported(false);
      return;
    }

    setIsSupported(true);

    // 🔥 recognition은 start() 호출 시마다 새로 생성 (useVoiceSearch 패턴)
    // 여기서는 초기화만 하고, 실제 생성은 start()에서

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // 이미 종료된 경우 무시
        }
        recognitionRef.current = null;
      }
    };
  }, [lang, continuous, interimResults]);

  const start = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn("⚠️ Web Speech API가 지원되지 않습니다.");
      setIsSupported(false);
      return;
    }

    setIsSupported(true);

    try {
      // 🔥 이전 recognition 정리
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // 무시
        }
        recognitionRef.current = null;
      }

      // 🔥 매번 새로 생성 (useVoiceSearch 패턴)
      const recognition = new SpeechRecognition();
      recognition.lang = lang;
      recognition.interimResults = true; // 🔥 interimResults를 true로 설정하여 isFinal 체크 가능하게
      recognition.maxAlternatives = 1;
      recognition.continuous = continuous;

      finalTextRef.current = ""; // 🔥 시작 시 초기화

      recognition.onstart = () => {
        setIsListening(true);
        setSttStatus('listening'); // 🔥 Phase 20: 듣는 중 상태
        finalTextRef.current = "";
        console.log("🎤 [useSpeechToText] 음성 인식 시작");
      };

      recognition.onresult = (event: any) => {
        console.log("📝 [useSpeechToText] onresult 이벤트 발생", {
          resultsLength: event.results?.length,
          resultIndex: event.resultIndex,
        });

        let finalText = "";
        let interimText = "";

        // 🔥 모든 결과 순회 (중간 + 최종)
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (!result || result.length === 0) continue;

          const transcript = result[0].transcript;

          if (result.isFinal) {
            // 🔥 final 결과만 누적
            finalText += transcript + " ";
            finalTextRef.current += transcript + " ";
            console.log("🟢 [useSpeechToText] final 결과:", transcript);
          } else {
            // interim은 로그만
            interimText += transcript;
            console.log("🟡 [useSpeechToText] interim 결과:", transcript);
          }
        }

        // 🔥 final 결과는 onend에서 처리 (여기서는 저장만)
        if (finalText.trim()) {
          console.log("🟢 [useSpeechToText] final 결과 누적:", finalTextRef.current.trim());
          setSttStatus('processing'); // 🔥 Phase 20: 처리 중 상태
        }
      };

      recognition.onerror = (e: any) => {
        console.error("❌ [useSpeechToText] STT 오류:", e.error);
        setIsListening(false);
        finalTextRef.current = ""; // 에러 시 초기화
        
        // 🔥 Phase 20: 오류 상태 설정 (정확한 분류)
        if (e.error === 'not-allowed' || e.error === 'permission-denied') {
          setSttStatus('permission_denied'); // 🔥 Phase 20: 마이크 권한 오류
          onErrorRef.current?.(new Error(`마이크 권한이 필요합니다: ${e.error}`));
          return;
        }
        
        if (e.error === "no-speech") {
          // 말하지 않았을 때는 에러로 처리하지 않음
          console.log("ℹ️ [useSpeechToText] 사용자가 말하지 않음 (no-speech)");
          setSttStatus('idle'); // 🔥 Phase 20: 대기 상태로 복귀
          // 🔥 no-speech 콜백 호출
          onNoSpeechRef.current?.();
          return;
        }
        
        if (e.error === "aborted") {
          console.log("ℹ️ [useSpeechToText] 음성 인식이 중단됨 (aborted)");
          setSttStatus('idle'); // 🔥 Phase 20: 대기 상태로 복귀
          return;
        }

        setSttStatus('error'); // 🔥 Phase 20: 기타 오류 상태
        onErrorRef.current?.(new Error(`음성 인식 오류: ${e.error}`));
      };

      recognition.onend = () => {
        setIsListening(false);
        console.log("🎤 [useSpeechToText] 음성 인식 종료");
        
        // 🔥 onend에서만 final 결과 전달 (STT 완전 종료 후)
        const finalResult = finalTextRef.current.trim();
        console.log("✅ [useSpeechToText] STT 완료, 최종 결과:", finalResult);
        
        if (finalResult) {
          console.log("✅ [useSpeechToText] onend에서 최종 결과 전달:", finalResult);
          onResultRef.current(finalResult);
        }
        
        finalTextRef.current = ""; // 전달 후 초기화
        setSttStatus('idle'); // 🔥 Phase 20: 대기 상태로 복귀
        onEndRef.current?.();
        recognitionRef.current = null;
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch (e: any) {
      // 이미 실행 중인 경우 무시
      if (e.message?.includes("already started")) {
        return;
      }
      console.error("❌ 음성 인식 시작 실패:", e);
      onErrorRef.current?.(new Error(`음성 인식 시작 실패: ${e.message || e}`));
    }
  };

  const stop = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.error("❌ 음성 인식 중지 실패:", e);
      }
      recognitionRef.current = null;
    }
    finalTextRef.current = "";
    setIsListening(false);
  };

  return {
    start,
    stop,
    isListening,
    isSupported,
    sttStatus, // 🔥 Phase 20: STT 상태 노출
  };
}

