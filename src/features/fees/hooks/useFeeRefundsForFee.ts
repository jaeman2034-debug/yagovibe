import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { FirebaseError } from "firebase/app";
import { db } from "@/lib/firebase";
import type { TeamFeeRefund } from "@/types/teamFeeRefund";

function normalizeRefundDoc(id: string, data: Record<string, unknown>): TeamFeeRefund | null {
  const memberId =
    (typeof data.memberId === "string" && data.memberId.trim()) ||
    (typeof data.userId === "string" && data.userId.trim()) ||
    "";
  if (!memberId) return null;
  const originalPaymentDocId =
    typeof data.originalPaymentDocId === "string" ? data.originalPaymentDocId.trim() : "";
  if (!originalPaymentDocId) return null;
  const amt = Math.floor(Number(data.refundAmountWon ?? 0));
  const status = String(data.status ?? "").trim() || "unknown";
  let allocationDetail: TeamFeeRefund["allocationDetail"];
  if (data.allocationDetail && typeof data.allocationDetail === "object" && data.allocationDetail !== null) {
    const rawPer = (data.allocationDetail as { perFeeWon?: Record<string, unknown> }).perFeeWon;
    if (rawPer && typeof rawPer === "object") {
      allocationDetail = {
        perFeeWon: Object.fromEntries(
          Object.entries(rawPer).map(([k, v]) => [k, Math.floor(Number(v ?? 0))])
        ),
      };
    }
  }
  const feeIds = Array.isArray(data.feeIds)
    ? data.feeIds.filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    : undefined;

  return {
    id,
    teamId: typeof data.teamId === "string" ? data.teamId : "",
    feeId: typeof data.feeId === "string" ? data.feeId : undefined,
    memberId,
    originalPaymentDocId,
    refundAmountWon: Number.isFinite(amt) ? amt : 0,
    currency: typeof data.currency === "string" ? data.currency : undefined,
    reason: typeof data.reason === "string" ? data.reason : undefined,
    refundKind: typeof data.refundKind === "string" ? data.refundKind : undefined,
    status,
    allocationDetail,
    feeIds,
    sourceBulkPaymentId:
      typeof data.sourceBulkPaymentId === "string" ? data.sourceBulkPaymentId : undefined,
    idempotencyKey: typeof data.idempotencyKey === "string" ? data.idempotencyKey : undefined,
    createdByUid: typeof data.createdByUid === "string" ? data.createdByUid : undefined,
  };
}

/** 선택 회차(`feeId`)에 영향을 주는 환불 문서만 구독 — `feeIds` array-contains */
export function useFeeRefundsForFee(teamId: string, feeId: string | undefined) {
  const [refunds, setRefunds] = useState<TeamFeeRefund[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!teamId || !feeId) {
      setRefunds([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(collection(db, "teams", teamId, "feeRefunds"), where("feeIds", "array-contains", feeId));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const next: TeamFeeRefund[] = [];
        for (const doc of snap.docs) {
          const raw = doc.data() as Record<string, unknown>;
          const n = normalizeRefundDoc(doc.id, raw);
          if (n) next.push(n);
        }
        setRefunds(next);
        setLoading(false);
      },
      (err) => {
        console.error(err);
        if (err instanceof FirebaseError && err.code) {
          if (err.code === "permission-denied") {
            setError("환불 내역 조회 권한이 없습니다.");
          } else {
            setError(`환불 내역을 불러오지 못했습니다. (${err.code})`);
          }
        } else {
          setError("환불 내역을 불러오지 못했습니다.");
        }
        setLoading(false);
      }
    );

    return () => unsub();
  }, [teamId, feeId]);

  return { refunds, loading, error };
}
