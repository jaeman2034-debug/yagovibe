// src/voice/voiceCore.ts
// 🔥 공통 TTS/STT 래퍼 (전체 음성 네비게이션 통합)

export type SpeechCallback = () => void;

/**
 * TTS 재생 (Promise 기반)
 * 🔥 TTS 실행 전에 STT를 완전히 종료하여 충돌 방지
 * 🔥 Promise로 반환하여 await 가능하도록 수정
 */
export function speak(text: string, onEnd?: SpeechCallback): Promise<void> {
  return new Promise((resolve) => {
    // 🔥 STT 강제 종료 (TTS 재생 전 필수)
    try {
      if (globalRecognition) {
        globalRecognition.stop();
        console.log("[TTS] STT 강제 종료 완료");
      }
    } catch (e) {
      console.warn("[TTS] STT 종료 실패:", e);
    }

    // 기존 TTS 취소
    window.speechSynthesis.cancel();

    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "ko-KR";
    utter.rate = 1.1;
    
    utter.onend = () => {
      console.log("[TTS] 재생 완료:", text);
      if (onEnd) {
        setTimeout(() => {
          onEnd();
          resolve();
        }, 300); // 안정성을 위한 약간의 지연
      } else {
        resolve();
      }
    };

    utter.onerror = (e) => {
      console.warn("[TTS] 재생 오류:", e);
      resolve(); // 오류 발생 시에도 Promise 해결
    };

    window.speechSynthesis.speak(utter);
    console.log("[TTS] 재생 시작:", text);
  });
}

/**
 * STT 모드 타입
 */
export type STTMode = "command" | "field";

/**
 * STT 시작 옵션
 */
export interface StartSTTOptions {
  mode: STTMode;
  onFinal: (text: string) => void;
  onError?: (e: any) => void;
}

// 전역 STT 인스턴스
let globalRecognition: SpeechRecognition | null = null;

declare global {
  interface Window {
    webkitSpeechRecognition?: any;
    SpeechRecognition?: any;
  }
}

/**
 * STT 시작
 */
export function startSTT({ mode, onFinal, onError }: StartSTTOptions) {
  if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
    console.warn("[voiceCore] STT 지원 안 됨");
    return;
  }

  if (!globalRecognition) {
    const SRClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const rec = new SRClass();
    rec.lang = "ko-KR";
    rec.continuous = false;
    rec.interimResults = false;
    globalRecognition = rec;
  }

  const r = globalRecognition;

  r.onresult = (event: SpeechRecognitionEvent) => {
    const result = event.results[0];
    if (!result) return;
    const text = result[0].transcript.trim();
    console.log(`[STT][${mode}] final:`, text);
    onFinal(text);
  };

  r.onerror = (e: any) => {
    console.log(`[STT][${mode}] error:`, e.error);
    if (onError) {
      onError(e);
    }
  };

  r.onend = () => {
    console.log(`[STT][${mode}] end`);
  };

  try {
    r.stop();
  } catch {}

  setTimeout(() => {
    try {
      r.start();
      console.log(`[STT][${mode}] start`);
    } catch (e) {
      console.log("[STT] start error:", e);
    }
  }, 150);
}

/**
 * STT 정지
 */
export function stopSTT() {
  if (!globalRecognition) return;
  try {
    globalRecognition.stop();
    console.log("[STT] stopSTT 호출");
  } catch (e) {
    console.warn("[STT] stopSTT 실패:", e);
  }
}

