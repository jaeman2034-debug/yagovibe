/**
 * 🔥 useRoutineStreak - 루틴 Streak 조회 훅
 * 
 * 역할:
 * - 루틴 연속 체크 일수 조회
 * - 실시간 업데이트
 * 
 * UX 목적:
 * - 성장 탭에서 Streak 표시
 * - 재방문율 상승
 */

import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { RoutineStreak } from "@/services/growthService";
import { calculateRoutineStreak } from "@/services/growthService";

/**
 * 🔥 루틴 Streak 조회 훅
 * 
 * @param uid 사용자 UID
 * @param streakType Streak 타입 (기본: "all")
 * @returns Streak 데이터, 로딩 상태
 */
export function useRoutineStreak(
  uid?: string,
  streakType: RoutineStreak["streakType"] = "all"
) {
  const [streak, setStreak] = useState<RoutineStreak | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setStreak(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    // 🔥 Streak 실시간 구독
    const docId = `${uid}_${streakType}`;
    const docRef = doc(db, "routineStreak", docId);

    const unsub = onSnapshot(
      docRef,
      async (snap) => {
        if (snap.exists()) {
          const data = snap.data() as RoutineStreak;
          setStreak(data);
        } else {
          // 🔥 Streak 데이터가 없으면 계산 실행
          try {
            const calculated = await calculateRoutineStreak(uid, streakType);
            setStreak(calculated);
          } catch (error) {
            console.error("❌ [useRoutineStreak] Streak 계산 실패:", error);
            setStreak(null);
          }
        }
        setLoading(false);
      },
      (err) => {
        console.error("❌ [useRoutineStreak] Streak 조회 실패:", err);
        setStreak(null);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [uid, streakType]);

  return { streak, loading };
}
