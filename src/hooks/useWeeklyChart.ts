/**
 * 🔥 useWeeklyChart - 주간 활동 그래프 데이터 조회 훅
 * 
 * 역할:
 * - 이번 주 요일별 운동 시간 계산
 * - 일요일부터 토요일까지 7일 데이터
 * - 실시간 구독으로 자동 업데이트
 * 
 * UX 목적:
 * - 사용자가 "내 활동이 쌓인다" 느낌
 * - 앱이 기록 앱에서 습관 앱으로 전환
 * - 리텐션 핵심 기능
 */

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthForFirestore } from "@/hooks/useAuthForFirestore";

/**
 * 🔥 주간 활동 그래프 데이터 조회 훅
 * 
 * @param uid 사용자 UID
 * @returns 요일별 운동 시간 배열 [일, 월, 화, 수, 목, 금, 토] (분 단위)
 */
export function useWeeklyChart(uid?: string) {
  const { canQuery } = useAuthForFirestore();
  const [data, setData] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);

  useEffect(() => {
    if (!canQuery || !uid) {
      setData([0, 0, 0, 0, 0, 0, 0]);
      return;
    }

    const now = new Date();
    
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
        // 🔥 요일별 배열 초기화 [일, 월, 화, 수, 목, 금, 토]
        const days = [0, 0, 0, 0, 0, 0, 0];

        snap.docs.forEach((d) => {
          const docData = d.data();
          
          // 🔥 endedAt을 Date로 변환
          let ended: Date | null = null;
          if (docData.endedAt) {
            if (docData.endedAt.toDate && typeof docData.endedAt.toDate === "function") {
              ended = docData.endedAt.toDate();
            } else if (docData.endedAt instanceof Date) {
              ended = docData.endedAt;
            } else if (docData.endedAt.seconds) {
              ended = new Date(docData.endedAt.seconds * 1000);
            }
          }

          if (!ended) return;

          // 🔥 이번 주 범위인지 확인
          if (ended < weekStart) return;

          // 🔥 요일 인덱스 (0=일요일, 1=월요일, ..., 6=토요일)
          const dayIndex = ended.getDay();

          // 🔥 durationMs를 분 단위로 변환
          const durationMs = docData.durationMs || 0;
          const durationMin = Math.floor(durationMs / 60000);

          // 🔥 해당 요일에 시간 추가
          days[dayIndex] += durationMin;
        });

        setData(days);
      },
      (err) => {
        console.error("❌ [useWeeklyChart] 주간 그래프 데이터 조회 실패:", err);
        setData([0, 0, 0, 0, 0, 0, 0]);
      }
    );

    return () => unsubscribe();
  }, [uid, canQuery]);

  return data;
}
