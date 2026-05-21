// src/speech/commands/global.ts
// 🔥 Phase 3-2: 전역 음성 명령 (모든 페이지 공통)

import type { SpeechCommand } from "./types";

export const globalCommands: SpeechCommand[] = [
  {
    keywords: ["멈춰", "중지", "그만"],
    action: ({ ui }) => ui.stopSpeech(),
  },
  {
    keywords: ["홈으로", "처음으로", "홈", "메인"],
    action: ({ ui }) => ui.goHome(),
  },
  {
    keywords: ["뒤로", "이전", "back"],
    action: ({ ui }) => {
      window.history.back();
      ui.speak("뒤로 이동합니다.");
    },
  },
];
