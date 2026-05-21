import { useCallback, useEffect, useRef, useState } from "react";
import { onValue, ref } from "firebase/database";
import { rtdb } from "@/lib/firebase";
import {
  callJoinQueue,
  callLeaveMatch,
  callLeaveQueue,
  callReadyCheck,
} from "@/lib/matchmaking/matchmakingClient";
import { registerMatchmakingOnDisconnect } from "@/lib/matchmaking/matchmakingPresence";
import type { MatchFoundState, MatchmakingMode, QueueEntry } from "@/lib/matchmaking/types";

type State = {
  mode: MatchmakingMode;
  queued: boolean;
  queueMetaCount: number;
  entry: QueueEntry | null;
  match: MatchFoundState | null;
  estimatedWaitSec: number | null;
  loading: boolean;
  error: string | null;
};

export function useMatchmaking(uid: string | undefined, initialMode: MatchmakingMode = "5v5") {
  const [mode, setMode] = useState<MatchmakingMode>(initialMode);
  const modeRef = useRef(mode);
  modeRef.current = mode;

  const [state, setState] = useState<State>({
    mode: initialMode,
    queued: false,
    queueMetaCount: 0,
    entry: null,
    match: null,
    estimatedWaitSec: null,
    loading: false,
    error: null,
  });

  const queuedRef = useRef(false);
  const disconnectCancelRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!uid?.trim()) {
      setState((s) => ({ ...s, queued: false, entry: null, match: null }));
      return;
    }

    const entryRef = ref(rtdb, `matchmaking/queues/${mode}/entries/${uid}`);
    const metaRef = ref(rtdb, `matchmaking/queues/${mode}/meta`);
    const presenceRef = ref(rtdb, `presence/${uid}`);

    const unEntry = onValue(entryRef, (snap) => {
      const exists = snap.exists();
      queuedRef.current = exists;
      setState((s) => ({
        ...s,
        entry: exists ? (snap.val() as QueueEntry) : null,
        queued: exists,
        error: exists ? null : s.error,
      }));

      if (exists && uid) {
        disconnectCancelRef.current?.();
        disconnectCancelRef.current = registerMatchmakingOnDisconnect(uid, modeRef.current);
      } else {
        disconnectCancelRef.current?.();
        disconnectCancelRef.current = null;
      }
    });

    const unMeta = onValue(metaRef, (snap) => {
      const count = typeof snap.val()?.count === "number" ? snap.val().count : 0;
      setState((s) => ({ ...s, queueMetaCount: count }));
    });

    let unMatch: (() => void) | undefined;
    const unPresence = onValue(presenceRef, (snap) => {
      unMatch?.();
      unMatch = undefined;
      const matchId = typeof snap.val()?.activeMatchId === "string" ? snap.val().activeMatchId.trim() : "";
      if (!matchId) {
        setState((s) => ({ ...s, match: null }));
        return;
      }
      const matchRef = ref(rtdb, `matchmaking/matches/${matchId}`);
      unMatch = onValue(matchRef, (mSnap) => {
        if (!mSnap.exists()) {
          setState((s) => ({ ...s, match: null, queued: false }));
          return;
        }
        const m = mSnap.val() as MatchFoundState;
        setState((s) => ({
          ...s,
          match: m,
          queued: false,
          error: m.status === "cancelled" ? "매치가 취소되었거나 시간이 만료되었습니다." : s.error,
        }));
      });
    });

    return () => {
      unEntry();
      unMeta();
      unPresence();
      unMatch?.();
      disconnectCancelRef.current?.();
      disconnectCancelRef.current = null;
    };
  }, [uid, mode]);

  const leaveQueueSilently = useCallback(async () => {
    if (!uid?.trim()) return;
    try {
      await callLeaveQueue(modeRef.current);
    } catch {
      /* best effort */
    }
  }, [uid]);

  useEffect(() => {
    const onPageHide = () => {
      if (queuedRef.current) void leaveQueueSilently();
    };
    window.addEventListener("pagehide", onPageHide);
    return () => {
      window.removeEventListener("pagehide", onPageHide);
      if (queuedRef.current) void leaveQueueSilently();
    };
  }, [leaveQueueSilently]);

  const joinQueue = useCallback(async () => {
    if (!uid?.trim()) return;
    setState((s) => ({ ...s, loading: true, error: null }));
    let timeoutId = 0;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = window.setTimeout(
        () => reject(new Error("큐 입장 시간이 초과되었습니다. 네트워크·Functions 배포를 확인하고 다시 시도해 주세요.")),
        22_000,
      );
    });
    try {
      const res = await Promise.race([callJoinQueue(modeRef.current), timeoutPromise]);
      window.clearTimeout(timeoutId);
      setState((s) => ({
        ...s,
        loading: false,
        queued: res.status === "queued",
        match: res.match ?? s.match,
        estimatedWaitSec: res.estimatedWaitSec ?? null,
        error:
          res.status === "queued" || res.match
            ? null
            : "큐 입장에 실패했습니다. 아래 「다시 시도」를 눌러 주세요.",
      }));
    } catch (e) {
      window.clearTimeout(timeoutId);
      const msg = e instanceof Error ? e.message : "큐 입장에 실패했습니다.";
      setState((s) => ({
        ...s,
        loading: false,
        error: msg,
      }));
    }
  }, [uid]);

  const leaveQueue = useCallback(async () => {
    if (!uid?.trim()) return;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      await callLeaveQueue(modeRef.current);
      setState((s) => ({ ...s, loading: false, queued: false, estimatedWaitSec: null }));
    } catch (e) {
      setState((s) => ({
        ...s,
        loading: false,
        error: e instanceof Error ? e.message : "큐 나가기에 실패했습니다.",
      }));
    }
  }, [uid]);

  const leaveMatch = useCallback(async () => {
    const matchId = state.match?.matchId;
    if (!matchId) return;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      await callLeaveMatch(matchId);
      setState((s) => ({ ...s, loading: false, match: null }));
    } catch (e) {
      setState((s) => ({
        ...s,
        loading: false,
        error: e instanceof Error ? e.message : "매치 나가기에 실패했습니다.",
      }));
    }
  }, [state.match?.matchId]);

  const setReady = useCallback(
    async (ready: boolean) => {
      const matchId = state.match?.matchId;
      if (!matchId) return;
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const res = await callReadyCheck(matchId, ready);
        setState((s) => ({
          ...s,
          loading: false,
          match: res.match ?? s.match,
        }));
        return res.sessionId;
      } catch (e) {
        setState((s) => ({
          ...s,
          loading: false,
          error: e instanceof Error ? e.message : "준비 확인에 실패했습니다.",
        }));
        return undefined;
      }
    },
    [state.match?.matchId]
  );

  return {
    mode,
    setMode,
    ...state,
    joinQueue,
    leaveQueue,
    leaveMatch,
    setReady,
  };
}
