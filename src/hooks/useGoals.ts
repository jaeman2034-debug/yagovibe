/**
 * 🔥 useGoals - 목표 조회 및 자동 집계 훅
 * 
 * 역할:
 * - 사용자 목표 조회
 * - 활동 기록 기반 자동 집계
 * - 실시간 업데이트
 * 
 * UX 목적:
 * - 성장 탭에서 목표 진행률 표시
 * - 활동 기록 → 목표 자동 반영
 */

import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Goal } from "@/services/growthService";
import { updateAllGoalsProgress } from "@/services/growthService";

/**
 * 🔥 목표 조회 및 자동 집계 훅
 * 
 * @param uid 사용자 UID
 * @returns 목표 목록, 로딩 상태
 */
export function useGoals(uid?: string) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setGoals([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    // 🔥 목표 실시간 구독
    const q = query(
      collection(db, "goals"),
      where("uid", "==", uid)
    );

    let isFirstLoad = true;

    const unsub = onSnapshot(
      q,
      async (snap) => {
        const goalsList: Goal[] = snap.docs.map((d) => ({
          ...(d.data() as Goal),
        }));

        setGoals(goalsList);
        setLoading(false);

        // 🔥 목표가 있고 첫 로드일 때만 자동 집계 실행 (중복 호출 방지)
        if (goalsList.length > 0 && isFirstLoad) {
          isFirstLoad = false;
          try {
            await updateAllGoalsProgress(uid);
          } catch (error) {
            console.error("❌ [useGoals] 목표 집계 실패:", error);
          }
        }
      },
      (err) => {
        console.error("❌ [useGoals] 목표 조회 실패:", err);
        setGoals([]);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [uid]);

  return { goals, loading };
}
