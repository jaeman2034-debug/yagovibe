/**
 * 🎧 Wake Word Detector
 * Wake Word 감지 루프
 * 이벤트만 emit (비즈니스 로직 없음)
 */

import { recordAudioChunk } from './microphone';
import { callSTT } from '../services/sttService';
import { detectWakeWord } from '../utils/wakeWordDetector';
import { VOICE_AGENT_CONFIG } from '../config';

export interface WakeWordCallbacks {
  onWake?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Wake Word 감지 루프 시작
 */
export async function startWakeWordDetection(
  callbacks: WakeWordCallbacks,
  shouldContinue: () => boolean
): Promise<void> {
  const { onWake, onError } = callbacks;

  try {
    // 초저전력 Wake Word 감지 루프 (긴 간격)
    while (shouldContinue()) {
      try {
        // 3초 녹음 (Wake Word 감지용)
        const chunk = await recordAudioChunk(3000, 'LOW');

        if (!chunk || !shouldContinue()) {
          continue;
        }

        // STT 호출 (Wake Word 감지용)
        const text = await callSTT(chunk.base64);

        if (detectWakeWord(text, VOICE_AGENT_CONFIG.wakeKeywords)) {
          console.log('🎧 Wake Word 감지!');
          onWake?.();
          return;
        }
      } catch (wakeError: any) {
        console.warn('⚠️ Wake Word 감지 오류:', wakeError);
        onError?.(wakeError);
        // 오류해도 계속 진행
      }
    }
  } catch (error: any) {
    console.error('❌ Wake Word 감지 시작 오류:', error);
    onError?.(error);
  }
}
