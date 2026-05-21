/**
 * 🔥 useCurrentSession - 현재 활성 세션 실시간 구독 훅
 * 
 * 역할:
 * - Firestore에서 직접 활성 세션 조회 (존재 상태 엔진)
 * - sessions 컬렉션에서 uid + status == "active" 쿼리
 * - 실시간 구독으로 상태 변경 즉시 반영
 * - 새로고침/탭 이동/로그인 후 자동 복구
 * 
 * 설계 철학:
 * - Firestore 기반 존재 상태 UI
 * - 단일 진실 소스 (Single Source of Truth)
 * - 상태는 Firestore가 소유, UI는 반영만
 * 
 * 사용 예시:
 * ```tsx
 * const { session, loading } = useCurrentSession(userId);
 * 
 * if (session) {
 *   return <ActiveSessionCard session={session} ... />;
 * }
 * ```
 */

import { useState, useEffect } from "react";
import { collection, query, where, limit, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthForFirestore } from "@/hooks/useAuthForFirestore";
import type { ActiveSession } from "@/components/hub/ActiveSessionCard";
import { getSportLabel } from "@/constants/sports";
import type { ActivitySession } from "@/types/activitySession";

/**
 * 🔥 useCurrentSession 반환 타입
 */
export interface UseCurrentSessionReturn {
  session: ActiveSession | null;
  loading: boolean;
  error: string | null;
}

/**
 * 🔥 useCurrentSession 훅
 * 
 * Firestore 기반 존재 상태 엔진:
 * - sessions 컬렉션에서 직접 쿼리
 * - uid == userId && status == "active"
 * - 실시간 구독으로 상태 변경 즉시 반영
 * 
 * @param userId 사용자 ID (uid)
 * @returns UseCurrentSessionReturn
 */
export function useCurrentSession(userId: string | null): UseCurrentSessionReturn {
  const { canQuery } = useAuthForFirestore();
  const [session, setSession] = useState<ActiveSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!canQuery || !userId) {
      setSession(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // 🔥 Firestore에서 직접 활성 세션 쿼리
    // sessions where uid == userId && status == "active"
    // 참고: 활성 세션은 1개만 존재하므로 orderBy 불필요
    const sessionsQuery = query(
      collection(db, "sessions"),
      where("uid", "==", userId),
      where("status", "==", "active"),
      limit(1) // 활성 세션은 1개만
    );

    // 🔥 이전 세션 ID (불필요한 setState 방지)
    let prevSessionIdRef: string | null = null;

    // 🔥 실시간 구독
    const unsubscribe = onSnapshot(
      sessionsQuery,
      (snapshot) => {
        try {
          if (snapshot.empty) {
            if (prevSessionIdRef !== null) {
              prevSessionIdRef = null;
              setSession(null);
            }
            setLoading(false);
            return;
          }

          // 🔥 첫 번째 문서 (활성 세션)
          const sessionDoc = snapshot.docs[0];
          const sessionId = sessionDoc.id;
          if (prevSessionIdRef === sessionId) {
            setLoading(false);
            return; // 동일 세션이면 setState 스킵 (리렌더 방지)
          }
          prevSessionIdRef = sessionId;

          const sessionData = sessionDoc.data() as ActivitySession;

          // 🔥 ActiveSession 타입으로 변환
          const activeSession: ActiveSession = {
            id: sessionDoc.id,
            sport: sessionData.sport,
            sportLabel: getSportLabel(sessionData.sport),
            locationLabel: sessionData.location.dong,
            startedAt: sessionData.startedAt,
            status: "active",
          };

          setSession(activeSession);
          setLoading(false);
        } catch (err: any) {
          console.error("❌ [useCurrentSession] 세션 데이터 변환 실패:", err);
          setError(err.message || "세션 데이터 변환 실패");
          setSession(null);
          setLoading(false);
        }
      },
      (err) => {
        console.error("❌ [useCurrentSession] 세션 구독 실패:", err);
        setError(err.message || "세션 구독 실패");
        setSession(null);
        setLoading(false);
      }
    );

    // 🔥 cleanup 함수
    return () => unsubscribe();
  }, [userId, canQuery]);

  return { session, loading, error };
}
