/**
 * 🔇 Silence Detector
 * 말 끝 감지 (1.8초 침묵)
 * 이벤트만 emit
 */

export interface SilenceDetectorCallbacks {
  onSilence?: () => void;
}

/**
 * 침묵 감지 시작
 */
export function startSilenceDetection(
  lastUpdateAt: number,
  silenceThreshold: number,
  callbacks: SilenceDetectorCallbacks,
  shouldContinue: () => boolean
): () => void {
  const { onSilence } = callbacks;

  const timer = setInterval(() => {
    if (!shouldContinue()) {
      clearInterval(timer);
      return;
    }

    const now = Date.now();
    const silenceDuration = now - lastUpdateAt;

    if (silenceDuration >= silenceThreshold) {
      onSilence?.();
      clearInterval(timer);
    }
  }, 300); // 0.3초마다 체크

  // cleanup 함수 반환
  return () => clearInterval(timer);
}
