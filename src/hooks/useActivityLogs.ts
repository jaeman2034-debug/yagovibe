/**
 * 🔥 useActivityLogs - 활동 로그 조회 훅 (STEP: 알림 히스토리 & 활동 로그)
 * 
 * 규칙:
 * - enabled 가드
 * - 기본값 반환 ([])
 * - throw ❌
 * - 로그 없음 = [] = 정상
 * - 절대 삭제 ❌ (개인 커리어의 재료)
 */

import { useState, useEffect } from "react";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthProvider";
import type { ActivityLog } from "@/types/notification";

interface UseActivityLogsOptions {
  enabled?: boolean;
  category?: "TEAM" | "TOURNAMENT" | "RESULT";
  seasonId?: string | null;
}

export function useActivityLogs(options?: UseActivityLogsOptions) {
  const { user } = useAuth();
  const enabled = options?.enabled !== false && !!user?.uid;
  const category = options?.category;
  const seasonId = options?.seasonId;

  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!enabled) {
      setLogs([]);
      setLoading(false);
      setError(null);
      return;
    }

    const fetchActivityLogs = async () => {
      try {
        setLoading(true);
        setError(null);

        const logsRef = collection(db, "activityLogs");
        let q = query(
          logsRef,
          where("userId", "==", user!.uid),
          orderBy("createdAt", "desc")
        );

        // 필터링
        if (category) {
          q = query(q, where("category", "==", category));
        }
        if (seasonId) {
          q = query(q, where("context.seasonId", "==", seasonId));
        }

        const snap = await getDocs(q);

        const logsData = snap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as ActivityLog[];

        setLogs(logsData);
      } catch (err) {
        console.warn("[useActivityLogs] 활동 로그 조회 실패 (정상 상태로 처리):", err);
        setLogs([]); // 에러 시 빈 배열 = 정상 상태
        setError(err instanceof Error ? err : new Error("활동 로그 조회 실패"));
      } finally {
        setLoading(false);
      }
    };

    fetchActivityLogs();
  }, [enabled, user?.uid, category, seasonId]);

  return {
    logs,
    loading,
    error: null, // 에러는 정상 상태로 처리
  };
}
