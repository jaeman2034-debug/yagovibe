/**
 * 🔥 채팅 메시지 메타데이터 타입 정의 (통합 표준)
 */

export interface MessageMeta {
  inputMode?: "typing" | "voice";
  stt?: {
    provider: "webSpeech" | "whisper";
    confidence?: number;
    language?: string; // e.g. "ko-KR"
    durationMs?: number;
  };
}

export interface SendPayload {
  text: string;
  meta?: MessageMeta;
}

export type OnSend = (payload: SendPayload) => void;
