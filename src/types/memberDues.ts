import type { Timestamp } from "firebase/firestore";
import { firestoreLikeToDate } from "@/lib/firebase/firestoreLikeToDate";
import { teamFeeSeoulCalendarYear } from "@/lib/fees/seoulFeeMonthKey";

/** 팀원 회비 정책 유형 — `teams/{teamId}/members/{uid}.duesType` */
export type MemberDuesType = "monthly" | "yearly" | "exempt" | "discount";

export function normalizeMemberDuesType(raw: unknown): MemberDuesType {
  if (raw === "yearly" || raw === "annual") return "yearly";
  if (raw === "exempt") return "exempt";
  if (raw === "discount") return "discount";
  return "monthly";
}

/**
 * 연납(`yearlyPaidAt`)이 해당 **회비 마감 연도(서울 달력)** 와 같으면,
 * 그 해 월별 회비 청구에서는 이미 납부로 본다.
 * `feeDueYear`는 마감일에서 구한 서울 연도와 동일 규칙이어야 한다.
 */
export function yearlyDuesCoversFeeCalendarYear(
  yearlyPaidAt: Timestamp | { toDate: () => Date } | Date | null | undefined,
  feeDueYear: number
): boolean {
  const d = firestoreLikeToDate(yearlyPaidAt as unknown);
  if (!d || !Number.isFinite(feeDueYear)) return false;
  return teamFeeSeoulCalendarYear(d) === feeDueYear;
}
