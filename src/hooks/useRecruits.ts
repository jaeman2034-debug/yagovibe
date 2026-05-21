/**
 * 🔥 useRecruits - 팀원 모집글 조회 훅
 */

import { useState, useEffect } from "react";
import { collection, query, where, orderBy, onSnapshot, limit as firestoreLimit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Recruit } from "@/types/recruit";
import type { SportType } from "@/types/sport";

interface UseRecruitsOptions {
  status?: "open" | "closed";
  sport?: SportType; // 🔥 멀티 스포츠 필터 추가
  region?: string; // 🔥 지역 필터 추가
  limit?: number;
  teamId?: string; // 특정 팀의 모집글만 조회
}

export function useRecruits(options: UseRecruitsOptions = {}) {
  const [recruits, setRecruits] = useState<Recruit[]>([]);
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
      conditions.push(where("region", "==", options.region));
    }

    if (options.teamId) {
      conditions.push(where("teamId", "==", options.teamId));
    }

    conditions.push(orderBy("createdAt", "desc"));

    if (options.limit) {
      conditions.push(firestoreLimit(options.limit));
    }

    const q = query(collection(db, "recruits"), ...conditions);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const recruitsList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Recruit[];

        setRecruits(recruitsList);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("❌ [useRecruits] 조회 실패:", err);
        setError(err as Error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [options.status, options.sport, options.region, options.teamId, options.limit]);

  return { recruits, loading, error };
}
