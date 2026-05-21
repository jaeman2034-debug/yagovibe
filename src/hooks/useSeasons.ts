/**
 * 🔥 useSeasons - 시즌 목록 조회 훅 (STEP: 시즌/연도 관리 시스템)
 * 
 * 규칙:
 * - enabled 가드
 * - 기본값 반환 ([])
 * - throw ❌
 * - 시즌 없음 = [] = 정상
 */

import { useState, useEffect } from "react";
import { collection, query, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Season } from "@/types/season";

interface UseSeasonsOptions {
  enabled?: boolean;
}

export function useSeasons(options?: UseSeasonsOptions) {
  const enabled = options?.enabled !== false;
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!enabled) {
      setSeasons([]);
      setLoading(false);
      setError(null);
      return;
    }

    const fetchSeasons = async () => {
      try {
        setLoading(true);
        setError(null);

        const seasonsRef = collection(db, "seasons");
        const q = query(seasonsRef, orderBy("startDate", "desc")); // 최신순

        const snap = await getDocs(q);

        const seasonsData = snap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Season[];

        setSeasons(seasonsData);
      } catch (err) {
        console.warn("[useSeasons] 시즌 조회 실패 (정상 상태로 처리):", err);
        setSeasons([]); // 에러 시 빈 배열 = 정상 상태
        setError(err instanceof Error ? err : new Error("시즌 조회 실패"));
      } finally {
        setLoading(false);
      }
    };

    fetchSeasons();
  }, [enabled]);

  return {
    seasons,
    loading,
    error: null, // 에러는 정상 상태로 처리
  };
}
