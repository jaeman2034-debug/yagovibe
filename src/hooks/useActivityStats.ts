/**
 * 🔥 useActivityStats - 활동 통계 조회 훅
 * 
 * 역할:
 * - 오늘 총 운동 시간 계산
 * - 이번 주 운동 횟수 계산
 * - 이번 주 총 운동 시간 계산
 * - 실시간 구독으로 자동 업데이트
 * 
 * UX 목적:
 * - 앱 가치 3배 상승
 * - 사용자 성취감 강화
 * - 리텐션 증가
 */

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthForFirestore } from "@/hooks/useAuthForFirestore";

export type ActivityStats = {
  todayMin: number;
  weekMin: number;
  weekCount: number;
};

/**
 * 🔥 활동 통계 조회 훅
 * 
 * @param uid 사용자 UID
 * @returns 오늘/이번 주 통계
 */
export function useActivityStats(uid?: string) {
  const { canQuery } = useAuthForFirestore();
  const [stats, setStats] = useState<ActivityStats>({
    todayMin: 0,
    weekMin: 0,
    weekCount: 0,
  });

  useEffect(() => {
    if (!canQuery || !uid) {
      setStats({
        todayMin: 0,
        weekMin: 0,
        weekCount: 0,
      });
      return;
    }

    const now = new Date();

    // 🔥 오늘 시작 시간 (00:00:00)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // 🔥 이번 주 시작 시간 (일요일 00:00:00)
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay()); // 일요일로 이동
    weekStart.setHours(0, 0, 0, 0);

    const q = query(
      collection(db, "activityHistory"),
      where("uid", "==", uid),
      where("endedAt", ">=", Timestamp.fromDate(weekStart))
    );

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        let todayMin = 0;
        let weekMin = 0;
        let weekCount = 0;

        snap.docs.forEach((d) => {
          const data = d.data();
          
          // 🔥 endedAt을 Date로 변환
          let ended: Date | null = null;
          if (data.endedAt) {
            if (data.endedAt.toDate && typeof data.endedAt.toDate === "function") {
              ended = data.endedAt.toDate();
            } else if (data.endedAt instanceof Date) {
              ended = data.endedAt;
            } else if (data.endedAt.seconds) {
              ended = new Date(data.endedAt.seconds * 1000);
            }
          }

          if (!ended) return;

          // 🔥 durationMs를 분 단위로 변환
          const durationMs = data.durationMs || 0;
          const durationMin = Math.floor(durationMs / 60000);

          weekMin += durationMin;
          weekCount += 1;

          // 🔥 오늘 날짜인지 확인
          if (ended >= todayStart) {
            todayMin += durationMin;
          }
        });

        setStats({ todayMin, weekMin, weekCount });
      },
      (err) => {
        console.error("❌ [useActivityStats] 활동 통계 조회 실패:", err);
        setStats({
          todayMin: 0,
          weekMin: 0,
          weekCount: 0,
        });
      }
    );

    return () => unsubscribe();
  }, [uid, canQuery]);

  return stats;
}
