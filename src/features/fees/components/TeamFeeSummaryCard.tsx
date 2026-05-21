import type { FeeDashboardStats } from "../types";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("ko-KR").format(value);
}

export type TeamFeeSummaryCardProps = {
  stats: FeeDashboardStats;
  feeTitle: string;
  feeAmount: number;
  dueLabel?: string | null;
  /** 미납 금액 타일 클릭 — 미납 필터 */
  onOutstandingAmountClick?: () => void;
  reconciliationBadge?: {
    loading?: boolean;
    isMatched: boolean;
    deltaWon: number;
  };
};

/** 모바일 우선: 한 장 요약 + 납부율 바 */
export default function TeamFeeSummaryCard({
  stats,
  feeTitle,
  feeAmount,
  dueLabel,
  onOutstandingAmountClick,
  reconciliationBadge,
}: TeamFeeSummaryCardProps) {
  const rate = Math.min(100, Math.max(0, stats.paymentRate));
  const rateTone = rate >= 100 ? "text-emerald-600" : rate > 0 ? "text-amber-600" : "text-red-600";
  const health =
    rate < 50
      ? { label: "위험", className: "bg-red-100 text-red-900 ring-1 ring-red-200" }
      : rate < 70
        ? { label: "주의", className: "bg-amber-100 text-amber-900 ring-1 ring-amber-200" }
        : { label: "양호", className: "bg-emerald-100 text-emerald-900 ring-1 ring-emerald-200" };

  const cashBookCollected = stats.collectedAmountWon ?? 0;
  const allFeesCashBook = stats.allFeesMembershipCashBookIncomeWon ?? 0;
  const showTeamWideCashBook = allFeesCashBook > cashBookCollected;
  const crossFeeCashBookHint = cashBookCollected === 0 && allFeesCashBook > 0;
  const paymentsSoTCollected = stats.paymentsSoTCollectedWon ?? 0;
  const paidWithoutCash = stats.paidWithoutCashMemberCount ?? 0;
  const outstanding = stats.outstandingAmountWon ?? 0;
  const yearlyRate = stats.yearlyMemberRate ?? 0;
  const yearlyN = stats.yearlyMemberCount ?? 0;

  return (
    <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-white to-slate-50/80 p-4 shadow-sm sm:p-5">
      <div className="mb-2 flex flex-wrap items-center justify-end gap-2">
        {reconciliationBadge ? (
          <span
            className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ring-1 ${
              reconciliationBadge.loading
                ? "bg-slate-100 text-slate-700 ring-slate-200"
                : reconciliationBadge.isMatched
                  ? "bg-emerald-100 text-emerald-900 ring-emerald-200"
                  : "bg-rose-100 text-rose-900 ring-rose-200"
            }`}
          >
            {reconciliationBadge.loading
              ? "정합 점검 중..."
              : reconciliationBadge.isMatched
                ? "정합 정상: 합계 일치"
                : `정합 불일치: ${formatCurrency(Math.abs(reconciliationBadge.deltaWon))}원 ${
                    reconciliationBadge.deltaWon > 0 ? "부족" : "초과"
                  }`}
          </span>
        ) : null}
        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${health.className}`}>
          납부율 {rate}% — {health.label}
        </span>
      </div>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">이번 회비</p>
          <p className="mt-0.5 text-[11px] text-slate-400">회차 전체 기준 · 유형 필터와 무관</p>
          <h2 className="mt-1 truncate text-lg font-bold text-slate-900 sm:text-2xl">{feeTitle}</h2>
          <p className="mt-2 text-xl font-bold tabular-nums text-slate-900 sm:text-3xl">
            {formatCurrency(feeAmount)}
            <span className="text-base font-semibold text-slate-600 sm:text-lg">원</span>
          </p>
          {dueLabel ? (
            <p className="mt-2 text-sm text-slate-600">
              마감: <span className="font-medium text-slate-800">{dueLabel}</span>
            </p>
          ) : null}
        </div>

        <div className="w-full shrink-0 lg:max-w-xs">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-slate-500">납부 진행</p>
            <p className={`text-sm font-bold tabular-nums ${rateTone}`}>{rate}%</p>
          </div>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-200">
            <div
              className={`h-full rounded-full transition-[width] duration-500 ${
                rate >= 100 ? "bg-emerald-500" : rate > 0 ? "bg-amber-500" : "bg-red-500"
              }`}
              style={{ width: `${rate}%` }}
            />
          </div>
          <p className="mt-2 text-right text-xs text-slate-500">
            회계 반영(cashBook) {formatCurrency(cashBookCollected)}원
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-200/90 pt-4 sm:mt-5 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5">
          <p className="text-[11px] font-medium text-slate-500">총 인원</p>
          <p className="mt-0.5 text-lg font-bold tabular-nums text-slate-900">{stats.totalMembers}명</p>
        </div>
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/80 px-3 py-2.5">
          <p className="text-[11px] font-medium text-emerald-800">납부 완료</p>
          <p className="mt-0.5 text-lg font-bold tabular-nums text-emerald-950">{stats.paidCount}명</p>
        </div>
        <div className="rounded-xl border border-amber-100 bg-amber-50/80 px-3 py-2.5">
          <p className="text-[11px] font-medium text-amber-900">미납</p>
          <p className="mt-0.5 text-lg font-bold tabular-nums text-amber-950">{stats.notPaidCount}명</p>
        </div>
        <div className="rounded-xl border border-indigo-100 bg-indigo-50/80 px-3 py-2.5">
          <p className="text-[11px] font-medium text-indigo-800">납부율</p>
          <p className={`mt-0.5 text-lg font-bold tabular-nums ${rateTone}`}>{rate}%</p>
        </div>
      </div>

      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/90 px-3 py-2.5">
          <p className="text-[11px] font-medium text-emerald-900">이 회차 회계 반영 (cashBook)</p>
          <p className="mt-0.5 text-lg font-bold tabular-nums text-emerald-800">
            {formatCurrency(cashBookCollected)}원
          </p>
          {showTeamWideCashBook ? (
            <p className="mt-1 text-[10px] font-medium text-emerald-900/95">
              팀 전체 회비 수입(cashBook):{" "}
              <span className="tabular-nums">{formatCurrency(allFeesCashBook)}원</span>
              {crossFeeCashBookHint ? (
                <span className="mt-0.5 block font-normal text-emerald-950/90">
                  → 상단 <strong>회차</strong>를 바꿔 확인하세요. 전체 백필만 하고 다른 회차를 보고 있으면 여기는 0원일 수
                  있습니다.
                </span>
              ) : null}
            </p>
          ) : null}
          <p className="mt-0.5 text-[10px] text-emerald-800/80">
            멤버 행 합(부분납·연납 분해 반영): {formatCurrency(paymentsSoTCollected)}원
          </p>
          {paidWithoutCash > 0 ? (
            <p className="mt-1 text-[10px] leading-snug text-emerald-900/90">
              연납·면제 등 당월 입금 없이 완납 처리만: <strong>{paidWithoutCash}명</strong> (현금 0은 정상일 수 있음)
            </p>
          ) : null}
        </div>
        {onOutstandingAmountClick ? (
          <button
            type="button"
            onClick={onOutstandingAmountClick}
            className="w-full rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-left transition hover:bg-rose-100 focus:outline-none focus:ring-2 focus:ring-rose-300"
          >
            <p className="text-[11px] font-medium text-rose-900">미납 금액(클릭 → 미납만)</p>
            <p className="mt-0.5 text-lg font-bold tabular-nums text-rose-800">{formatCurrency(outstanding)}원</p>
            <p className="mt-0.5 text-[10px] text-rose-900/80">멤버 행 잔액 합(동일 기준)</p>
          </button>
        ) : (
          <div className="rounded-xl border border-rose-200 bg-rose-50/90 px-3 py-2.5">
            <p className="text-[11px] font-medium text-rose-900">미납 금액</p>
            <p className="mt-0.5 text-lg font-bold tabular-nums text-rose-800">{formatCurrency(outstanding)}원</p>
          </div>
        )}
        <div className="rounded-xl border border-violet-200 bg-violet-50/90 px-3 py-2.5">
          <p className="text-[11px] font-medium text-violet-900">연납자 비율</p>
          <p className="mt-0.5 text-lg font-bold tabular-nums text-violet-950">
            {yearlyRate}%
            <span className="ml-1.5 text-xs font-semibold text-violet-800">({yearlyN}명)</span>
          </p>
          <p className="mt-0.5 text-[10px] text-violet-900/80">활성 멤버 기준</p>
        </div>
      </div>

      {(stats.overdueCount > 0 || stats.pendingCount > 0 || stats.failedCount > 0 || stats.unpaidCount > 0) && (
        <p className="mt-3 text-xs text-slate-500">
          상세: 연체 {stats.overdueCount} · 미결제 {stats.unpaidCount} · 진행 {stats.pendingCount} · 실패{" "}
          {stats.failedCount}
        </p>
      )}
    </div>
  );
}
