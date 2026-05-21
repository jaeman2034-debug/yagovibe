import { onDisconnect, ref, remove, update } from "firebase/database";
import { rtdb } from "@/lib/firebase";
import type { MatchmakingMode } from "./types";

/**
 * 브라우저 종료 시 큐 항목·presence 정리 (서버 Callable 보조)
 * RTDB rules: 본인 queue entry 삭제만 허용
 */
export function registerMatchmakingOnDisconnect(uid: string, mode: MatchmakingMode): () => void {
  const entryRef = ref(rtdb, `matchmaking/queues/${mode}/entries/${uid}`);
  const presRef = ref(rtdb, `presence/${uid}`);

  const offEntry = onDisconnect(entryRef);
  offEntry.remove();
  const offPres = onDisconnect(presRef);
  offPres.update({
    online: false,
    queueMode: null,
    lastSeen: Date.now(),
  });

  return () => {
    offEntry.cancel();
    offPres.cancel();
  };
}
