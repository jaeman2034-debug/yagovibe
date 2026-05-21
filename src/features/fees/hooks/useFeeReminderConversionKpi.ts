import { useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { FirebaseError } from "firebase/app";
import { db } from "@/lib/firebase";
import type { FeePayment, TeamMember } from "../types";
import { filterFeePaymentsForActiveMembers } from "../utils/feeDashboard";
import {
  computeFeeReminderConversionKpi,
  parseFeeReminderStatsDoc,
  resolveFeeReminderPhase,
  type FeeDueReminderNotifRow,
  type FeeReminderConversionKpiResult,
} from "../utils/feeReminderConversionKpi";

function mapDocsToReminderRows(docs: QueryDocumentSnapshot[]): FeeDueReminderNotifRow[] {
  const rows: FeeDueReminderNotifRow[] = [];
  for (const doc of docs) {
    const d = doc.data() as Record<string, unknown>;
    if (String(d.type || "") !== "fee_due_reminder") continue;
    const uid = String(d.targetUid || d.userId || "").trim();
    if (!uid) continue;
    const atRaw = d.createdAt;
    const atMs =
      atRaw && typeof (atRaw as { toMillis?: () => number }).toMillis === "function"
        ? (atRaw as { toMillis: () => number }).toMillis()
        : null;
    if (atMs == null) continue;
    rows.push({
      uid,
      phase: resolveFeeReminderPhase(d.feeReminderPhase),
      atMs,
    });
  }
  return rows;
}

/**
 * 마감 전 회비 알림(`fee_due_reminder`) → 결제 전환 KPI.
 * - `teams/.../feeReminderStats/{feeId}` 서버 집계가 있으면 우선 사용
 * - 없으면 `notifications` + `payments` 클라이언트 조인 (동일 규칙)
 */
export function useFeeReminderConversionKpi(
  teamId: string,
  feeId: string | undefined,
  payments: FeePayment[],
  paymentsLoading: boolean,
  members?: TeamMember[]
): {
  kpi: FeeReminderConversionKpiResult | null;
  reminderRowCount: number;
  dataSource: "server" | "client";
  loading: boolean;
  error: string | null;
} {
  const [rows, setRows] = useState<FeeDueReminderNotifRow[]>([]);
  const [notifLoading, setNotifLoading] = useState(true);
  const [statsRaw, setStatsRaw] = useState<Record<string, unknown> | null | undefined>(undefined);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!teamId || !feeId) {
      setRows([]);
      setNotifLoading(false);
      setError(null);
      return;
    }

    setNotifLoading(true);
    setError(null);

    const q = query(
      collection(db, "notifications"),
      where("teamId", "==", teamId),
      where("feeId", "==", feeId),
      where("type", "==", "fee_due_reminder")
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        setRows(mapDocsToReminderRows(snap.docs));
        setNotifLoading(false);
        setError(null);
      },
      (err) => {
        console.error(err);
        if (err instanceof FirebaseError && err.code === "permission-denied") {
          setError("알림 이력 조회 권한이 없습니다.");
        } else if (err instanceof FirebaseError && err.code === "failed-precondition") {
          setError("알림 조회에 필요한 Firestore 인덱스가 없을 수 있습니다. 콘솔 링크로 인덱스를 생성해 주세요.");
        } else {
          setError("알림 이력을 불러오지 못했습니다.");
        }
        setNotifLoading(false);
      }
    );

    return () => unsub();
  }, [teamId, feeId]);

  useEffect(() => {
    if (!teamId || !feeId) {
      setStatsRaw(undefined);
      setStatsLoading(false);
      return;
    }
    setStatsLoading(true);
    const ref = doc(db, "teams", teamId, "feeReminderStats", feeId);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        setStatsRaw(snap.exists() ? (snap.data() as Record<string, unknown>) : null);
        setStatsLoading(false);
      },
      (err) => {
        console.error(err);
        setStatsRaw(null);
        setStatsLoading(false);
      }
    );
    return () => unsub();
  }, [teamId, feeId]);

  const serverKpi = useMemo(() => parseFeeReminderStatsDoc(statsRaw ?? undefined), [statsRaw]);

  const paymentsForKpi = useMemo(() => {
    if (!members || members.length === 0) return payments;
    return filterFeePaymentsForActiveMembers(payments, members);
  }, [payments, members]);

  const clientKpi = useMemo(() => {
    if (!feeId) return null;
    return computeFeeReminderConversionKpi(rows, paymentsForKpi);
  }, [rows, paymentsForKpi, feeId]);

  const kpi = serverKpi ?? clientKpi;
  const dataSource: "server" | "client" = serverKpi ? "server" : "client";

  const reminderRowCount = useMemo(() => {
    if (dataSource === "server" && statsRaw && typeof statsRaw.reminderDocCount === "number") {
      return statsRaw.reminderDocCount;
    }
    return rows.length;
  }, [dataSource, statsRaw, rows.length]);

  const loading = notifLoading || paymentsLoading || statsLoading;

  return {
    kpi,
    reminderRowCount,
    dataSource,
    loading,
    error,
  };
}
