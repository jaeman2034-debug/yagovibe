// src/speech/intentDispatcher.ts
// 🔥 Phase 3-3: Intent 디스패처 (액션 실행)

import type { Intent } from "./intents";

type DispatchContext = {
  navigate: (to: string) => void;
  onSearch?: (q: string) => void;
};

export function dispatchIntent(intent: Intent, ctx: DispatchContext) {
  switch (intent.type) {
    case "NAVIGATE":
      // 🔥 Phase 6-2: Intent v2 스키마 (payload.to)
      const to = intent.payload.to;
      if (to === "..") {
        window.history.back();
      } else {
        ctx.navigate(to);
      }
      return;

    case "SEARCH":
      // 🔥 Phase 6-2: Intent v2 스키마 (payload.query)
      ctx.onSearch?.(intent.payload.query);
      return;

    case "SCROLL":
      // 🔥 Phase 6-2: Intent v2 스키마 (payload.direction)
      window.scrollBy({
        top: intent.payload.direction === "down" ? 400 : -400,
        behavior: "smooth",
      });
      return;

    case "STOP":
      // 🔥 Phase 6: 중지 명령 (SpeechManager.stopAll 호출)
      import("@/speech/SpeechManager").then(({ speechManager }) => {
        speechManager.stopAll();
      });
      return;

    case "RECOMMEND":
      // 🔥 Phase 8: 추천 Intent (실행 ❌, 질문만)
      // 실제 실행은 CONFIRM_YES에서만
      return;

    case "CONFIRM_YES":
      // 🔥 Phase 8: 추천 승인 → 실행
      // SpeechCommandBridge에서 pendingRecommendation 처리
      return;

    case "CONFIRM_NO":
      // 🔥 Phase 8: 추천 거절 → 쿨다운 설정
      // SpeechCommandBridge에서 처리
      return;

    case "UNKNOWN":
      // 🔥 Phase 4-2: UNKNOWN 로깅 (Firestore 기반 텔레메트리)
      // 🔥 Phase 6-2: Intent v2에는 raw가 없으므로 텔레메트리는 IntentRouter에서 처리
      return;
  }
}

