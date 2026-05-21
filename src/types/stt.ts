/**
 * 🔥 Phase 20: STT 상태 타입 정의
 * 
 * 음성 인식 상태를 명확하게 표현
 */

// 🔥 Phase 22: STT 상태 타입 정의 (확장)
export type STTStatus = 
  | 'idle'
  | 'listening'
  | 'understood'
  | 'searching'
  | 'permission_denied'
  | 'error';

// 🔥 값으로도 export (런타임 호환성)
export const STT_STATUS = {
  IDLE: 'idle' as const,
  LISTENING: 'listening' as const,
  UNDERSTOOD: 'understood' as const,
  SEARCHING: 'searching' as const,
  PERMISSION_DENIED: 'permission_denied' as const,
  ERROR: 'error' as const,
} as const;
