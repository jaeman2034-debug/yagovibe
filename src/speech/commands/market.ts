// src/speech/commands/market.ts
// 🔥 Phase 3-2: Market 전용 음성 명령

import type { SpeechCommand } from "./types";

export const marketCommands: SpeechCommand[] = [
  {
    keywords: ["중고 장비", "중고", "used"],
    action: ({ ui }) => {
      // MarketPage에서 voiceCommand 이벤트 리스너로 처리
      window.dispatchEvent(
        new CustomEvent("voiceCommand", { detail: { action: "filter", params: { type: "used" } } })
      );
      ui.speak("중고 장비만 보여드릴게요.");
    },
  },
  {
    keywords: ["최신 글", "최신순", "latest"],
    action: ({ ui }) => {
      window.dispatchEvent(
        new CustomEvent("voiceCommand", { detail: { action: "sort", params: { type: "latest" } } })
      );
      ui.speak("최신순으로 정렬합니다.");
    },
  },
  {
    keywords: ["가격 낮은 순", "저렴한 순", "priceAsc"],
    action: ({ ui }) => {
      window.dispatchEvent(
        new CustomEvent("voiceCommand", { detail: { action: "sort", params: { type: "priceAsc" } } })
      );
      ui.speak("가격 낮은 순으로 정렬합니다.");
    },
  },
];
