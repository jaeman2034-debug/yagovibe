import { useMemo, useState } from "react";
import { toast } from "sonner";
import { startTeamBillingReRegister } from "@/lib/team/teamBillingReRegisterFlow";
import type { FeeMemberRow } from "../types";
import TeamFeeMemberPaymentCard from "./TeamFeeMemberPaymentCard";

type Props = {
  teamId: string;
  feeId: string;
  rows: FeeMemberRow[];
  /** `teams/.../members` 기준 허용 `linkedAuthUid` — 있으면 `memberId`가 이 집합에 속한 행만 렌더 */
  allowedBillingMemberIds?: Set<string>;
  dueDateLabel?: string | null;
  /** 이번 회비 마감일 연도 — 연납 커버 여부 판단 */
  feeDueYear?: number;
  canRecordManualPayments?: boolean;
  /** 총무: 연납 일괄 등록 */
  canMarkYearly?: boolean;
  /** 현재 회차 월 회비(원) — 연납 할인 금액 계산 */
  standardMonthlyFee?: number;
  /** 이번 회차 기준 멤버별 환불 배분 합 — `allocationDetail.perFeeWon[feeId]` */
  refundAllocatedByMemberId?: Record<string, number>;
  onRefreshPayments?: () => void;
};

export default function FeeMemberPaymentList({
  teamId,
  feeId,
  rows,
  allowedBillingMemberIds,
  dueDateLabel,
  feeDueYear,
  canRecordManualPayments = false,
  canMarkYearly = false,
  standardMonthlyFee,
  refundAllocatedByMemberId = {},
  onRefreshPayments,
}: Props) {
  const [billingBusyUid, setBillingBusyUid] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  const visibleRows = useMemo(() => {
    const filtered = rows.filter((r) => {
      const mid = String(r.memberId ?? "").trim();
      if (!mid) return false;
      if (allowedBillingMemberIds && allowedBillingMemberIds.size > 0 && !allowedBillingMemberIds.has(mid)) {
        return false;
      }
      return true;
    });
    return [...filtered].sort((a, b) => {
      const byName = a.name.localeCompare(b.name, "ko", { sensitivity: "base" });
      if (byName !== 0) return byName;
      return String(a.memberId ?? a.uid).localeCompare(String(b.memberId ?? b.uid));
    });
  }, [rows, allowedBillingMemberIds]);

  const handleReRegister = async (row: FeeMemberRow) => {
    if (billingBusyUid) return;
    setBillingBusyUid(row.uid);
    try {
      await startTeamBillingReRegister(teamId);
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "카드 등록을 시작할 수 없습니다.");
      setBillingBusyUid(null);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="text-lg font-semibold text-slate-900">멤버 납부</div>
          <button
            type="button"
            onClick={() => setCollapsed((prev) => !prev)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            aria-expanded={!collapsed}
            aria-label={collapsed ? "멤버 납부 목록 펼치기" : "멤버 납부 목록 접기"}
          >
            {collapsed ? "목록 펼치기" : "목록 접기"}
          </button>
        </div>
        <p className="mt-0.5 text-xs text-slate-500">이름 · 금액 · 마감을 한눈에 보고 바로 독촉할 수 있어요.</p>
      </div>

      {!collapsed && <div className="divide-y divide-slate-100">
        {visibleRows.map((row) => {
          const unpaidHighlight = row.paymentStatus !== "paid";
          return (
            <div
              key={row.memberId ?? row.uid}
              className={
                unpaidHighlight
                  ? "bg-amber-50/35 transition-colors dark:bg-amber-950/15"
                  : "bg-white"
              }
            >
              <TeamFeeMemberPaymentCard
                teamId={teamId}
                feeId={feeId}
                row={row}
                standardMonthlyFee={standardMonthlyFee}
                dueDateLabel={dueDateLabel}
                feeDueYear={feeDueYear}
                billingBusyUid={billingBusyUid}
                canRecordManualPayment={canRecordManualPayments}
                canMarkYearly={canMarkYearly}
                refundAllocatedWon={refundAllocatedByMemberId[row.uid] ?? 0}
                onRefreshPayments={onRefreshPayments}
                onReRegister={() => void handleReRegister(row)}
              />
            </div>
          );
        })}
        {visibleRows.length === 0 && (
          <div className="px-4 py-10 text-center text-sm text-slate-500">
            조건에 맞는 멤버가 없습니다.
          </div>
        )}
      </div>}
    </div>
  );
}
