// src/ui/speechUIAdapter.ts
// 🔥 Phase 3-2: UI Adapter (SpeechManager는 navigate/setState 직접 호출 ❌)

import type { NavigateFunction } from "react-router-dom";
import { speechManager } from "@/speech/SpeechManager";

export class SpeechUIAdapter {
  constructor(
    private navigate: NavigateFunction,
    private categorySetter?: (key: string) => void
  ) {}

  stopSpeech() {
    console.log("[SpeechUI] stopSpeech");
    speechManager.stopAll();
    speechManager.speak("알겠습니다");
  }

  goHome() {
    this.navigate("/sports-hub");
    speechManager.speak("알겠습니다");
  }

  selectCategory(key: string) {
    if (!this.categorySetter) {
      // 기본 동작: URL 파라미터로 카테고리 전달
      this.navigate(`/sports-hub?category=${key}`);
      speechManager.speak("알겠습니다");
      return;
    }
    this.categorySetter(key);
    speechManager.speak("알겠습니다");
  }

  navigateTo(path: string) {
    this.navigate(path);
  }

  speak(text: string) {
    speechManager.speak(text);
  }
}

