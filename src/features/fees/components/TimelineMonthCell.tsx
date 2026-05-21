import { forwardRef } from "react";
import type { MonthTimelineRow } from "../hooks/useMonthTimelineModel";
import { feeMonthKeyForPicker, formatFeeChipLabel } from "../utils/feeMonthUi";
import FeePaymentStatusBadge from "./FeePaymentStatusBadge";

export type TimelineMonthCellProps = {
  row: MonthTimelineRow;
  selected: boolean;
  /** 가시 스크롤 영역 중심에 가장 가까운 셀 — 위치 인지용(선택과 별개) */
  visuallyCenter?: boolean;
  onSelect: () => void;
};

function compactChipLabel(row: MonthTimelineRow): string {
  const fee = row.representativeFee;
  const mk = feeMonthKeyForPicker(fee) ?? row.syntheticKey;
  return formatFeeChipLabel(fee, mk);
}

/**
 * 스냅 기준점: `getBoundingClientRect`로 **셀 중심**과 스크롤 컨테이너 **가시 중심** 거리 비교에 사용.
 * (부모가 `ref`로 버튼 DOM을 수집)
 */
const TimelineMonthCell = forwardRef<HTMLButtonElement, TimelineMonthCellProps>(function TimelineMonthCell(
  { row, selected, visuallyCenter = false, onSelect },
  ref
) {
  const dim = row.isFuture && !selected;
  const centerBoost =
    visuallyCenter && !selected
      ? "relative z-10 scale-[1.04] shadow-md ring-2 ring-slate-400/70"
      : visuallyCenter && selected
        ? "relative z-10 scale-[1.02]"
        : "";
  return (
    <button
      ref={ref}
      type="button"
      onClick={onSelect}
      className={`group flex min-w-[7.5rem] max-w-[9.5rem] shrink-0 origin-center flex-col gap-1 rounded-2xl border px-2.5 py-2 text-left transition-[opacity,transform,border-color,background-color,box-shadow,ring-color] duration-150 ease-out ${
        selected
          ? "border-slate-900 bg-slate-900 text-white shadow-md ring-2 ring-slate-900/20"
          : "border-slate-200 bg-white text-slate-800 hover:border-slate-300"
      } ${centerBoost} ${dim ? "opacity-55 hover:opacity-90 active:opacity-100" : ""}`}
    >
      <span className={`line-clamp-2 text-[11px] font-semibold leading-tight ${selected ? "text-white" : ""}`}>
        {compactChipLabel(row)}
      </span>
      <FeePaymentStatusBadge status={row.status} tone={selected ? "inverse" : "surface"} />
    </button>
  );
});

export default TimelineMonthCell;
