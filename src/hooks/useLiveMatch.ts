/**
 * 🔴 useLiveMatch 훅
 * 
 * 역할:
 * - 경기 실시간 구독
 * - 점수/상태 변경 감지
 */

import { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { EventMatch } from "@/types/event";

interface UseLiveMatchOptions {
  enabled?: boolean;
}

export function useLiveMatch(
  matchId: string | undefined,
  options?: UseLiveMatchOptions
) {
  const [match, setMatch] = useState<EventMatch | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const enabled = options?.enabled !== false;

  useEffect(() => {
    if (!matchId || !enabled) {
      setMatch(null);
      setLoading(false);
      return;
    }

    const matchRef = doc(db, "event_matches", matchId);
    
    const unsubscribe = onSnapshot(
      matchRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setMatch({
            id: snapshot.id,
            ...snapshot.data(),
          } as EventMatch);
        } else {
          setMatch(null);
        }
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("Live match 구독 실패:", err);
        setError(err as Error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [matchId, enabled]);

  return {
    match,
    loading,
    error,
  };
}
