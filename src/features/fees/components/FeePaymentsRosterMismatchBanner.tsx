type RosterUnmatchSummary = {
  unmatched: number;
  emptyIdentifier: number;
  notOnRoster: number;
};

type Props = {
  summary: RosterUnmatchSummary;
  canRepair: boolean;
  repairBusy?: boolean;
  onRepair?: () => void;
  onScrollToRepair?: () => void;
};

export default function FeePaymentsRosterMismatchBanner({
  summary,
  canRepair,
  repairBusy = false,
  onRepair,
  onScrollToRepair,
}: Props) {
  if (summary.unmatched <= 0) return null;

  return (
    <div
      className="rounded-xl border border-amber-400 bg-amber-50 px-4 py-3 text-sm text-amber-950 shadow-sm"
      role="status"
      data-testid="fee-roster-mismatch-banner"
    >
      <p className="font-semibold">
        활성 멤버와 연결되지 않는 납부 기록 {summary.unmatched}건
      </p>
      <p className="mt-1.5 text-xs leading-relaxed text-amber-900/95">
        제품 장애가 아니라, 과거 퇴출 멤버·옛 <code className="rounded bg-amber-100/80 px-1">memberId</code> 형식·
        시드 ID·<code className="rounded bg-amber-100/80 px-1">local_*</code> 레거시 등으로 KPI·목록에서 제외된
        payments입니다. 출석(<code className="rounded bg-amber-100/80 px-1">memberDocumentId</code>)과 회비 조인 키(
        <code className="rounded bg-amber-100/80 px-1">billingUid</code>)는 별도입니다.
      </p>
      <ul className="mt-2 list-inside list-disc text-xs text-amber-900">
        <li>식별자 없음: {summary.emptyIdentifier}건</li>
        <li>로스터에 없는 키: {summary.notOnRoster}건</li>
      </ul>
      {canRepair ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {onRepair ? (
            <button
              type="button"
              disabled={repairBusy}
              onClick={() => onRepair()}
              className="min-h-[38px] rounded-lg border border-indigo-400 bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {repairBusy ? "검토·복구 중…" : "결제 데이터 복구 (드라이런 → 적용)"}
            </button>
          ) : null}
          {onScrollToRepair ? (
            <button
              type="button"
              disabled={repairBusy}
              onClick={() => onScrollToRepair()}
              className="min-h-[38px] rounded-lg border border-amber-500 bg-white px-3 py-1.5 text-xs font-semibold text-amber-950 hover:bg-amber-100/80 disabled:opacity-50"
            >
              고급 복구 옵션 보기
            </button>
          ) : null}
        </div>
      ) : (
        <p className="mt-2 text-xs text-amber-800">총무 권한이 있는 계정으로 로그인하면 데이터 복구를 실행할 수 있습니다.</p>
      )}
    </div>
  );
}
