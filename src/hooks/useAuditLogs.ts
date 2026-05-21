/**
 * 🔥 useAuditLogs - AuditLogs 조회 훅
 * 
 * 최적화:
 * - 최근 50개만 조회 (기본)
 * - 페이지네이션 지원
 * - admin만 조회 가능 (Firestore Rules)
 */

import { useEffect, useState } from "react";
import { collection, query, orderBy, limit, getDocs, QueryConstraint, startAfter } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { AuditLog } from "@/types/audit";

export interface UseAuditLogsOptions {
  teamId: string | null | undefined;
  pageSize?: number;
}

export function useAuditLogs({ teamId, pageSize = 50 }: UseAuditLogsOptions) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [lastDoc, setLastDoc] = useState<any>(null);

  useEffect(() => {
    if (!teamId) {
      setLoading(false);
      setLogs([]);
      return;
    }

    const fetchLogs = async () => {
      try {
        setLoading(true);
        setError(null);

        // 🔥 기본 조회 (최근 50개)
        const auditLogsRef = collection(db, `teams/${teamId}/auditLogs`);
        const constraints: QueryConstraint[] = [
          orderBy("createdAt", "desc"),
          limit(pageSize),
        ];

        const q = query(auditLogsRef, ...constraints);
        const snapshot = await getDocs(q);

        const auditLogs: AuditLog[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        } as AuditLog));

        setLogs(auditLogs);
        setHasMore(snapshot.docs.length === pageSize);
        setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      } catch (err) {
        console.error("❌ [useAuditLogs] AuditLogs 조회 실패:", err);
        setError(err instanceof Error ? err : new Error("AuditLogs 조회에 실패했습니다."));
        setLogs([]);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [teamId, pageSize]);

  const loadMore = async () => {
    if (!teamId || !lastDoc || loading) return;

    try {
      setLoading(true);

      const auditLogsRef = collection(db, `teams/${teamId}/auditLogs`);
      const q = query(
        auditLogsRef,
        orderBy("createdAt", "desc"),
        startAfter(lastDoc),
        limit(pageSize)
      );

      const snapshot = await getDocs(q);
      const newLogs: AuditLog[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      } as AuditLog));

      setLogs((prev) => [...prev, ...newLogs]);
      setHasMore(snapshot.docs.length === pageSize);
      setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
    } catch (err) {
      console.error("❌ [useAuditLogs] 추가 조회 실패:", err);
      setError(err instanceof Error ? err : new Error("추가 조회에 실패했습니다."));
    } finally {
      setLoading(false);
    }
  };

  return {
    logs,
    loading,
    error,
    hasMore,
    loadMore,
  };
}
