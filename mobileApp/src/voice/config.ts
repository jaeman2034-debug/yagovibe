/**
 * 🧠 Voice Agent 설정
 * 프로덕션 설정값
 */

import type { VoiceAgentConfig } from './types';

export const VOICE_AGENT_CONFIG: VoiceAgentConfig = {
  chunkDuration: 1500, // 1.5초 chunk
  silenceThreshold: 1800, // 1.8초 침묵 감지
  maxMemoryItems: 3, // 최대 3개 메모리
  wakeKeywords: ['헤이', '야고', '어시스턴트', '도와줘'],
};
