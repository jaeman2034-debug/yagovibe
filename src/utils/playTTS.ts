/**
 * 🔊 TTS (Text-to-Speech) 재생 유틸리티
 * 
 * 브라우저 네이티브 speechSynthesis API 사용
 * - 자동 재생 금지
 * - 사용자 클릭 시만 재생
 * - 중복 재생 방지
 */

/**
 * TTS 재생 (Promise 기반)
 * @param text - 재생할 텍스트
 * @returns Promise<void> - 재생 완료 시 resolve
 */
export function playTTS(text: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // 🔥 브라우저 환경 확인
    if (typeof window === "undefined") {
      const error = new Error("서버 사이드에서는 TTS를 사용할 수 없습니다.");
      console.warn("🔊 [playTTS] 서버 사이드 환경");
      reject(error);
      return;
    }

    if (!text || !text.trim()) {
      console.log("🔊 [playTTS] 빈 텍스트, 재생 건너뜀");
      resolve();
      return;
    }

    if (!window.speechSynthesis) {
      const error = new Error("이 브라우저는 음성 재생을 지원하지 않습니다.");
      console.warn("🔊 [playTTS] speechSynthesis 미지원");
      reject(error);
      return;
    }

    // 🔥 데스크톱/모바일 구분 없이 TTS 허용 (브라우저 지원 시)
    console.log("🔊 [playTTS] TTS 재생 시작:", {
      textLength: text.length,
      textPreview: text.substring(0, 50),
      userAgent: navigator.userAgent.substring(0, 50),
    });

    // 🔥 중복 재생 방지: 기존 재생 중단
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text.trim());
    utterance.lang = "ko-KR";
    utterance.rate = 1.0; // 정상 속도
    utterance.pitch = 1.0; // 정상 톤
    utterance.volume = 1.0;

    utterance.onstart = () => {
      console.log("🔊 [playTTS] 재생 시작됨:", text.substring(0, 30));
    };

    utterance.onend = () => {
      console.log("🔊 [playTTS] 재생 완료:", text.substring(0, 30));
      resolve();
    };

    utterance.onerror = (event) => {
      console.error("🔊 [playTTS] 재생 오류:", {
        error: event.error,
        type: event.type,
        charIndex: event.charIndex,
        text: text.substring(0, 50),
      });
      reject(event);
    };

    // 약간의 지연 후 재생 (브라우저 정리 시간 확보)
    setTimeout(() => {
      try {
        window.speechSynthesis.speak(utterance);
        console.log("🔊 [playTTS] speak() 호출 완료");
      } catch (error) {
        console.error("🔊 [playTTS] speak() 호출 실패:", error);
        reject(error);
      }
    }, 100);
  });
}

/**
 * TTS 중지
 */
export function stopTTS() {
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
    console.log("🔊 [stopTTS] 재생 중지");
  }
}

/**
 * TTS 재생 중 여부 확인
 */
export function isTTSPlaying(): boolean {
  return window.speechSynthesis?.speaking || false;
}
