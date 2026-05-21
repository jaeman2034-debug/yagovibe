/**
 * 🔥 useMatches - 경기 매칭글 조회 훅
 */

import { useState, useEffect } from "react";
import { collection, query, where, orderBy, onSnapshot, limit as firestoreLimit, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Match } from "@/types/match";
import type { SportType } from "@/types/sport";
import { toDate } from "@/utils/timeUtils";

interface UseMatchesOptions {
  status?: "open" | "matched" | "finished";
  sport?: SportType; // 🔥 멀티 스포츠 필터 추가
  region?: string; // 🔥 지역 필터 추가
  date?: Date; // 특정 날짜의 매칭만 조회
  limit?: number;
  teamId?: string; // 특정 팀의 매칭글만 조회
}

function matchTimeToMinutes(time: string | undefined): number {
  const [h = "0", m = "0"] = (time || "00:00").split(":");
  return Number(h) * 60 + Number(m);
}

function sortMatchesByDateAndTime(list: Match[]): Match[] {
  return [...list].sort((a, b) => {
    const da = toDate(a.date).getTime();
    const db = toDate(b.date).getTime();
    if (da !== db) return da - db;
    return matchTimeToMinutes(a.time) - matchTimeToMinutes(b.time);
  });
}

export function useMatches(options: UseMatchesOptions = {}) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const conditions: any[] = [];

    if (options.status) {
      conditions.push(where("status", "==", options.status));
    }

    if (options.sport) {
      conditions.push(where("sport", "==", options.sport));
    }

    if (options.region) {
      conditions.push(where("matchRegion", "==", options.region));
    }

    if (options.date) {
      const startOfDay = Timestamp.fromDate(new Date(options.date.setHours(0, 0, 0, 0)));
      const endOfDay = Timestamp.fromDate(new Date(options.date.setHours(23, 59, 59, 999)));
      conditions.push(where("date", ">=", startOfDay));
      conditions.push(where("date", "<=", endOfDay));
    }

    if (options.teamId) {
      conditions.push(where("teamId", "==", options.teamId));
    }

    conditions.push(orderBy("date", "asc"));

    if (options.limit) {
      conditions.push(firestoreLimit(options.limit));
    }

    const q = query(collection(db, "matches"), ...conditions);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const matchesList = sortMatchesByDateAndTime(
          snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as Match[]
        );

        setMatches(matchesList);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("❌ [useMatches] 조회 실패:", err);
        setError(err as Error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [options.status, options.sport, options.region, options.date, options.teamId, options.limit]);

  return { matches, loading, error };
}
