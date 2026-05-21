/**
 * 🎙️ Whisper STT Streaming
 * Chunk 기반 STT 스트리밍
 * 이벤트만 emit (비즈니스 로직 없음)
 */

import { callSTT } from '../services/sttService';
import { recordAudioChunk } from './microphone';

export interface WhisperStreamCallbacks {
  onTextChunk?: (text: string) => void;
  onError?: (error: Error) => void;
}

/**
 * Whisper STT Streaming 시작
 */
export async function startWhisperStreaming(
  chunkDuration: number,
  callbacks: WhisperStreamCallbacks,
  shouldContinue: () => boolean
): Promise<void> {
  const { onTextChunk, onError } = callbacks;

  try {
    // Chunk 기반 녹음 루프
    while (shouldContinue()) {
      try {
        const chunk = await recordAudioChunk(chunkDuration, 'LOW');

        if (!chunk || !shouldContinue()) {
          continue;
        }

        // STT 호출
        const text = await callSTT(chunk.base64);

        if (text && shouldContinue()) {
          onTextChunk?.(text);
        }
      } catch (chunkError: any) {
        console.warn('⚠️ Chunk 처리 오류:', chunkError);
        onError?.(chunkError);
        // Chunk 실패해도 계속 진행
      }
    }
  } catch (error: any) {
    console.error('❌ Whisper Streaming 오류:', error);
    onError?.(error);
  }
}
