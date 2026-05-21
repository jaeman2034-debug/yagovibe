/**
 * 🔥 useTodayHistory - 오늘 활동 기록 조회 훅
 * 
 * 역할:
 * - 오늘 종료된 세션들을 실시간으로 조회
 * - history 컬렉션에서 오늘 날짜의 기록만 필터링
 * - 실시간 구독으로 자동 업데이트
 * 
 * UX 목적:
 * - 앱이 "기억한다"는 느낌 제공
 * - 사용자 데이터 가치 상승
 * - 재방문 이유 생성
 */

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthForFirestore } from "@/hooks/useAuthForFirestore";

export type HistorySession = {
  id: string;
  sport: string;
  durationMin: number;
  endedAt: Timestamp;
};

/**
 * 🔥 오늘 활동 기록 조회 훅
 * 
 * @param uid 사용자 UID
 * @returns 오늘 종료된 세션 목록
 */
export function useTodayHistory(uid?: string) {
  const { canQuery } = useAuthForFirestore();
  const [sessions, setSessions] = useState<HistorySession[]>([]);

  useEffect(() => {
    if (!canQuery || !uid) {
      setSessions([]);
      return;
    }

    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const q = query(
      collection(db, "activityHistory"),
      where("uid", "==", uid),
      where("endedAt", ">=", Timestamp.fromDate(start))
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs.map((d) => {
          const docData = d.data();
          // 🔥 durationMs를 durationMin으로 변환
          const durationMs = docData.durationMs || 0;
          const durationMin = Math.floor(durationMs / 60000);

          return {
            id: d.id,
            sport: docData.sport || "",
            durationMin: durationMin,
            endedAt: docData.endedAt as Timestamp,
          } as HistorySession;
        });
        setSessions(data);
      },
      (err) => {
        console.error("❌ [useTodayHistory] 오늘 활동 기록 조회 실패:", err);
        setSessions([]);
      }
    );

    return () => unsub();
  }, [uid, canQuery]);

  return sessions;
}
