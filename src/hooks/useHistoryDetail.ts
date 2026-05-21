/**
 * 🔥 useHistoryDetail - 활동 기록 상세 조회 훅
 * 
 * 역할:
 * - 단일 활동 기록의 상세 정보 조회
 * - activityHistory 컬렉션에서 특정 ID의 기록 가져오기
 * - 실시간 구독으로 자동 업데이트
 * 
 * UX 목적:
 * - 기록 상세 페이지에서 전체 정보 표시
 * - 기록 이해 및 관리
 */

import { useEffect, useState } from "react";
import { doc, onSnapshot, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface HistoryDetail {
  id: string;
  sessionId: string;
  uid: string;
  sport: string;
  location: {
    lat: number;
    lng: number;
    dong: string;
    gu?: string | null;
    si?: string | null;
  };
  startedAt: Timestamp | Date | null;
  endedAt: Timestamp | Date | null;
  durationMs: number;
  participants: string[];
  visibilityRadius: number;
  createdAt: Timestamp | Date | null;
}

/**
 * 🔥 활동 기록 상세 조회 훅
 * 
 * @param historyId 기록 ID
 * @returns 기록 상세 정보
 */
export function useHistoryDetail(historyId: string | null | undefined) {
  const [detail, setDetail] = useState<HistoryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!historyId) {
      setDetail(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const docRef = doc(db, "activityHistory", historyId);

    const unsubscribe = onSnapshot(
      docRef,
      (snap) => {
        if (!snap.exists()) {
          setDetail(null);
          setLoading(false);
          return;
        }

        const data = snap.data();
        setDetail({
          id: snap.id,
          sessionId: data.sessionId || "",
          uid: data.uid || "",
          sport: data.sport || "",
          location: data.location || {
            lat: 0,
            lng: 0,
            dong: "",
          },
          startedAt: data.startedAt || null,
          endedAt: data.endedAt || null,
          durationMs: data.durationMs || 0,
          participants: data.participants || [],
          visibilityRadius: data.visibilityRadius || 1500,
          createdAt: data.createdAt || null,
        });
        setLoading(false);
      },
      (err) => {
        console.error("❌ [useHistoryDetail] 활동 기록 상세 조회 실패:", err);
        setError(err);
        setDetail(null);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [historyId]);

  return {
    detail,
    loading,
    error,
  };
}
