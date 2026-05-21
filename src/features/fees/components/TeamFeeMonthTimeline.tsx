import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { TeamFee } from "../types";
import { useMonthTimelineModel } from "../hooks/useMonthTimelineModel";
import { syntheticMonthKey } from "../utils/feeMonthUi";
import TimelineMonthCell from "./TimelineMonthCell";

export type TeamFeeMonthTimelineProps = {
  fees: TeamFee[];
  selectedFeeId: string | undefined;
  onSelect: (feeId: string) => void;
};

/**
 * 스크롤 종료 근사 디바운스(ms).
 * `requestAnimationFrame`만으로는 손가락 관성 종료 시점이 들쭉날쭉할 수 있어 UX 안정성 위해 고정.
 */
const SNAP_SCROLL_END_MS = 120;

/**
 * 스냅 기준(고정 정의):
 * `viewportCenter = scrollContainer.getBoundingClientRect().left + container.clientWidth / 2`
 * 각 셀: `cellCenter = cell.getBoundingClientRect().left + cell.offsetWidth 대신 width/2`
 * 가장 가까운 셀 = `|cellCenter - viewportCenter|` 최소인 인덱스.
 */
function scrollDeltaToAlignCellCenter(scrollEl: HTMLElement, cell: HTMLElement): number {
  const scRect = scrollEl.getBoundingClientRect();
  const cellRect = cell.getBoundingClientRect();
  const viewportCenter = scRect.left + scRect.width / 2;
  const cellCenter = cellRect.left + cellRect.width / 2;
  return cellCenter - viewportCenter;
}

/**
 * 회차 월 타임라인 — 스크롤은 탐색·스냅만, **탭할 때만** `onSelect`(선택 확정, 정책 A).
 * `useMonthTimelineModel` + `feeMonthUi` 월키 규칙과 동일 데이터 소스.
 */
export default function TeamFeeMonthTimeline({ fees, selectedFeeId, onSelect }: TeamFeeMonthTimelineProps) {
  const rows = useMonthTimelineModel(fees, selectedFeeId);
  const containerRef = useRef<HTMLDivElement>(null);
  const cellRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const snapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const programmaticScrollRef = useRef(false);
  /** 가시 영역 중심에 가장 가까운 셀 — 스냅/프로그램 스크롤 후 갱신 */
  const [centerIndex, setCenterIndex] = useState<number | null>(null);

  const selectedFee = selectedFeeId ? fees.find((f) => f.id === selectedFeeId) : undefined;

  const endProgrammaticScroll = useCallback((behavior: ScrollBehavior, onComplete?: () => void) => {
    if (behavior === "smooth") {
      window.setTimeout(() => {
        programmaticScrollRef.current = false;
        onComplete?.();
      }, 450);
      return;
    }
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        programmaticScrollRef.current = false;
        onComplete?.();
      });
    });
  }, []);

  const findNearestCellIndex = useCallback(() => {
    const scrollEl = containerRef.current;
    if (!scrollEl || rows.length === 0) return 0;
    const scRect = scrollEl.getBoundingClientRect();
    const viewportCenter = scRect.left + scRect.width / 2;
    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i < rows.length; i++) {
      const cell = cellRefs.current[i];
      if (!cell) continue;
      const r = cell.getBoundingClientRect();
      const cellCenter = r.left + r.width / 2;
      const d = Math.abs(cellCenter - viewportCenter);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    }
    return best;
  }, [rows.length]);

  const refreshCenterIndex = useCallback(() => {
    setCenterIndex(findNearestCellIndex());
  }, [findNearestCellIndex]);

  const applySnap = useCallback(() => {
    if (programmaticScrollRef.current) return;
    const scrollEl = containerRef.current;
    if (!scrollEl || rows.length === 0) return;
    const idx = findNearestCellIndex();
    const cell = cellRefs.current[idx];
    if (!cell) return;
    const before = scrollEl.scrollLeft;
    const delta = scrollDeltaToAlignCellCenter(scrollEl, cell);
    const target = before + delta;
    /** 스냅 목표와 현재 scrollLeft 차이 1px 미만이면 생략 */
    if (Math.abs(delta) < 1 || Math.abs(target - before) < 1) {
      refreshCenterIndex();
      return;
    }
    programmaticScrollRef.current = true;
    scrollEl.scrollBy({ left: delta, behavior: "auto" });
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        programmaticScrollRef.current = false;
        refreshCenterIndex();
      });
    });
  }, [findNearestCellIndex, refreshCenterIndex, rows.length]);

  const scrollIndexToCenter = useCallback(
    (index: number, behavior: ScrollBehavior = "auto") => {
      const scrollEl = containerRef.current;
      const cell = cellRefs.current[index];
      if (!scrollEl || !cell) return;
      if (snapTimerRef.current) {
        clearTimeout(snapTimerRef.current);
        snapTimerRef.current = null;
      }
      const delta = scrollDeltaToAlignCellCenter(scrollEl, cell);
      /** 이미 가시 중앙과 1px 이내면 스크롤 생략 — 미세 덜컥임·루프 방지 */
      if (Math.abs(delta) < 1) {
        refreshCenterIndex();
        return;
      }
      programmaticScrollRef.current = true;
      scrollEl.scrollBy({ left: delta, behavior });
      endProgrammaticScroll(behavior, refreshCenterIndex);
    },
    [endProgrammaticScroll, refreshCenterIndex]
  );

  const onScroll = useCallback(() => {
    /** 어떤 스크롤이든 대기 스냅 취소 — 프로그램 스크롤 직전 사용자 디바운스·개입 시 끌어당김 방지 */
    if (snapTimerRef.current) {
      clearTimeout(snapTimerRef.current);
      snapTimerRef.current = null;
    }
    if (programmaticScrollRef.current) return;
    snapTimerRef.current = setTimeout(() => {
      snapTimerRef.current = null;
      applySnap();
    }, SNAP_SCROLL_END_MS);
  }, [applySnap]);

  useEffect(() => {
    return () => {
      if (snapTimerRef.current) clearTimeout(snapTimerRef.current);
    };
  }, []);

  /**
   * 선택·데이터 변경 시 해당 월을 가시 영역 중앙으로.
   * 스크롤 중 `onScroll`은 `programmaticScrollRef`로 스냅 디바운스와 분리.
   */
  useLayoutEffect(() => {
    const scrollEl = containerRef.current;
    if (!scrollEl || rows.length === 0 || !selectedFeeId) return;
    const idx = rows.findIndex((r) => r.representativeFee.id === selectedFeeId);
    if (idx < 0) return;
    if (!cellRefs.current[idx]) return;
    if (snapTimerRef.current) {
      clearTimeout(snapTimerRef.current);
      snapTimerRef.current = null;
    }
    scrollIndexToCenter(idx, "auto");
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        refreshCenterIndex();
      });
    });
  }, [selectedFeeId, rows, scrollIndexToCenter, refreshCenterIndex]);

  if (rows.length === 0) return null;

  return (
    <div
      className="rounded-2xl border border-slate-200 bg-slate-50/40 p-4 shadow-sm"
      role="region"
      aria-label="회비 회차 타임라인"
    >
      <p className="text-xs font-semibold text-slate-500">회차 타임라인</p>
      <p className="mt-0.5 text-xs text-slate-500">
        좌우로 스크롤해 월을 탐색하고, <span className="font-medium text-slate-600">원하는 회차를 탭하면</span> 선택됩니다.
      </p>
      <div
        ref={containerRef}
        onScroll={onScroll}
        className="mt-3 flex flex-nowrap gap-2 overflow-x-auto px-0.5 py-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {rows.map((row, i) => {
          const selected =
            !!selectedFee && syntheticMonthKey(row.representativeFee) === syntheticMonthKey(selectedFee);
          return (
            <TimelineMonthCell
              key={row.syntheticKey}
              ref={(el) => {
                cellRefs.current[i] = el;
              }}
              row={row}
              selected={selected}
              visuallyCenter={centerIndex !== null && i === centerIndex}
              onSelect={() => onSelect(row.representativeFee.id)}
            />
          );
        })}
      </div>
    </div>
  );
}
