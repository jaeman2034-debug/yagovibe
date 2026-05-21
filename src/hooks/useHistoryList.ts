/**
 * 🔥 useHistoryList - 전체 활동 기록 목록 조회 훅
 * 
 * 역할:
 * - 사용자의 전체 활동 기록을 시간순으로 조회
 * - activityHistory 컬렉션에서 최근 20개 기록 가져오기
 * - 실시간 구독으로 자동 업데이트
 * 
 * UX 목적:
 * - 마이페이지에서 전체 기록 관리
 * - 허브 = 동기, 마이페이지 = 관리 역할 분리
 */

import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface ActivityHistoryItem {
  id: string;
  sport: string;
  durationMin: number;
  endedAt: any;
}

/**
 * 🔥 전체 활동 기록 목록 조회 훅
 * 
 * @param uid 사용자 UID
 * @returns 시간순 정렬된 기록 목록 (최신순, 최근 20개)
 */
export const useHistoryList = (uid?: string) => {
  const [items, setItems] = useState<ActivityHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const q = query(
      collection(db, "activityHistory"),
      where("uid", "==", uid),
      orderBy("endedAt", "desc"),
      limit(20)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: ActivityHistoryItem[] = snap.docs.map((d) => {
          const docData = d.data();
          
          // 🔥 durationMs를 분 단위로 변환
          const durationMs = docData.durationMs || 0;
          const durationMin = Math.floor(durationMs / 60000);

          return {
            id: d.id,
            sport: docData.sport || "",
            durationMin: durationMin,
            endedAt: docData.endedAt || null,
          };
        });

        setItems(list);
        setLoading(false);
      },
      (err) => {
        console.error("❌ [useHistoryList] 활동 기록 목록 조회 실패:", err);
        setItems([]);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [uid]);

  return { items, loading };
};
