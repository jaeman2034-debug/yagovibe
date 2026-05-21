/**
 * 🔥 운영 로그 실시간 구독 Hook (opLogs)
 * 
 * 기능:
 * - Firestore opLogs 컬렉션 실시간 구독
 * - 최신순 정렬 (ts desc)
 * - 필터링 지원 (level, type)
 * - 최근 200개 제한
 */

import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  limit,
  where,
  QueryConstraint,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export type OpLogType =
  | "APPLY_SUBMITTED"
  | "APPLY_APPROVED"
  | "DRAW_EXECUTED"
  | "MATCH_RESULT"
  | "TOURNAMENT_FINALIZED"
  | "INVITE_REISSUED"
  | "TEAM_LOCKED"
  | "ERROR";

export type OpLogLevel = "info" | "warn" | "error";

export interface OpLog {
  id: string;
  ts: any; // Firestore Timestamp
  type: OpLogType;
  level: OpLogLevel;
  actorUid?: string;
  actorRole?: "admin" | "captain" | "system";
  message: string;
  ref?: {
    collection: string;
    docId: string;
  };
  meta?: Record<string, any>;
}

export function useOpLogs({
  associationId,
  tournamentId,
  level,
  type,
  enabled = true, // 🔥 조건부 실행 (기본값: true)
}: {
  associationId: string | undefined;
  tournamentId: string | undefined;
  level?: string;
  type?: string;
  enabled?: boolean; // 🔥 추가: 관리자 권한 체크용
}) {
  const [logs, setLogs] = useState<OpLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 🔥 조건부 실행: enabled가 false면 구독하지 않음
    if (!enabled || !associationId || !tournamentId) {
      setLogs([]);
      setLoading(false);
      return;
    }

    try {
      const ref = collection(
        db,
        "associations",
        associationId,
        "tournaments",
        tournamentId,
        "opLogs"
      );

      const constraints: QueryConstraint[] = [orderBy("ts", "desc"), limit(200)];
      if (level) constraints.unshift(where("level", "==", level));
      if (type) constraints.unshift(where("type", "==", type));

      const q = query(ref, ...constraints);

      const unsub = onSnapshot(
        q,
        (snap) => {
          const data = snap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          })) as OpLog[];
          setLogs(data);
          setLoading(false);
        },
        (error: any) => {
          // 🔥 권한 오류는 조용히 처리 (관리자가 아닐 수 있음)
          if (error?.code === "permission-denied" || error?.code === "missing-or-insufficient-permissions") {
            console.log("[운영 로그 구독] 권한 없음 - 관리자 전용 데이터입니다");
            setLogs([]);
            setLoading(false);
          } else {
            console.error("[운영 로그 구독 오류]", error);
            setLogs([]);
            setLoading(false);
          }
        }
      );

      return () => unsub();
    } catch (err: any) {
      console.error("[운영 로그 쿼리 설정 오류]", err);
      setLogs([]);
      setLoading(false);
    }
  }, [associationId, tournamentId, level, type, enabled]); // 🔥 enabled 의존성 추가

  return { logs, loading };
}
