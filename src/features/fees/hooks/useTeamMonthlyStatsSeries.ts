import { collection, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import type { TeamMonthlyStatsDoc } from "../types/teamMonthlyStats";
import { enumerateSeoulYyyyMmRange, seoulYyyyMm, seoulYyyyMmAddMonths } from "../utils/seoulFeeDue";

export type TeamMonthlyChartPoint = {
  month: string;
  monthLabel: string;
  revenue: number;
  paymentRate: number;
  autopaySuccessRate: number;
  overdueRate: number;
  totalSlots?: number;
  overdueCount?: number;
  autopayFailCount?: number;
  autopaySuccessCount?: number;
};

function parseStatsDoc(id: string, d: Record<string, unknown>): TeamMonthlyStatsDoc {
  return {
    month: String(d.month || id),
    totalFees: Number(d.totalFees ?? 0),
    totalMembers: Number(d.totalMembers ?? 0),
    paidCount: Number(d.paidCount ?? 0),
    unpaidCount: Number(d.unpaidCount ?? 0),
    overdueCount: Number(d.overdueCount ?? 0),
    totalSlots: typeof d.totalSlots === "number" ? d.totalSlots : undefined,
    autopaySuccessCount: Number(d.autopaySuccessCount ?? 0),
    autopayFailCount: Number(d.autopayFailCount ?? 0),
    revenue: Number(d.revenue ?? 0),
    paymentRate: Number(d.paymentRate ?? 0),
    autopaySuccessRate: Number(d.autopaySuccessRate ?? 0),
    overdueRate: Number(d.overdueRate ?? 0),
  };
}

function toChartPoint(month: string, row: TeamMonthlyStatsDoc | null): TeamMonthlyChartPoint {
  const y = month.slice(0, 4);
  const m = month.slice(4, 6);
  return {
    month,
    monthLabel: `${y.slice(2)}.${m}`,
    revenue: row?.revenue ?? 0,
    paymentRate: row?.paymentRate ?? 0,
    autopaySuccessRate: row?.autopaySuccessRate ?? 0,
    overdueRate: row?.overdueRate ?? 0,
    totalSlots: row?.totalSlots,
    overdueCount: row?.overdueCount,
    autopayFailCount: row?.autopayFailCount,
    autopaySuccessCount: row?.autopaySuccessCount,
  };
}

/**
 * teams/{teamId}/statsMonthly 최근 monthCount개월(서울 달력) 구간을 실시간 구독.
 * 문서가 없는 달은 0으로 채워 차트가 끊기지 않게 함.
 */
export function useTeamMonthlyStatsSeries(teamId: string | undefined, monthCount = 6) {
  const [points, setPoints] = useState<TeamMonthlyChartPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!teamId) {
      setPoints([]);
      setLoading(false);
      setError(null);
      return;
    }

    const endKey = seoulYyyyMm();
    const startKey = seoulYyyyMmAddMonths(endKey, -(monthCount - 1));
    const expectedKeys = enumerateSeoulYyyyMmRange(startKey, endKey);

    const q = query(
      collection(db, "teams", teamId, "statsMonthly"),
      where("month", ">=", startKey),
      where("month", "<=", endKey),
      orderBy("month", "asc")
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        setError(null);
        const byMonth = new Map<string, TeamMonthlyStatsDoc>();
        snap.forEach((docSnap) => {
          byMonth.set(docSnap.id, parseStatsDoc(docSnap.id, docSnap.data() as Record<string, unknown>));
        });
        const next = expectedKeys.map((m) => toChartPoint(m, byMonth.get(m) ?? null));
        setPoints(next);
        setLoading(false);
      },
      (e) => {
        console.error("[useTeamMonthlyStatsSeries]", e);
        setError("추이 데이터를 불러오지 못했습니다.");
        setPoints([]);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [teamId, monthCount]);

  return { points, loading, error };
}
