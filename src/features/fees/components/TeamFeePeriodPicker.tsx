import { useEffect, useMemo, useState } from "react";
import type { TeamFee } from "../types";
import {
  anchorYmFromFeeId,
  buildFeesForPeriodPicker,
  capFeeAssistChipList,
  ensureSelectedFeeInChipList,
  FEE_CHIP_ASSIST_MAX,
  feeMonthKeyForPicker,
  filterPickerFeesByScope,
  formatFeeChipLabel,
  seoulYmNow,
  syntheticMonthKey,
} from "../utils/feeMonthUi";

export type TeamFeePeriodPickerProps = {
  fees: TeamFee[];
  selectedFeeId: string | undefined;
  onSelect: (feeId: string) => void;
};

/** 회비 회차/기간 선택 — 모바일에서 줄바꿈 허용 */
export default function TeamFeePeriodPicker({ fees, selectedFeeId, onSelect }: TeamFeePeriodPickerProps) {
  const [showAllPeriods, setShowAllPeriods] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const anchorYm = useMemo(() => anchorYmFromFeeId(fees, selectedFeeId), [fees, selectedFeeId]);

  const built = useMemo(() => buildFeesForPeriodPicker(fees, selectedFeeId), [fees, selectedFeeId]);

  const collapsedScoped = useMemo(
    () =>
      filterPickerFeesByScope(built.displayFees, built.monthKeysOrdered, {
        expand: false,
        anchorYm,
        nowYm: seoulYmNow(),
      }).visibleFees,
    [built.displayFees, built.monthKeysOrdered, anchorYm]
  );

  const scopedVisible = useMemo(
    () =>
      filterPickerFeesByScope(built.displayFees, built.monthKeysOrdered, {
        expand: showAllPeriods,
        anchorYm,
        nowYm: seoulYmNow(),
      }).visibleFees,
    [built.displayFees, built.monthKeysOrdered, showAllPeriods, anchorYm]
  );

  /** 접힘: 스코프 안에서도 보조 칩은 최대 `FEE_CHIP_ASSIST_MAX`건 — 전체 보기에서만 해제 */
  const assistScoped = useMemo(
    () => (showAllPeriods ? scopedVisible : capFeeAssistChipList(scopedVisible)),
    [scopedVisible, showAllPeriods]
  );

  const visibleFees = useMemo(
    () => ensureSelectedFeeInChipList(assistScoped, selectedFeeId, fees, built.displayFees),
    [assistScoped, selectedFeeId, fees, built.displayFees]
  );

  const selectedFeeForHighlight = useMemo(
    () => (selectedFeeId ? fees.find((f) => f.id === selectedFeeId) : undefined),
    [fees, selectedFeeId]
  );

  useEffect(() => {
    if (import.meta.env.DEV && selectedFeeId && !selectedFeeForHighlight) {
      console.debug("[FeePicker] selected fee not found, fallback applied", { selectedFeeId });
    }
  }, [selectedFeeId, selectedFeeForHighlight]);

  const scopeHidden = Math.max(0, built.displayFees.length - collapsedScoped.length);
  const capHidden = showAllPeriods ? 0 : Math.max(0, collapsedScoped.length - FEE_CHIP_ASSIST_MAX);
  const hiddenCount = scopeHidden + capHidden;
  const showExpandToggle = hiddenCount > 0 || showAllPeriods;

  if (fees.length === 0) return null;
  if (visibleFees.length === 0) return null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/40 p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-slate-500">다른 회비 회차</p>
        <button
          type="button"
          onClick={() => setCollapsed((prev) => !prev)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          aria-expanded={!collapsed}
          aria-label={collapsed ? "다른 회비 회차 펼치기" : "다른 회비 회차 접기"}
        >
          {collapsed ? "목록 펼치기" : "목록 접기"}
        </button>
      </div>
      <p className="mt-0.5 text-xs text-slate-500">
        납부 현황을 본 뒤, 조회할 회비만 바꿀 때 사용하세요. 같은 달이라도 연도가 다르면 구분됩니다.
      </p>
      {!collapsed && <div className="mt-2 flex flex-wrap gap-2">
        {visibleFees.map((fee) => {
          const active = selectedFeeForHighlight
            ? syntheticMonthKey(fee) === syntheticMonthKey(selectedFeeForHighlight)
            : fee.id === visibleFees[0]?.id;
          const mk = feeMonthKeyForPicker(fee) ?? `__nok_${fee.id}`;
          const label = formatFeeChipLabel(fee, mk);
          return (
            <button
              key={fee.id}
              type="button"
              onClick={() => onSelect(fee.id)}
              className={`min-h-[44px] rounded-xl border px-3 py-2.5 text-left text-sm transition ${
                active
                  ? "border-slate-900 bg-slate-900 text-white shadow-md"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
              }`}
            >
              <span className="font-semibold">{label}</span>
            </button>
          );
        })}
      </div>}
      {!collapsed && showExpandToggle ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowAllPeriods((v) => !v)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            {showAllPeriods ? "요약 범위만 보기" : `전체 회차 보기${hiddenCount > 0 ? ` (${hiddenCount}개 더 있음)` : ""}`}
          </button>
        </div>
      ) : null}
    </div>
  );
}
