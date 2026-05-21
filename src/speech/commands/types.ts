// src/speech/commands/types.ts
// 🔥 Phase 3-2: 음성 명령 타입 정의

export interface SpeechCommandContext {
  ui: SpeechUIAdapter;
  transcript: string;
}

export interface SpeechCommand {
  keywords: string[];
  action: (ctx: SpeechCommandContext) => void;
}
