/**
 * 🎤 음성 인식(STT) 지원 여부 유틸리티
 * 
 * 브라우저 및 플랫폼별 STT 사용 가능 여부 확인
 */

/**
 * Web Speech API 지원 여부 확인
 */
export const isSpeechSupported = (): boolean => {
  if (typeof window === 'undefined') return false;
  return (
    'webkitSpeechRecognition' in window ||
    'SpeechRecognition' in window
  );
};

/**
 * iOS 기기 여부 확인
 */
export const isIOS = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
};

/**
 * PWA(홈 화면 추가) 여부 확인
 */
export const isPWA = (): boolean => {
  if (typeof window === 'undefined') return false;
  return (
    (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
    ((window.navigator as any).standalone) ||
    document.referrer.includes('android-app://')
  );
};

/**
 * STT 사용 가능 여부 확인
 * - Android: 브라우저 지원 시 가능
 * - iOS: PWA일 때만 가능
 */
export const canUseSTT = (): boolean => {
  if (!isSpeechSupported()) return false;
  
  // Android는 항상 가능 (브라우저 지원 시)
  if (!isIOS()) return true;
  
  // iOS는 PWA일 때만 가능
  return isIOS() && isPWA();
};

/**
 * TTS 재생 (한 번만)
 * MapPageContainer 호환성을 위한 래퍼
 */
export const speakOnce = async (text?: string): Promise<void> => {
  if (!text) return;
  const { playTTS } = await import("@/utils/playTTS");
  return playTTS(text);
};

/**
 * TTS 순차 재생
 * MapPageContainer 호환성을 위한 래퍼
 */
export const speakSequence = async (texts: string[]): Promise<void> => {
  const { playTTS } = await import("@/utils/playTTS");
  for (const text of texts) {
    if (text) {
      await playTTS(text);
    }
  }
};

/**
 * TTS 잠금 해제 (호환성 함수)
 */
export const unlockTTS = (): void => {
  // TTS는 항상 사용 가능하므로 아무 작업 없음
};

/**
 * TTS 재생 (호환성 함수)
 * MarketPage 등에서 사용하는 speak 함수
 */
export const speak = async (text: string): Promise<void> => {
  if (!text) return;
  const { playTTS } = await import("@/utils/playTTS");
  return playTTS(text);
};
