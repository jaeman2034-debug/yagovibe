// src/voice/speech.ts
// 🔥 Promise 기반 TTS/STT 유틸 (천재모드 버전)

let recognition: SpeechRecognition | null = null;

declare global {
  interface Window {
    webkitSpeechRecognition?: any;
    SpeechRecognition?: any;
  }
}

/**
 * STT 인스턴스 초기화 (단일 인스턴스)
 */
export const initRecognition = (): SpeechRecognition | null => {
  if (recognition) return recognition;

  const SpeechRec =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  if (!SpeechRec) {
    console.warn("[speech] SpeechRecognition not supported");
    return null;
  }

  recognition = new SpeechRec();
  recognition.lang = "ko-KR";
  recognition.interimResults = false;
  recognition.continuous = false;

  return recognition;
};

// 🔥 TTS 실행 중 플래그 (중복 방지)
let isTTSRunning = false;
let currentUtterance: SpeechSynthesisUtterance | null = null;

/**
 * 🔥 TTS: 끝날 때까지 기다리는 Promise 버전
 * TTS 실행 전에 STT를 완전히 종료하여 충돌 방지
 * 🔥 중복 실행 방지 및 interrupted 에러 해결
 */
export const speak = (text: string): Promise<void> => {
  return new Promise((resolve) => {
    if (!text) {
      resolve();
      return;
    }

    // 🔥 1. 이전 TTS 완전 종료 (중복 방지)
    if (isTTSRunning && currentUtterance) {
      window.speechSynthesis.cancel();
      isTTSRunning = false;
      currentUtterance = null;
      console.log("[speech] 이전 TTS 강제 취소");
    }

    // 🔥 2. STT 강제 종료 (TTS 재생 전 필수)
    try {
      if (recognition) {
        recognition.stop();
        console.log("[speech] STT 강제 종료 완료");
      }
    } catch (e) {
      console.warn("[speech] STT 종료 실패:", e);
    }

    // 🔥 3. 모든 이전 발화 제거 (안전장치)
    window.speechSynthesis.cancel();

    // 🔥 4. 약간의 지연 후 TTS 시작 (브라우저 정리 시간 확보)
    setTimeout(() => {
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = "ko-KR";
      utter.rate = 1.1;

      // 🔥 실행 중 플래그 설정
      isTTSRunning = true;
      currentUtterance = utter;

      utter.onend = () => {
        console.log("[speech] TTS 재생 완료:", text);
        isTTSRunning = false;
        currentUtterance = null;
        resolve();
      };

      utter.onerror = (e: any) => {
        console.warn("[speech] TTS 재생 오류:", e.error, text);
        isTTSRunning = false;
        currentUtterance = null;
        // interrupted 에러는 정상 종료로 처리
        if (e.error === "interrupted") {
          console.log("[speech] TTS interrupted (정상 종료로 처리)");
        }
        resolve(); // 오류 발생 시에도 Promise 해결
      };

      window.speechSynthesis.speak(utter);
      console.log("[speech] TTS 재생 시작:", text);
    }, 100); // 100ms 지연으로 브라우저 정리 시간 확보
  });
};

/**
 * 🎤 STT 한 번만 듣는 헬퍼 (intent 모드)
 * Promise 기반으로 한 번의 음성 인식 결과를 반환
 * 🔥 STT 시작 전에 TTS를 완전히 종료하여 충돌 방지
 */
export const listenOnce = (): Promise<string> => {
  return new Promise((resolve, reject) => {
    // 🔥 STT 시작 전에 TTS 완전 종료 (필수!)
    window.speechSynthesis.cancel();

    const rec = initRecognition();
    if (!rec) {
      reject(new Error("STT not supported"));
      return;
    }

    // 이전 이벤트 핸들러 제거
    rec.onresult = null;
    rec.onerror = null;
    rec.onend = null;

    rec.onresult = (e: SpeechRecognitionEvent) => {
      const text = Array.from(e.results)
        .map((r) => r[0].transcript)
        .join(" ")
        .trim();

      console.log("[speech] STT 인식 결과:", text);

      // 이벤트 핸들러 정리
      rec.onresult = null;
      rec.onerror = null;
      rec.onend = null;

      try {
        rec.stop();
      } catch {}

      resolve(text);
    };

    rec.onerror = (e: any) => {
      console.warn("[speech] STT 오류:", e.error);

      // 이벤트 핸들러 정리
      rec.onresult = null;
      rec.onerror = null;
      rec.onend = null;

      try {
        rec.stop();
      } catch {}

      // no-speech는 빈 문자열로 처리
      if (e.error === "no-speech") {
        resolve("");
      } else {
        reject(e);
      }
    };

    rec.onend = () => {
      // onresult 없이 끝나면 빈 문자열 반환
      console.log("[speech] STT 종료 (결과 없음)");

      // 이벤트 핸들러 정리
      rec.onresult = null;
      rec.onerror = null;
      rec.onend = null;

      resolve("");
    };

    try {
      // 기존 STT 정지
      rec.stop();
    } catch {}

    // 🔥 TTS 완전 종료 후 충분한 지연 (안정성)
    // TTS가 완전히 끝나고 마이크가 OS에 반환될 때까지 대기
    // no-speech 방지를 위해 최소 500ms 지연
    setTimeout(() => {
      try {
        rec.start();
        console.log("[speech] STT 시작");
      } catch (e) {
        console.warn("[speech] STT 시작 실패:", e);
        reject(e);
      }
    }, 500); // 400ms → 500ms로 증가 (no-speech 방지)
  });
};

/**
 * STT 강제 종료
 */
export const stopSTT = () => {
  if (!recognition) return;
  try {
    recognition.stop();
    console.log("[speech] STT 강제 종료");
  } catch (e) {
    console.warn("[speech] STT 종료 실패:", e);
  }
};

