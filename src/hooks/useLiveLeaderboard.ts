/**
 * 🔴 useLiveLeaderboard 훅
 * 
 * 역할:
 * - 리더보드 실시간 구독
 * - 순위 변화 감지
 */

import { useState, useEffect } from "react";
import { collection, query, where, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface LeaderboardItem {
  id: string;
  playerId: string;
  playerName: string;
  teamId?: string;
  teamName?: string;
  value: number;
  rank: number;
  updatedAt: any;
}

interface UseLiveLeaderboardOptions {
  enabled?: boolean;
  limitCount?: number;
}

export function useLiveLeaderboard(
  eventId: string | undefined,
  category: "goals" | "assists" | "appearances",
  options?: UseLiveLeaderboardOptions
) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const enabled = options?.enabled !== false;
  const limitCount = options?.limitCount || 10;

  useEffect(() => {
    if (!eventId || !enabled) {
      setLeaderboard([]);
      setLoading(false);
      return;
    }

    // leaderboards 컬렉션에서 조회
    const leaderboardRef = collection(db, "leaderboards");
    const q = query(
      leaderboardRef,
      where("eventId", "==", eventId),
      where("category", "==", category),
      orderBy("value", "desc"),
      limit(limitCount)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items: LeaderboardItem[] = snapshot.docs.map((doc, index) => ({
          id: doc.id,
          ...doc.data(),
          rank: index + 1,
        })) as LeaderboardItem[];

        setLeaderboard(items);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("Live leaderboard 구독 실패:", err);
        setError(err as Error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [eventId, category, enabled, limitCount]);

  return {
    leaderboard,
    loading,
    error,
  };
}
