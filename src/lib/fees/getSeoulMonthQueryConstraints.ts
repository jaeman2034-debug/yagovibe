import { where, type QueryConstraint } from "firebase/firestore";
import { getSeoulMonthRange } from "@/lib/fees/seoulFeeMonthKey";

/**
 * 서울 월(`YYYY-MM`) 반개구간에 대응하는 Firestore `where` 2개, 또는 `ym` 오류 시 `null`.
 * `where(field, ">=", start)` · `where(field, "<", endExclusive)`
 */
export type SeoulMonthQueryConstraints = readonly [QueryConstraint, QueryConstraint] | null;

/**
 * @returns `ym`이 잘못되면 `null` — 호출부에서 분기 후 `query(..., ...constraints)`에 spread.
 */
export function getSeoulMonthQueryConstraints(
  fieldPath: string,
  ymYYYY_MM: string
): SeoulMonthQueryConstraints {
  const r = getSeoulMonthRange(ymYYYY_MM);
  if (!r) return null;
  return [where(fieldPath, ">=", r.start), where(fieldPath, "<", r.endExclusive)] as const;
}
