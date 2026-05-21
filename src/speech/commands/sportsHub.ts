// src/speech/commands/sportsHub.ts
// 🔥 Phase 3-2: Sports Hub 전용 음성 명령

import type { SpeechCommand } from "./types";

export const sportsHubCommands: SpeechCommand[] = [
  {
    keywords: ["축구", "football", "soccer"],
    action: ({ ui }) => ui.selectCategory("football"),
  },
  {
    keywords: ["농구", "basketball"],
    action: ({ ui }) => ui.selectCategory("basketball"),
  },
  {
    keywords: ["야구", "baseball"],
    action: ({ ui }) => ui.selectCategory("baseball"),
  },
  {
    keywords: ["러닝", "달리기", "running", "조깅"],
    action: ({ ui }) => ui.selectCategory("running"),
  },
  {
    keywords: ["헬스", "운동", "fitness", "피트니스"],
    action: ({ ui }) => ui.selectCategory("fitness"),
  },
  {
    keywords: ["배구", "volleyball"],
    action: ({ ui }) => ui.selectCategory("volleyball"),
  },
  {
    keywords: ["골프", "golf"],
    action: ({ ui }) => ui.selectCategory("golf"),
  },
  {
    keywords: ["테니스", "tennis"],
    action: ({ ui }) => ui.selectCategory("tennis"),
  },
  {
    keywords: ["지도 보여줘", "지도", "맵", "지도로"],
    action: ({ ui }) => {
      ui.navigateTo("/market/map");
      ui.speak("지도 페이지로 이동합니다.");
    },
  },
];
