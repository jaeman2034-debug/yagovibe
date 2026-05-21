/**
 * 🧠 Voice Agent 타입 정의
 * 프로덕션 수준 타입 시스템
 */

// Wake Word 상태 머신
export type WakeState = 'IDLE' | 'WAKE_LISTENING' | 'LISTENING' | 'PROCESSING';

// 컨텍스트 메모리 아이템
export interface MemoryItem {
  intent: {
    type: 'MAP_SEARCH' | 'MAP_NAVIGATE' | 'NONE';
    query: string;
    filters?: {
      openNow: boolean;
      parking: boolean;
      sort: 'NEAREST' | 'BEST_RATED' | 'DEFAULT';
    };
    autoNavigate?: boolean;
  };
  result?: {
    destination?: string;
    candidates?: string[];
    chosenIndex?: number;
  };
  timestamp: number;
}

// Agent 출력 액션
export type AgentAction = 'SEARCH' | 'NAVIGATE' | 'REPEAT_LAST' | 'SEARCH_ALTERNATIVE' | 'NONE';

// Agent 응답
export interface AgentResponse {
  action: AgentAction;
  query: string;
  filters: {
    openNow: boolean;
    parking: boolean;
    sort: 'NEAREST' | 'BEST_RATED' | 'DEFAULT';
  };
}

// Execute Intent 응답
export interface ExecuteIntentResponse {
  action: 'NAVIGATE' | 'OPEN_SEARCH' | 'NONE';
  destination?: string;
  query?: string;
  filters?: {
    openNow: boolean;
    parking: boolean;
    sort: 'NEAREST' | 'BEST_RATED' | 'DEFAULT';
  };
  place?: {
    name: string;
    address: string;
    rating: number;
  };
  message?: string;
}

// Voice Agent 설정
export interface VoiceAgentConfig {
  chunkDuration: number; // Chunk 녹음 시간 (ms)
  silenceThreshold: number; // 침묵 감지 임계값 (ms)
  maxMemoryItems: number; // 최대 메모리 아이템 수
  wakeKeywords: string[]; // Wake Word 키워드
}

// Voice Agent 상태
export interface VoiceAgentState {
  wakeState: WakeState;
  isAlwaysOn: boolean;
  isStreaming: boolean;
  liveText: string;
  lastUpdateAt: number;
  executed: boolean;
  recentMemory: MemoryItem[];
}
