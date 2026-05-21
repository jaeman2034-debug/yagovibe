import { useMemo } from "react";
import type { TeamFee } from "../types";
import {
  buildFeesForPeriodPicker,
  feeMonthKeyForPicker,
  seoulYmNow,
  syntheticMonthKey,
} from "../utils/feeMonthUi";
import type { TimelineFeeStatusV1 } from "../utils/timelineFeeStatusV1";
import { inferTimelineFeeStatusV1 } from "../utils/timelineFeeStatusV1";

export type MonthTimelineRow = {
  syntheticKey: string;
  representativeFee: TeamFee;
  /** 달력 `YYYY-MM`만 미래 판단; `__nok_*` 는 false */
  isFuture: boolean;
  status: TimelineFeeStatusV1;
};

/**
 * 타임라인용 월 행 — `buildFeesForPeriodPicker` 대표만 사용(기존 dedupe·월키 규칙과 동일).
 * 가로축은 **과거→현재→미래**(시간 순)로 정렬.
 */
export function useMonthTimelineModel(fees: TeamFee[], selectedFeeId: string | undefined): MonthTimelineRow[] {
  return useMemo(() => {
    const { displayFees } = buildFeesForPeriodPicker(fees, selectedFeeId);
    const nowYm = seoulYmNow();
    const desc = displayFees.map((f) => {
      const sk = syntheticMonthKey(f);
      const ym = feeMonthKeyForPicker(f);
      const isFuture = ym ? ym > nowYm : false;
      return {
        syntheticKey: sk,
        representativeFee: f,
        isFuture,
        status: inferTimelineFeeStatusV1(f),
      } satisfies MonthTimelineRow;
    });
    return [...desc].reverse();
  }, [fees, selectedFeeId]);
}
