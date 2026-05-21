/** KPI 바로 아래: 미납 리마인드 — 라인업 Detail의 이중 버튼과 같은 운영 패턴 */
export type FeeReminderActionBarProps = {
  /** 미완납 전원 (통계와 동일) */
  notPaidTotal: number;
  /** 미확인 미납 리마인드 대상 — 미결제·실패·연체(결제 미시도 또는 중단) */
  outstandingEligible: number;
  /** 확인했지만 미납 리마인드 대상 — 온라인 결제 진행 중(pending) */
  checkoutPendingEligible: number;
  busyKind: null | "outstanding" | "checkout_pending";
  onOutstandingRemind: () => void | Promise<void>;
  onCheckoutPendingRemind: () => void | Promise<void>;
};

export default function FeeReminderActionBar({
  notPaidTotal,
  outstandingEligible,
  checkoutPendingEligible,
  busyKind,
  onOutstandingRemind,
  onCheckoutPendingRemind,
}: FeeReminderActionBarProps) {
  const outstandingDisabled = outstandingEligible <= 0 || busyKind !== null;
  const pendingDisabled = checkoutPendingEligible <= 0 || busyKind !== null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">미납 알림</p>
          <p className="mt-1 text-base font-bold text-slate-900">
            미납 · 미완료 <span className="tabular-nums text-amber-700">{notPaidTotal}</span>명
          </p>
          <p className="mt-1 text-xs text-slate-500">
            라인업과 같이 두 가지로 나눠 보낼 수 있어요 — 아직 안 낸 분 / 결제 창만 연 분.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          disabled={outstandingDisabled}
          onClick={() => void onOutstandingRemind()}
          className="touch-manipulation rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-left text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-slate-200 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="block">
            미확인 미납 리마인드
            {busyKind === "outstanding" ? (
              <span className="ml-2 text-xs font-normal text-slate-500">전송 중…</span>
            ) : null}
          </span>
          <span className="mt-1 block text-xs font-normal text-slate-600">
            미결제 · 실패 · 연체 ({outstandingEligible}명)
          </span>
        </button>

        <button
          type="button"
          disabled={pendingDisabled}
          onClick={() => void onCheckoutPendingRemind()}
          className="touch-manipulation rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-left text-sm font-semibold text-indigo-950 shadow-sm ring-1 ring-indigo-100 transition-colors hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="block">
            확인했지만 미납 리마인드
            {busyKind === "checkout_pending" ? (
              <span className="ml-2 text-xs font-normal text-indigo-700">전송 중…</span>
            ) : null}
          </span>
          <span className="mt-1 block text-xs font-normal text-indigo-900/90">
            결제 진행 중 — 완료 유도 ({checkoutPendingEligible}명)
          </span>
        </button>
      </div>
    </div>
  );
}
