export type TeamFeeActionAlertProps = {
  headline: string | null;
  /** 독촉 대상 안내 한 줄 (버튼 위 맥락) */
  subline?: string | null;
  /** 독촉 대상(미납·실패·연체) 인원 — 0이면 버튼 숨김 */
  actionableCount: number;
  onBulkRemind: () => void | Promise<void>;
  /** KPI 아래 전용 리마인드 바를 쓸 때 단일 「전체 독촉」 버튼 숨김 */
  showBulkRemindButton?: boolean;
};

/** 요약 다음: 지금 할 일 + 전체 독촉 CTA */
export default function TeamFeeActionAlert({
  headline,
  subline,
  actionableCount,
  onBulkRemind,
  showBulkRemindButton = true,
}: TeamFeeActionAlertProps) {
  if (!headline) return null;

  const urgent = actionableCount > 0;

  return (
    <div
      className={`rounded-2xl border p-4 shadow-sm sm:p-5 ${
        urgent ? "border-amber-300 bg-amber-50" : "border-emerald-200 bg-emerald-50/70"
      }`}
    >
      <div className="flex flex-col gap-4">
        <div className="flex gap-3 sm:gap-4">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg font-bold ${
              urgent ? "bg-amber-200 text-amber-950" : "bg-emerald-200 text-emerald-900"
            }`}
            aria-hidden
          >
            {urgent ? "!" : "✓"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">지금 할 일</p>
            <p className="mt-1 text-sm font-bold leading-snug text-slate-900 sm:text-base">{headline}</p>
            {urgent && subline ? <p className="mt-2 text-sm text-amber-950/90">{subline}</p> : null}
          </div>
        </div>
        {showBulkRemindButton && actionableCount > 0 && (
          <button
            type="button"
            onClick={() => void onBulkRemind()}
            className="w-full touch-manipulation rounded-xl bg-slate-900 px-5 py-3.5 text-center text-sm font-bold text-white shadow-md ring-2 ring-slate-900/10 active:bg-slate-950 sm:py-4"
          >
            전체 독촉 보내기 ({actionableCount}명)
          </button>
        )}
      </div>
    </div>
  );
}
