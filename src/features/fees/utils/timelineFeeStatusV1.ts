import type { TeamFee } from "../types";

/** 타임라인 V1 — `partial` 없음(집계 연동 전 단순 휴리스틱) */
export type TimelineFeeStatusV1 = "paid" | "unpaid" | "overdue";

/**
 * 회차별 납부 요약 없이도 칩/타임라인에 쓸 수 있는 최소 휴리스틱.
 * 정밀 집계는 이후 `payments` 기반으로 교체 가능.
 */
export function inferTimelineFeeStatusV1(fee: TeamFee): TimelineFeeStatusV1 {
  if (fee.status === "closed") return "paid";
  if ((fee.overdueMemberCount ?? 0) > 0) return "overdue";
  return "unpaid";
}
