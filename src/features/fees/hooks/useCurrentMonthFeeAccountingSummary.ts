import { useEffect, useMemo, useState } from "react";
import type { FeePayment, TeamFee, TeamMember } from "@/features/fees/types";
import { useTeamFees } from "./useTeamFees";
import { useTeamMembers } from "@/features/team/hooks/useTeamMembers";
import { fetchTeamPaymentsByFeeId } from "@/lib/team/fetchTeamFeeRollupData";
import {
  buildFeeMemberRows,
  filterMembersForFeeKpi,
  yearlyMemberKpi,
} from "@/features/fees/utils/feeDashboard";
import { firestoreLikeToDate } from "@/lib/firebase/firestoreLikeToDate";
import {
  isDueInSeoulYm,
  teamFeeCurrentSeoulMonthKey,
} from "@/lib/fees/seoulFeeMonthKey";

export type CurrentMonthFeeAccountingSummary = {
  loading: boolean;
  error: string | null;
  /** 이번 달(Asia/Seoul 달력) 마감일 기준 회비 — 오픈·마감 포함 */
  feesDueThisMonthCount: number;
  openFeesDueThisMonthCount: number;
  closedFeesDueThisMonthCount: number;
  /** 오픈 회차만 집계한 금액·인원 */
  totalExpectedWon: number;
  collectedWon: number;
  unpaidWon: number;
  unpaidMemberCount: number;
  /** 활성 멤버(회비 KPI 로스터) 기준 */
  rosterMemberCount: number;
  yearlyMemberRate: number;
  unpaidMemberRate: number;
  /** 이번 달 마감일 회차 중 마감 비율 */
  closeRatePercent: number | null;
};

/**
 * 팀 관리 fees 탭용 — 이번 달(브라우저 로컬 달력) 마감일이 속한 회차만 집계.
 * 금액·미납 인원은 `payments` + `buildFeeMemberRows` 기준(회비 대시보드와 동일).
 */
export function useCurrentMonthFeeAccountingSummary(teamId: string | undefined): CurrentMonthFeeAccountingSummary {
  const { fees, loading: feesLoading, error: feesError } = useTeamFees(teamId ?? "");
  const { members, loading: membersLoading, error: membersError } = useTeamMembers(teamId ?? "");

  const feesDueThisMonth = useMemo(() => {
    if (!fees.length) return [];
    const ym = teamFeeCurrentSeoulMonthKey();
    return fees.filter((f) => isDueInSeoulYm(firestoreLikeToDate(f.dueDate as unknown), ym));
  }, [fees]);

  const openFeesDueThisMonth = useMemo(
    () => feesDueThisMonth.filter((f) => f.status === "open"),
    [feesDueThisMonth]
  );

  const [paymentsByFeeId, setPaymentsByFeeId] = useState<Record<string, FeePayment[]>>({});
  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  const openFeeIdsKey = useMemo(
    () =>
      openFeesDueThisMonth
        .map((f) => f.id)
        .sort()
        .join(","),
    [openFeesDueThisMonth]
  );

  useEffect(() => {
    if (!teamId || openFeesDueThisMonth.length === 0) {
      setPaymentsByFeeId({});
      setPayLoading(false);
      setPayError(null);
      return;
    }
    let cancelled = false;
    setPayLoading(true);
    setPayError(null);
    void fetchTeamPaymentsByFeeId(teamId)
      .then((byFee) => {
        if (cancelled) return;
        const slice: Record<string, FeePayment[]> = {};
        for (const f of openFeesDueThisMonth) {
          slice[f.id] = byFee[f.id] ?? [];
        }
        setPaymentsByFeeId(slice);
      })
      .catch(() => {
        if (!cancelled) setPayError("납부 데이터를 불러오지 못했습니다.");
      })
      .finally(() => {
        if (!cancelled) setPayLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [teamId, openFeeIdsKey, openFeesDueThisMonth]);

  const derived = useMemo(() => {
    const roster = filterMembersForFeeKpi(members);
    const yearly = yearlyMemberKpi(roster);

    let totalExpectedWon = 0;
    let collectedWon = 0;
    const unpaidMemberIds = new Set<string>();

    for (const fee of openFeesDueThisMonth) {
      const plist = paymentsByFeeId[fee.id] ?? [];
      const rows = buildFeeMemberRows(roster, plist, fee.amount, fee.dueDate ?? null, fee.id);
      for (const r of rows) {
        const amt = Math.max(0, Math.floor(Number(r.amount) || 0));
        totalExpectedWon += amt;
        if (r.paymentStatus === "paid") {
          collectedWon += amt;
        } else if (r.paymentStatus === "unpaid" || r.paymentStatus === "overdue") {
          const id = String(r.memberId ?? r.uid ?? "").trim();
          if (id) unpaidMemberIds.add(id);
        }
      }
    }

    const unpaidWon = Math.max(0, totalExpectedWon - collectedWon);
    const rosterMemberCount = roster.length;
    const unpaidMemberRate =
      rosterMemberCount > 0 ? Math.round((unpaidMemberIds.size / rosterMemberCount) * 100) : 0;

    const closedCount = feesDueThisMonth.filter((f) => f.status === "closed").length;
    const closeRatePercent =
      feesDueThisMonth.length > 0
        ? Math.round((closedCount / feesDueThisMonth.length) * 100)
        : null;

    return {
      totalExpectedWon,
      collectedWon,
      unpaidWon,
      unpaidMemberCount: unpaidMemberIds.size,
      rosterMemberCount,
      yearlyMemberRate: yearly.yearlyMemberRate,
      unpaidMemberRate,
      closeRatePercent,
    };
  }, [members, openFeesDueThisMonth, paymentsByFeeId, feesDueThisMonth]);

  const loading = Boolean(teamId) && (feesLoading || membersLoading || payLoading);
  const error =
    feesError || membersError || payError
      ? feesError || membersError || payError || "요약을 불러오지 못했습니다."
      : null;

  return {
    loading,
    error,
    feesDueThisMonthCount: feesDueThisMonth.length,
    openFeesDueThisMonthCount: openFeesDueThisMonth.length,
    closedFeesDueThisMonthCount: feesDueThisMonth.filter((f) => f.status === "closed").length,
    ...derived,
  };
}
