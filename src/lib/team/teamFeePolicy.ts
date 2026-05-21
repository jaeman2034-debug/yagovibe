import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { seoulCalendarFromInstant } from "@/features/fees/utils/seoulFeeDue";
import type { FeePaymentPolicySnapshot, TeamFeePolicy } from "@/types/teamFeePolicy";

/** 문서 없을 때 — 기존 UX(1~3월 조기 할인 최대 2개월, 12개월 연납)과 동일 */
export const DEFAULT_TEAM_FEE_POLICY: TeamFeePolicy = {
  monthlyAmount: 0,
  annual: {
    enabled: true,
    months: 12,
    discountMonths: 2,
    allowManualOverride: true,
    earlyBirdPeriod: { startMonth: 1, endMonth: 3 },
  },
  allowExempt: true,
};

export function normalizeTeamFeePolicy(raw: Record<string, unknown> | undefined | null): TeamFeePolicy {
  const base = DEFAULT_TEAM_FEE_POLICY;
  if (!raw || typeof raw !== "object") return base;

  const monthlyAmount = Math.floor(Number((raw as { monthlyAmount?: unknown }).monthlyAmount ?? base.monthlyAmount));
  const annualRaw = (raw as { annual?: Record<string, unknown> }).annual;
  const earlyRaw = annualRaw?.earlyBirdPeriod as Record<string, unknown> | undefined;

  let earlyBirdPeriod = base.annual.earlyBirdPeriod;
  if (earlyRaw && typeof earlyRaw === "object") {
    const sm = Math.floor(Number(earlyRaw.startMonth));
    const em = Math.floor(Number(earlyRaw.endMonth));
    if (sm >= 1 && sm <= 12 && em >= 1 && em <= 12) {
      earlyBirdPeriod = { startMonth: sm, endMonth: em };
    }
  }

  const enabled = annualRaw?.enabled !== false;
  const months = Math.min(24, Math.max(1, Math.floor(Number(annualRaw?.months ?? base.annual.months))));
  const discountMonths = Math.min(
    months - 1,
    Math.max(0, Math.floor(Number(annualRaw?.discountMonths ?? base.annual.discountMonths)))
  );
  const allowExempt = (raw as { allowExempt?: unknown }).allowExempt !== false;

  return {
    monthlyAmount: Number.isFinite(monthlyAmount) && monthlyAmount >= 0 ? monthlyAmount : 0,
    annual: {
      enabled,
      months,
      discountMonths,
      allowManualOverride: annualRaw?.allowManualOverride !== false,
      earlyBirdPeriod,
    },
    allowExempt,
  };
}

export async function fetchTeamFeePolicy(teamId: string): Promise<TeamFeePolicy> {
  const ref = doc(db, "teams", teamId, "feePolicies", "default");
  const snap = await getDoc(ref);
  if (!snap.exists()) return DEFAULT_TEAM_FEE_POLICY;
  return normalizeTeamFeePolicy(snap.data() as Record<string, unknown>);
}

/** `teams/{teamId}/feePolicies/default` 전체 덮어쓰기 — 조기납부 끄면 `earlyBirdPeriod` 제거 */
export async function saveTeamFeePolicy(teamId: string, policy: TeamFeePolicy): Promise<void> {
  const months = Math.min(24, Math.max(1, Math.floor(policy.annual.months)));
  const discountMonths = Math.min(months - 1, Math.max(0, Math.floor(policy.annual.discountMonths)));
  const annual: Record<string, unknown> = {
    enabled: policy.annual.enabled,
    months,
    discountMonths,
    allowManualOverride: policy.annual.allowManualOverride !== false,
  };
  if (policy.annual.earlyBirdPeriod) {
    const sm = Math.floor(policy.annual.earlyBirdPeriod.startMonth);
    const em = Math.floor(policy.annual.earlyBirdPeriod.endMonth);
    if (sm >= 1 && sm <= 12 && em >= 1 && em <= 12) {
      annual.earlyBirdPeriod = { startMonth: sm, endMonth: em };
    }
  }
  const ref = doc(db, "teams", teamId, "feePolicies", "default");
  await setDoc(ref, {
    monthlyAmount: Math.max(0, Math.floor(Number(policy.monthlyAmount)) || 0),
    annual,
    allowExempt: policy.allowExempt !== false,
    updatedAt: serverTimestamp(),
  });
}

/** 조기납부 기간 밖이면 0 — 서버 `resolveAnnualPrepaidDiscountMonths`와 동일 기준 */
export function maxSelectableAnnualDiscountMonths(policy: TeamFeePolicy): number {
  const maxD = Math.min(policy.annual.discountMonths, policy.annual.months - 1);
  const early = policy.annual.earlyBirdPeriod;
  if (!early) return maxD;
  const { M } = seoulCalendarFromInstant(Date.now());
  return isInclusiveMonthRange(M, early.startMonth, early.endMonth) ? maxD : 0;
}

/** 연납 모달 기본 선택(서울 달 기준) */
export function defaultAnnualPrepaidDiscountMonths(policy: TeamFeePolicy): number {
  const maxSelectable = maxSelectableAnnualDiscountMonths(policy);
  const early = policy.annual.earlyBirdPeriod;
  const { M } = seoulCalendarFromInstant(Date.now());
  if (early) {
    const inBird = isInclusiveMonthRange(M, early.startMonth, early.endMonth);
    return inBird ? Math.min(2, maxSelectable) : 0;
  }
  return Math.min(2, maxSelectable);
}

function isInclusiveMonthRange(M: number, start: number, end: number): boolean {
  if (start <= end) return M >= start && M <= end;
  return M >= start || M <= end;
}

export function buildFeePaymentPolicySnapshot(
  policy: TeamFeePolicy,
  refMonthlyFromFee: number,
  appliedDiscountMonths: number
): FeePaymentPolicySnapshot {
  const monthlyAmount =
    policy.monthlyAmount > 0 ? policy.monthlyAmount : Math.max(0, Math.floor(refMonthlyFromFee));
  return {
    monthlyAmount,
    discountMonths: appliedDiscountMonths,
  };
}
