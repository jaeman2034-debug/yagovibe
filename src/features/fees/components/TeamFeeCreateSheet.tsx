export type TeamFeeCreateSheetProps = {
  open: boolean;
  onToggle: () => void;
  title: string;
  amount: string;
  dueDate: string;
  autoGenerate: boolean;
  autoStartMonth: string;
  autoMonths: number;
  onTitleChange: (v: string) => void;
  onAmountChange: (v: string) => void;
  onDueDateChange: (v: string) => void;
  onAutoGenerateChange: (v: boolean) => void;
  onAutoStartMonthChange: (v: string) => void;
  onAutoMonthsChange: (v: number) => void;
  saving: boolean;
  onSubmit: () => void | Promise<void>;
};

/** 관리 기능: 접었다 펼치는 생성 폼 (모바일 터치 영역 확보) */
export default function TeamFeeCreateSheet({
  open,
  onToggle,
  title,
  amount,
  dueDate,
  autoGenerate,
  autoStartMonth,
  autoMonths,
  onTitleChange,
  onAmountChange,
  onDueDateChange,
  onAutoGenerateChange,
  onAutoStartMonthChange,
  onAutoMonthsChange,
  saving,
  onSubmit,
}: TeamFeeCreateSheetProps) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-4 shadow-sm sm:p-5">
      <button
        type="button"
        onClick={onToggle}
        className="flex min-h-[44px] w-full items-center justify-between gap-2 text-left font-semibold text-slate-900"
      >
        <span>새 회비 만들기</span>
        <span className="text-sm font-normal text-slate-500">{open ? "접기" : "펼치기"}</span>
      </button>
      {open && (
        <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={autoGenerate}
              onChange={(e) => onAutoGenerateChange(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300"
            />
            회차 자동 생성 모드
          </label>

          {autoGenerate && (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <input
                value={autoStartMonth}
                onChange={(e) => onAutoStartMonthChange(e.target.value)}
                type="month"
                className="min-h-[44px] rounded-lg border border-slate-300 px-3 text-sm"
              />
              <input
                value={autoMonths}
                onChange={(e) => onAutoMonthsChange(Number(e.target.value))}
                type="number"
                min={1}
                max={24}
                step={1}
                placeholder="개월 수"
                className="min-h-[44px] rounded-lg border border-slate-300 px-3 text-sm"
              />
              <input
                value={dueDate}
                onChange={(e) => onDueDateChange(e.target.value)}
                type="date"
                className="min-h-[44px] rounded-lg border border-slate-300 px-3 text-sm"
              />
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {!autoGenerate ? (
              <input
                value={title}
                onChange={(e) => onTitleChange(e.target.value)}
                placeholder="예: 4월 회비"
                className="min-h-[44px] rounded-lg border border-slate-300 px-3 text-sm"
              />
            ) : (
              <div className="flex min-h-[44px] items-center rounded-lg border border-dashed border-slate-300 px-3 text-xs text-slate-500">
                제목은 자동으로 `N월 회비` 형식 생성
              </div>
            )}
            <input
              value={amount}
              onChange={(e) => onAmountChange(e.target.value)}
              placeholder="금액(원) — 비우면 팀 정책 월액"
              type="number"
              min={0}
              step={1}
              className="min-h-[44px] rounded-lg border border-slate-300 px-3 text-sm"
            />
            {!autoGenerate ? (
              <input
                value={dueDate}
                onChange={(e) => onDueDateChange(e.target.value)}
                type="date"
                className="min-h-[44px] rounded-lg border border-slate-300 px-3 text-sm"
              />
            ) : (
              <div className="flex min-h-[44px] items-center rounded-lg border border-dashed border-slate-300 px-3 text-xs text-slate-500">
                마감일은 위 기준일을 월별로 자동 확장
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => void onSubmit()}
            disabled={saving}
            className="min-h-[44px] rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "생성 중…" : autoGenerate ? "회차 자동 생성" : "회비 생성"}
          </button>
        </div>
      )}
    </div>
  );
}
