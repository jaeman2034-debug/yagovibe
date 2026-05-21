// src/hooks/useVoiceSearch.ts
// 🔥 음성 검색 훅 (v1 - 단순 버전, STT 정답 구조)

import { useRef } from "react";

interface UseVoiceSearchOptions {
  onResult: (text: string) => void; // final 결과만 전달
  onInterim?: (text: string) => void; // 중간 결과 (UI 표시용)
  onError?: (error: string) => void;
  onStart?: () => void;
  onEnd?: () => void;
}

export function useVoiceSearch({ onResult, onInterim, onError, onStart, onEnd }: UseVoiceSearchOptions) {
  const recognitionRef = useRef<any>(null);
  const finalTextRef = useRef<string>(""); // final 결과 누적

  const start = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      if (onError) {
        onError("not-supported");
      } else {
        alert("음성 인식을 지원하지 않는 브라우저입니다.");
      }
      return;
    }

    try {
      // 이전 recognition 정리
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // 무시
        }
      }

      const recognition = new SpeechRecognition();
      recognition.lang = "ko-KR";
      recognition.interimResults = true; // 🔥 중간 결과도 받아서 UI에 표시
      recognition.maxAlternatives = 1;
      recognition.continuous = false; // 단일 발화만

      finalTextRef.current = ""; // 초기화

      recognition.onstart = () => {
        finalTextRef.current = "";
        if (onStart) onStart();
      };

      // 🔥 STT 정답 구조: interim과 final 구분
      recognition.onresult = (event: any) => {
        let interimText = "";
        let finalText = "";

        // 모든 결과 순회 (중간 + 최종)
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;

          if (event.results[i].isFinal) {
            // 🔥 final 결과만 누적
            finalText += transcript + " ";
            finalTextRef.current += transcript + " ";
          } else {
            // interim은 UI 표시용
            interimText += transcript;
          }
        }

        // interim은 UI에만 표시 (검색 실행 안 함)
        if (interimText && onInterim) {
          onInterim(finalTextRef.current + interimText);
        }

        // final 결과는 onend에서 처리 (여기서는 저장만)
        if (finalText.trim()) {
          console.log("🟢 final 결과 누적:", finalTextRef.current.trim());
        }
      };

      // 🔥 onend에서만 final 결과 전달 (STT 완전 종료 후)
      recognition.onend = () => {
        const finalResult = finalTextRef.current.trim();
        console.log("✅ STT 완료, 최종 결과:", finalResult);
        
        if (finalResult) {
          onResult(finalResult);
        }
        
        if (onEnd) onEnd();
        recognitionRef.current = null;
      };

      recognition.onerror = (event: any) => {
        console.log("🎤 음성 인식 오류:", event.error);
        if (onError) {
          onError(event.error);
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch (error) {
      console.error("❌ 음성 인식 시작 실패:", error);
      if (onError) {
        onError("start-failed");
      }
    }
  };

  const stop = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // 이미 종료된 경우 무시
      }
      recognitionRef.current = null;
    }
    finalTextRef.current = "";
  };

  return { start, stop };
}

