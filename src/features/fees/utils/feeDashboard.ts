import type { Timestamp } from "firebase/firestore";
import type {
  FeeDashboardStats,
  FeeMemberRow,
  FeePayment,
  TeamFee,
  TeamMember,
} from "../types";
import { firestoreLikeToDate } from "@/lib/firebase/firestoreLikeToDate";
import { teamFeeSeoulMonthKey } from "@/lib/fees/seoulFeeMonthKey";
import { seoulDayEndMillisForDueInstant } from "./seoulFeeDue";
import { type MemberDuesType } from "@/types/memberDues";
import { isAnnualPrepaidPaymentSource } from "@/lib/fees/annualPrepaidSource";
import { parsePaymentDocUserIdWithKnownFeeId, parseTeamFeePaymentDocId } from "@/lib/fees/teamFeePaymentDocId";
import { expandPaymentPersonKeysForRosterMatch, memberBillingLookupKeys } from "@/lib/team/memberBillingUid";

/** 알려진 `feeId`가 있으면 문서 ID에서 userId 복원 (`local_*` 내 `_` 대응) */
function paymentDocUidSuffixForJoin(payment: FeePayment): string | undefined {
  const fid = String(payment.feeId ?? "").trim();
  if (fid) {
    const u = parsePaymentDocUserIdWithKnownFeeId(payment.id, fid)?.trim();
    if (u) return u;
  }
  return parseTeamFeePaymentDocId(payment.id)?.userId?.trim();
}

/** 필드(`memberId`) 또는 문서 ID 접미 — `local_*` 게스트 ID 레거시 혼재 포함 */
function paymentBelongsToRoster(payment: FeePayment, rosterPaymentKeys: Set<string>): boolean {
  const mid = resolveFeePaymentMemberId(payment);
  if (mid) {
    for (const k of expandPaymentPersonKeysForRosterMatch(mid)) {
      if (rosterPaymentKeys.has(k)) return true;
    }
  }
  const docUid = paymentDocUidSuffixForJoin(payment);
  if (docUid) {
    for (const k of expandPaymentPersonKeysForRosterMatch(docUid)) {
      if (rosterPaymentKeys.has(k)) return true;
    }
  }
  return false;
}

/** 로스터에 속하는 이 납부 문서의 모든 조회 별칭 (맵에 다 넣어 조인 실패 방지) */
function rosterAliasKeysForPayment(payment: FeePayment, rosterPaymentKeys: Set<string>): Set<string> {
  const keys = new Set<string>();
  const mid = resolveFeePaymentMemberId(payment);
  if (mid) {
    for (const k of expandPaymentPersonKeysForRosterMatch(mid)) {
      if (rosterPaymentKeys.has(k)) keys.add(k);
    }
  }
  const docUid = paymentDocUidSuffixForJoin(payment);
  if (docUid) {
    for (const k of expandPaymentPersonKeysForRosterMatch(docUid)) {
      if (rosterPaymentKeys.has(k)) keys.add(k);
    }
  }
  return keys;
}

/** 연납 분해(할인 포함) 표시·KPI용 필드 — 레거시 문서는 `allocatedFromAmount`만 있음 */
function annualPrepaidRowExtras(payment: FeePayment | undefined): Partial<FeeMemberRow> {
  if (!payment || !isAnnualPrepaidPaymentSource(payment.sourceType)) return {};
  const finalAmt = Math.max(0, Math.floor(Number(payment.finalAmount ?? payment.allocatedFromAmount ?? 0)));
  if (finalAmt <= 0) return {};
  const disc = payment.discountApplied === true;
  const rawOrig = Math.floor(Number(payment.originalAmount ?? payment.allocatedFromAmount ?? finalAmt));
  const orig = disc ? Math.max(finalAmt, rawOrig) : finalAmt;
  return {
    originalAmount: orig,
    annualPrepaidFinalAmount: finalAmt,
    discountMonths: Math.max(0, Math.floor(Number(payment.discountMonths ?? 0))),
    discountApplied: disc,
  };
}

/** KPI·멤버 행 조인용 — Firestore `memberId`/`userId`가 클라에서 `memberId`·`uid`로 정규화됨 */
export function resolveFeePaymentMemberId(p: FeePayment): string {
  return String(p.memberId ?? p.uid ?? "").trim();
}

/**
 * 활성 멤버 UID에 매칭되는 납부 문서만 유지.
 * `members`가 아직 비어 있으면(로딩 직후) 원본을 그대로 반환해 과도한 경고·깜빡임을 줄임.
 */
/** 면제 멤버 청구는 행(`buildFeeMemberRows`)과 동일하게 KPI에서 제외 — 레거시 unpaid 문서가 남아 미납 합계만 부풀 수 있음 */
function exemptMemberBillingKeySet(members: TeamMember[]): Set<string> {
  const s = new Set<string>();
  for (const m of members) {
    if ((m.duesType ?? "monthly") !== "exempt") continue;
    for (const k of memberBillingLookupKeys(m)) {
      s.add(k);
      for (const e of expandPaymentPersonKeysForRosterMatch(k)) s.add(e);
    }
  }
  return s;
}

function paymentTouchesExemptBillingKeys(p: FeePayment, exemptKeys: Set<string>): boolean {
  const mid = resolveFeePaymentMemberId(p);
  if (mid) {
    for (const k of expandPaymentPersonKeysForRosterMatch(mid)) {
      if (exemptKeys.has(k)) return true;
    }
  }
  const docUid = paymentDocUidSuffixForJoin(p);
  if (docUid) {
    for (const k of expandPaymentPersonKeysForRosterMatch(docUid)) {
      if (exemptKeys.has(k)) return true;
    }
  }
  return false;
}

export function filterFeePaymentsForActiveMembers(
  payments: FeePayment[],
  members: TeamMember[]
): FeePayment[] {
  if (!members.length) return payments;
  const memberKeys = new Set<string>();
  for (const m of members) {
    for (const k of memberBillingLookupKeys(m)) memberKeys.add(k);
  }
  return payments.filter((p) => {
    if (!paymentBelongsToRoster(p, memberKeys)) {
      const mid = resolveFeePaymentMemberId(p);
      const docUid = paymentDocUidSuffixForJoin(p);
      if (!mid && !docUid) {
        console.warn("[feeDashboard] Invalid payment — no memberId field and unparseable doc id", p.id);
        return false;
      }
      console.warn("[feeDashboard] Payment memberId/doc uid not in active members", {
        paymentId: p.id,
        memberIdField: mid || null,
        docIdUser: docUid || null,
      });
      return false;
    }
    return true;
  });
}

/**
 * 이번 회차 `payments` 중 활성 멤버 로스터와 조인되지 않는 건 — KPI 누락·카드 정상 패턴 진단용.
 * `filterFeePaymentsForActiveMembers`와 동일한 roster 키 집합을 사용한다.
 */
export function summarizePaymentsUnmatchedToActiveRoster(
  payments: FeePayment[],
  members: TeamMember[]
): { unmatched: number; emptyIdentifier: number; notOnRoster: number } {
  if (!payments.length) {
    return { unmatched: 0, emptyIdentifier: 0, notOnRoster: 0 };
  }
  const memberKeys = new Set<string>();
  for (const m of members) {
    for (const k of memberBillingLookupKeys(m)) memberKeys.add(k);
  }
  let emptyIdentifier = 0;
  let notOnRoster = 0;
  for (const p of payments) {
    if (paymentBelongsToRoster(p, memberKeys)) continue;
    const mid = resolveFeePaymentMemberId(p);
    const docUid = paymentDocUidSuffixForJoin(p);
    if (!String(mid || "").trim() && !String(docUid || "").trim()) {
      emptyIdentifier += 1;
    } else {
      notOnRoster += 1;
    }
  }
  return { unmatched: emptyIdentifier + notOnRoster, emptyIdentifier, notOnRoster };
}

/**
 * status=paid 인데 `paidAt`의 서울 달력 월이 회차 `dueDate` 월과 다른 건 — 지연 납부·타임존 이슈 진단용.
 */
export function summarizePaidAtVersusDueMonthMismatch(
  feesDueInMonth: TeamFee[],
  paymentsByFeeId: Readonly<Record<string, FeePayment[]>>
): { mismatchCount: number; paidWithoutPaidAt: number } {
  let mismatchCount = 0;
  let paidWithoutPaidAt = 0;
  for (const fee of feesDueInMonth) {
    const dueDt = firestoreLikeToDate(fee.dueDate as unknown);
    if (!dueDt || Number.isNaN(dueDt.getTime())) continue;
    const dueYm = teamFeeSeoulMonthKey(dueDt);
    const pays = paymentsByFeeId[fee.id] ?? [];
    for (const p of pays) {
      if (p.status !== "paid") continue;
      const paidDt = firestoreLikeToDate(p.paidAt as unknown);
      if (!paidDt || Number.isNaN(paidDt.getTime())) {
        paidWithoutPaidAt += 1;
        continue;
      }
      if (teamFeeSeoulMonthKey(paidDt) !== dueYm) mismatchCount += 1;
    }
  }
  return { mismatchCount, paidWithoutPaidAt };
}

/**
 * 회비 KPI·멤버 납부 목록용 멤버만 남김.
 * - Firebase `userId`/`uid`가 있으면(**linkedAuthUid**) 이름이 비어 있어도 포함 — 납부 `payments`와 조인 가능.
 * - 비연결(로컬 문서 등)은 표시명이 비었거나 `이름없음`·`(이름 미등록)`이면 제외(유령 스텁).
 */
export function filterMembersForFeeKpi(members: TeamMember[]): TeamMember[] {
  return members.filter((m) => {
    const hasAuth = Boolean(String(m.linkedAuthUid ?? "").trim());
    const nm = String(m.name ?? "").trim();
    const placeholder = !nm || nm === "이름없음" || nm === "(이름 미등록)";
    if (hasAuth) return true;
    if (placeholder) return false;
    return true;
  });
}

function feeDueDateFromField(value: Timestamp | Date | string | undefined | null): Date | null {
  return firestoreLikeToDate(value as unknown);
}

/** 동일 멤버·동일 회차에 문서가 둘 이상일 때(레거시/경합) 더 신뢰할 행을 남김 */
function feePaymentRowPriority(p: FeePayment): number {
  const paid = p.status === "paid" ? 100 : 0;
  const annual = isAnnualPrepaidPaymentSource(p.sourceType) ? 10 : 0;
  return paid + annual;
}

/** billingUid·문서 ID·linkedAuthUid 중 하나라도 paymentMap 키와 맞으면 조인 (키 전환·local_ 레거시 대응) */
function pickPaymentForMember(member: TeamMember, paymentMap: Map<string, FeePayment>): FeePayment | undefined {
  const candidates: FeePayment[] = [];
  const seen = new Set<string>();
  for (const k of memberBillingLookupKeys(member)) {
    for (const alias of expandPaymentPersonKeysForRosterMatch(k)) {
      const p = paymentMap.get(alias);
      if (p && !seen.has(p.id)) {
        seen.add(p.id);
        candidates.push(p);
      }
    }
  }
  if (candidates.length === 0) return undefined;
  if (candidates.length === 1) return candidates[0];
  return candidates.reduce((best, p) => (feePaymentRowPriority(p) > feePaymentRowPriority(best) ? p : best));
}

/** 서울 기준 마감일 종료 이후부터 연체 일수 (당일·이전은 0) */
export function getOverdueDays(dueDate: Date | null, now: Date): number {
  if (!dueDate) return 0;
  const endMs = seoulDayEndMillisForDueInstant(dueDate.getTime());
  if (now.getTime() <= endMs) return 0;
  const diff = now.getTime() - endMs;
  return Math.max(1, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

function resolvePaymentDisplay(
  payment: FeePayment | undefined,
  feeAmount: number,
  overdueDays: number
): Pick<FeeMemberRow, "paymentStatus" | "amount" | "paidAt" | "failCode" | "failReason" | "overdueDays"> {
  if (!payment) {
    return {
      paymentStatus: overdueDays > 0 ? "overdue" : "unpaid",
      amount: feeAmount,
      overdueDays: overdueDays > 0 ? overdueDays : undefined,
    };
  }

  const fin = (n: unknown) => Math.max(0, Math.floor(Number(n) || 0));

  const hasExplicitSplit =
    payment.status === "partial" ||
    (typeof payment.amountDue === "number" && Number.isFinite(payment.amountDue)) ||
    (typeof payment.amountPaid === "number" && Number.isFinite(payment.amountPaid));

  if (hasExplicitSplit) {
    const due =
      typeof payment.amountDue === "number" && Number.isFinite(payment.amountDue)
        ? fin(payment.amountDue)
        : fin(feeAmount);
    let paidSoFar =
      typeof payment.amountPaid === "number" && Number.isFinite(payment.amountPaid)
        ? fin(payment.amountPaid)
        : 0;

    if (payment.status === "paid") {
      if (paidSoFar <= 0) {
        paidSoFar = fin(payment.amount);
      }
      if (paidSoFar <= 0) {
        paidSoFar = due;
      }
      return {
        paymentStatus: "paid",
        amount: paidSoFar,
        paidAt: payment.paidAt,
      };
    }

    const remaining = Math.max(due - paidSoFar, 0);
    const pastDue = overdueDays > 0;

    if (payment.status === "pending" || payment.status === "partial") {
      if (pastDue) {
        return {
          paymentStatus: "overdue",
          amount: remaining,
          overdueDays,
        };
      }
      return {
        paymentStatus: "pending",
        amount: remaining,
      };
    }

    if (payment.status === "failed") {
      if (pastDue) {
        return {
          paymentStatus: "overdue",
          amount: remaining,
          failCode: payment.failCode,
          failReason: payment.failReason,
          overdueDays,
        };
      }
      return {
        paymentStatus: "failed",
        amount: remaining,
        failCode: payment.failCode,
        failReason: payment.failReason,
      };
    }

    if (payment.status === "cancelled") {
      return pastDue
        ? {
            paymentStatus: "overdue",
            amount: remaining,
            overdueDays,
          }
        : {
            paymentStatus: "unpaid",
            amount: remaining,
          };
    }

    return {
      paymentStatus: pastDue ? "overdue" : "unpaid",
      amount: remaining,
      overdueDays: pastDue ? overdueDays : undefined,
    };
  }

  if (payment.status === "paid") {
    return {
      paymentStatus: "paid",
      amount: payment.amount || feeAmount,
      paidAt: payment.paidAt,
    };
  }

  const pastDue = overdueDays > 0;

  if (payment.status === "pending") {
    if (pastDue) {
      return {
        paymentStatus: "overdue",
        amount: payment.amount || feeAmount,
        overdueDays,
      };
    }
    return {
      paymentStatus: "pending",
      amount: payment.amount || feeAmount,
    };
  }

  if (payment.status === "failed") {
    if (pastDue) {
      return {
        paymentStatus: "overdue",
        amount: payment.amount || feeAmount,
        failCode: payment.failCode,
        failReason: payment.failReason,
        overdueDays,
      };
    }
    return {
      paymentStatus: "failed",
      amount: payment.amount || feeAmount,
      failCode: payment.failCode,
      failReason: payment.failReason,
    };
  }

  if (payment.status === "cancelled") {
    return pastDue
      ? {
          paymentStatus: "overdue",
          amount: payment.amount || feeAmount,
          overdueDays,
        }
      : {
          paymentStatus: "unpaid",
          amount: payment.amount || feeAmount,
        };
  }

  return {
    paymentStatus: pastDue ? "overdue" : "unpaid",
    amount: payment.amount || feeAmount,
    overdueDays: pastDue ? overdueDays : undefined,
  };
}

function duesLabelFor(duesType: MemberDuesType): string {
  if (duesType === "yearly") return "연납";
  if (duesType === "exempt") return "면제";
  if (duesType === "discount") return "준회원";
  return "월납";
}

/** payments 분리 필드·부분납부 메타 → 멤버 행 (카드 UI 잔액·청크 표시용) */
export function feeLedgerSplitFields(
  payment: FeePayment | undefined,
  feeLineAmount: number
): Partial<FeeMemberRow> {
  if (!payment) return {};
  const base: Partial<FeeMemberRow> = { paymentDocStatus: payment.status };
  const hasSplit =
    payment.status === "partial" ||
    (typeof payment.amountPaid === "number" &&
      Number.isFinite(payment.amountPaid) &&
      payment.amountPaid > 0) ||
    (typeof payment.amountDue === "number" && Number.isFinite(payment.amountDue));
  if (!hasSplit) return base;
  const due =
    typeof payment.amountDue === "number" && Number.isFinite(payment.amountDue)
      ? Math.max(0, Math.floor(payment.amountDue))
      : Math.max(0, Math.floor(feeLineAmount));
  let paid =
    typeof payment.amountPaid === "number" && Number.isFinite(payment.amountPaid)
      ? Math.max(0, Math.floor(payment.amountPaid))
      : 0;
  if (payment.status === "paid" && paid <= 0) {
    paid = due;
  }
  return {
    ...base,
    feeAmountDueWon: due,
    feeAmountPaidWon: paid,
    lastPaymentChunkAt: payment.lastPaymentChunkAt,
    lastPaymentChunkAmount:
      typeof payment.lastPaymentChunkAmount === "number" && Number.isFinite(payment.lastPaymentChunkAmount)
        ? Math.floor(payment.lastPaymentChunkAmount)
        : undefined,
  };
}

export function buildFeeMemberRows(
  members: TeamMember[],
  payments: FeePayment[],
  feeAmount: number,
  dueDate?: Timestamp | Date | string | null,
  /** 문서 ID 파싱 시 필수 — `local_*` 멤버 ID의 `_` 때문에 last `_` 분리가 깨지는 경우 방지 */
  feeIdHint?: string
): FeeMemberRow[] {
  const fidHint = String(feeIdHint ?? "").trim();
  /** 쿼리·화면 회차와 필드 불일치 시에도 문서 ID `{feeId}_{userId}` 파싱이 망가지지 않게 힌트로 통일 */
  const paymentsForJoin =
    fidHint.length > 0 ? payments.map((p) => ({ ...p, feeId: fidHint })) : payments;

  const roster = filterMembersForFeeKpi(members);
  /** payments.memberId가 billingUid(연결 후 Auth UID) 또는 members 문서 ID 등 여러 키로 저장될 수 있음 */
  const rosterPaymentKeys = new Set<string>();
  for (const m of roster) {
    for (const k of memberBillingLookupKeys(m)) rosterPaymentKeys.add(k);
  }

  const scopedPayments = filterFeePaymentsForActiveMembers(paymentsForJoin, roster);
  const paymentMap = new Map<string, FeePayment>();
  for (const payment of scopedPayments) {
    const mapKeys = rosterAliasKeysForPayment(payment, rosterPaymentKeys);
    if (mapKeys.size === 0) {
      const mid = resolveFeePaymentMemberId(payment);
      const docUid = paymentDocUidSuffixForJoin(payment);
      console.warn("[feeDashboard] Invalid payment mapping — no roster key (field vs doc id)", {
        paymentId: payment.id,
        memberIdField: mid || null,
        docIdUser: docUid || null,
      });
      continue;
    }
    for (const mapKey of mapKeys) {
      const existing = paymentMap.get(mapKey);
      if (existing && existing.id !== payment.id) {
        if (feePaymentRowPriority(payment) <= feePaymentRowPriority(existing)) {
          console.warn("[feeDashboard] Duplicate payment for same member — keeping higher-priority row", {
            mapKey,
            keptPaymentId: existing.id,
            ignoredPaymentId: payment.id,
          });
          continue;
        }
        console.warn("[feeDashboard] Duplicate payment for same member — replacing with higher-priority row", {
          mapKey,
          replacedPaymentId: existing.id,
          keptPaymentId: payment.id,
        });
      }
      paymentMap.set(mapKey, payment);
    }
  }

  const now = new Date();
  const due = feeDueDateFromField(dueDate ?? undefined);
  const overdueDaysBase = getOverdueDays(due, now);

  const cleanDisplayName = (s: string) => {
    const t = String(s || "").trim();
    if (!t || t === "이름없음" || t === "(이름 미등록)") return "";
    return t;
  };

  const out: FeeMemberRow[] = [];
  for (const member of roster) {
    /** `teams/.../payments` 조인 키 — 시드·문서 ID 규칙과 동일하게 `member.uid` 사용 */
    const memberId = String(member.uid ?? "").trim();
    if (!memberId) continue;

    const duesType: MemberDuesType = member.duesType ?? "monthly";
    /** payments 조인 키가 문서 ID 또는 Auth UID로 저장된 레거시 혼재 */
    const payment = pickPaymentForMember(member, paymentMap);
    const memberName = String(member.name || "").trim();
    const paymentMemberName = String(payment?.memberName || "").trim();
    const hasLinkedAuth = Boolean(String(member.linkedAuthUid ?? "").trim());
    const displayName =
      cleanDisplayName(memberName) || cleanDisplayName(paymentMemberName) || (hasLinkedAuth ? "팀원" : "");
    if (!displayName) continue;

    if (duesType === "exempt") {
      out.push({
        uid: member.uid,
        memberId,
        name: displayName,
        role: member.role,
        duesType,
        yearlyPaidAt: member.yearlyPaidAt,
        duesLabel: duesLabelFor(duesType),
        isBillingActionable: false,
        billingNote: "회비 면제",
        paymentStatus: "paid",
        amount: 0,
        settledManually: false,
        paidAt: undefined,
        paymentSource: undefined,
        chargeAttemptCount: undefined,
        nextRetryAt: undefined,
        retryExhausted: false,
      });
      continue;
    }

    if (duesType === "yearly") {
      const annualCancelled =
        payment?.status === "cancelled" && isAnnualPrepaidPaymentSource(payment?.sourceType);
      const hasAnnualPrepaidPayment =
        payment?.status === "paid" &&
        isAnnualPrepaidPaymentSource(payment?.sourceType) &&
        typeof payment.allocatedFromAmount === "number" &&
        Number.isFinite(payment.allocatedFromAmount) &&
        payment.allocatedFromAmount > 0;
      if (hasAnnualPrepaidPayment) {
        const resolved = resolvePaymentDisplay(payment, feeAmount, overdueDaysBase);
        out.push({
          uid: member.uid,
          memberId,
          name: displayName,
          role: member.role,
          duesType,
          yearlyPaidAt: member.yearlyPaidAt,
          duesLabel: duesLabelFor(duesType),
          isBillingActionable: false,
          billingNote: "연납 결제 분해 반영",
          ...resolved,
          ...annualPrepaidRowExtras(payment),
          sourceType: payment?.sourceType,
          sourceBulkPaymentId: payment?.sourceBulkPaymentId,
          settledManually: payment?.source === "manual",
          paymentSource: payment?.source,
          chargeAttemptCount: undefined,
          nextRetryAt: undefined,
          retryExhausted: false,
        });
        continue;
      }

      if (annualCancelled) {
        out.push({
          uid: member.uid,
          memberId,
          name: displayName,
          role: member.role,
          duesType,
          yearlyPaidAt: member.yearlyPaidAt,
          duesLabel: duesLabelFor(duesType),
          isBillingActionable: false,
          billingNote: "연납 취소됨",
          paymentStatus: "unpaid",
          amount: feeAmount,
          settledManually: false,
          paymentSource: undefined,
          chargeAttemptCount: undefined,
          nextRetryAt: undefined,
          retryExhausted: false,
        });
        continue;
      }

      /**
       * 연납 멤버라도 회차별 `payments` 문서는 월납과 동일하게 존재할 수 있음(토스 단건·수동 완납·부분납부).
       * 기존에는 bulk 연납만 완납으로 인정해 `pending`이 「미납 + 연납 등록 전」으로 오표시되던 문제가 있었음.
       */
      if (payment) {
        const resolved = resolvePaymentDisplay(payment, feeAmount, overdueDaysBase);
        const billingNoteMixed =
          resolved.paymentStatus === "pending"
            ? "온라인 결제가 진행 중입니다. 완료되면 자동으로 반영됩니다."
            : resolved.paymentStatus === "paid" && !isAnnualPrepaidPaymentSource(payment.sourceType)
              ? "이 회차 단건 완납입니다. 연납 일괄는 「연납 처리」로 별도 등록합니다."
              : undefined;
        out.push({
          uid: member.uid,
          memberId,
          name: displayName,
          role: member.role,
          duesType,
          yearlyPaidAt: member.yearlyPaidAt,
          duesLabel: duesLabelFor(duesType),
          isBillingActionable: true,
          ...resolved,
          ...feeLedgerSplitFields(payment, feeAmount),
          billingNote: billingNoteMixed,
          ...(isAnnualPrepaidPaymentSource(payment.sourceType)
            ? annualPrepaidRowExtras(payment)
            : typeof payment.allocatedFromAmount === "number" && Number.isFinite(payment.allocatedFromAmount)
              ? {
                  originalAmount: Math.floor(payment.allocatedFromAmount),
                }
              : {}),
          sourceType: payment.sourceType,
          sourceBulkPaymentId: payment.sourceBulkPaymentId,
          settledManually: payment.status === "paid" && payment.source === "manual",
          paymentSource:
            payment.source === "manual" || payment.source === "autopay" ? payment.source : undefined,
          chargeAttemptCount:
            typeof payment.chargeAttemptCount === "number" && Number.isFinite(payment.chargeAttemptCount)
              ? payment.chargeAttemptCount
              : undefined,
          nextRetryAt: payment.nextRetryAt ?? undefined,
          retryExhausted: payment.retryExhausted === true,
        });
        continue;
      }

      out.push({
        uid: member.uid,
        memberId,
        name: displayName,
        role: member.role,
        duesType,
        yearlyPaidAt: member.yearlyPaidAt,
        duesLabel: duesLabelFor(duesType),
        isBillingActionable: false,
        billingNote: "연납 등록 전(납부일 미입력)",
        paymentStatus: "unpaid",
        amount: feeAmount,
        settledManually: false,
        paymentSource: undefined,
        chargeAttemptCount: undefined,
        nextRetryAt: undefined,
        retryExhausted: false,
      });
      continue;
    }

    const discountAmount =
      duesType === "discount" &&
      typeof member.discountAmount === "number" &&
      Number.isFinite(member.discountAmount) &&
      member.discountAmount > 0
        ? Math.floor(member.discountAmount)
        : null;
    const effectiveFeeAmount = discountAmount ?? feeAmount;
    const resolved = resolvePaymentDisplay(payment, effectiveFeeAmount, overdueDaysBase);

    out.push({
      uid: member.uid,
      memberId,
      name: displayName,
      role: member.role,
      duesType,
      duesLabel: duesLabelFor(duesType),
      isBillingActionable: true,
      ...resolved,
      ...feeLedgerSplitFields(payment, effectiveFeeAmount),
      yearlyPaidAt: member.yearlyPaidAt,
      billingNote:
        duesType === "discount"
          ? `준회원${member.discountLabel ? ` · ${member.discountLabel}` : ""}${
              discountAmount != null ? ` · ${discountAmount.toLocaleString("ko-KR")}원` : ""
            }`
          : undefined,
      ...(isAnnualPrepaidPaymentSource(payment?.sourceType)
        ? annualPrepaidRowExtras(payment)
        : typeof payment?.allocatedFromAmount === "number" && Number.isFinite(payment.allocatedFromAmount)
          ? {
              originalAmount: Math.floor(payment.allocatedFromAmount),
            }
          : {}),
      sourceType: payment?.sourceType,
      sourceBulkPaymentId: payment?.sourceBulkPaymentId,
      settledManually: payment?.status === "paid" && payment?.source === "manual",
      paymentSource: payment?.source,
      chargeAttemptCount:
        typeof payment?.chargeAttemptCount === "number" && Number.isFinite(payment.chargeAttemptCount)
          ? payment.chargeAttemptCount
          : undefined,
      nextRetryAt: payment?.nextRetryAt ?? undefined,
      retryExhausted: payment?.retryExhausted === true,
    });
  }
  return out;
}

/**
 * 이번 회차 **`buildFeeMemberRows` 한 줄 기준 청구 총액(원)**.
 * - 부분납부: `feeAmountDueWon` 또는 (누적 납부 + 잔액)
 * - 미납·연체: 잔액만 있으면 그대로 청구액
 * - 완납: 납부액 = 청구액 (`amount` 또는 분리 필드)
 */
export function feeRowBillableDueWon(r: FeeMemberRow): number {
  if (r.duesType === "exempt") return 0;
  if (typeof r.feeAmountDueWon === "number" && Number.isFinite(r.feeAmountDueWon)) {
    return Math.max(0, Math.floor(r.feeAmountDueWon));
  }
  const rem = Math.max(0, Math.floor(Number(r.amount) || 0));
  const paidW =
    typeof r.feeAmountPaidWon === "number" && Number.isFinite(r.feeAmountPaidWon)
      ? Math.max(0, Math.floor(r.feeAmountPaidWon))
      : 0;
  if (r.paymentStatus === "paid") {
    return rem > 0 ? rem : paidW;
  }
  if (paidW > 0) return paidW + rem;
  return rem;
}

/** 해당 회차에 **실제 들어온 납부 누적(원)** — 부분납부·완납 모두 */
export function feeRowPaidProgressWon(r: FeeMemberRow): number {
  if (r.duesType === "exempt") return 0;
  if (typeof r.feeAmountPaidWon === "number" && Number.isFinite(r.feeAmountPaidWon) && r.feeAmountPaidWon > 0) {
    return Math.max(0, Math.floor(r.feeAmountPaidWon));
  }
  if (r.paymentStatus === "paid") {
    return Math.max(0, Math.floor(Number(r.amount) || 0));
  }
  return 0;
}

/**
 * 금액 KPI·미납 타일과 목록이 같은 전제를 쓰도록: 청구 합 = Σ 청구액, 실입금 합 = Σ 납부 누적, 미납 잔액 = Σ 잔액(미완납 행).
 * 면제 행은 제외.
 */
export function aggregateFeeMoneyFromRows(rows: FeeMemberRow[]): {
  totalBillableWon: number;
  /** 완납 + 부분납부 누적(환불 차감 전) */
  collectedPaidWon: number;
  /** 미완납 행 잔액 합 */
  outstandingWon: number;
} {
  let totalBillable = 0;
  let collected = 0;
  let outstanding = 0;
  for (const r of rows) {
    if (r.duesType === "exempt") continue;
    totalBillable += feeRowBillableDueWon(r);
    collected += feeRowPaidProgressWon(r);
    if (r.paymentStatus !== "paid") {
      outstanding += Math.max(0, Math.floor(Number(r.amount) || 0));
    }
  }
  return {
    totalBillableWon: totalBillable,
    collectedPaidWon: collected,
    outstandingWon: outstanding,
  };
}

/** 이번 회비 `payments` 문서 — 납부 SoT 기준 수납·미납 금액 합계 (활성 멤버에 매칭되는 문서만) */
export function sumPaymentAmountKpis(
  payments: FeePayment[],
  members?: TeamMember[]
): {
  collectedAmountWon: number;
  outstandingAmountWon: number;
} {
  const scoped =
    members && members.length > 0 ? filterFeePaymentsForActiveMembers(payments, members) : payments;
  const exemptKeys =
    members && members.length > 0 ? exemptMemberBillingKeySet(members) : null;
  let collected = 0;
  let outstanding = 0;
  for (const p of scoped) {
    if (exemptKeys && exemptKeys.size > 0 && paymentTouchesExemptBillingKeys(p, exemptKeys)) {
      continue;
    }
    const amt = Math.max(0, Math.floor(Number(p.amount) || 0));
    if (p.status === "paid") collected += amt;
    else outstanding += amt;
  }
  return { collectedAmountWon: collected, outstandingAmountWon: outstanding };
}

/**
 * 이번 달(서울) 마감 회차 목록 기준으로 회비 카드와 동일한 buildFeeMemberRows 합산.
 * KPI(statsMonthly) 대비 불일치 감지용.
 */
export function rollupFeeCardMetricsForFeesDueInMonth(
  feesDueInMonth: TeamFee[],
  members: TeamMember[],
  paymentsByFeeId: Readonly<Record<string, FeePayment[]>>
): { paidSlots: number; collectedWon: number } {
  const roster = filterMembersForFeeKpi(members);
  let paidSlots = 0;
  let collectedWon = 0;
  for (const fee of feesDueInMonth) {
    const pays = paymentsByFeeId[fee.id] ?? [];
    const rows = buildFeeMemberRows(roster, pays, fee.amount, fee.dueDate, fee.id);
    const st = calculateFeeDashboardStats(rows, rows.length);
    paidSlots += st.paidCount;
    collectedWon += st.revenue;
  }
  return { paidSlots, collectedWon };
}

/** 활성 멤버 목록 기준 연납자 비율 */
export function yearlyMemberKpi(members: TeamMember[]): { yearlyMemberCount: number; yearlyMemberRate: number } {
  const total = members.length;
  if (total === 0) return { yearlyMemberCount: 0, yearlyMemberRate: 0 };
  const yearly = members.filter((m) => (m.duesType ?? "monthly") === "yearly").length;
  return { yearlyMemberCount: yearly, yearlyMemberRate: Math.round((yearly / total) * 100) };
}

export function calculateFeeDashboardStats(
  rows: FeeMemberRow[],
  memberTotalCount?: number
): FeeDashboardStats {
  const totalMembers =
    memberTotalCount != null && Number.isFinite(memberTotalCount) && memberTotalCount >= 0
      ? memberTotalCount
      : rows.length;
  const actionable = rows.filter((r) => r.isBillingActionable !== false);
  const paidCount = rows.filter((r) => r.paymentStatus === "paid").length;
  const notPaidCount = Math.max(0, totalMembers - paidCount);
  const pendingCount = actionable.filter((r) => r.paymentStatus === "pending").length;
  const failedCount = actionable.filter((r) => r.paymentStatus === "failed").length;
  const overdueCount = actionable.filter((r) => r.paymentStatus === "overdue").length;
  const unpaidCount = actionable.filter((r) => r.paymentStatus === "unpaid").length;
  const revenue = rows.reduce((sum, row) => sum + feeRowPaidProgressWon(row), 0);
  const paymentRate =
    totalMembers === 0 ? 100 : Math.round((paidCount / totalMembers) * 100);

  return {
    totalMembers,
    paidCount,
    notPaidCount,
    pendingCount,
    failedCount,
    unpaidCount,
    overdueCount,
    paymentRate,
    revenue,
  };
}
