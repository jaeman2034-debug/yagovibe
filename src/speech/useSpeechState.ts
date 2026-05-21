// src/speech/useSpeechState.ts
// 🔥 Phase 3-2: SpeechManager 상태 구독 훅

import { useEffect, useState } from "react";
import type { SpeechState } from "./SpeechManager";
import { speechManager } from "./SpeechManager";

export function useSpeechState() {
  const [state, setState] = useState<SpeechState>(speechManager.getState());

  useEffect(() => {
    return speechManager.subscribe(setState);
  }, []);

  return state;
}

