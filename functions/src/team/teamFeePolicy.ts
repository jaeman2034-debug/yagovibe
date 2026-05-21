import type { Firestore } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";
import { seoulCalendarFromInstant } from "../scheduler/seoulDateUtils";

export type TeamFeePolicyEarlyBird = {
  startMonth: number;
  endMonth: number;
};

export type TeamFeePolicyAnnual = {
  enabled: boolean;
  months: number;
  discountMonths: number;
  allowManualOverride?: boolean;
  earlyBirdPeriod?: TeamFeePolicyEarlyBird;
};

export type TeamFeePolicy = {
  monthlyAmount: number;
  annual: TeamFeePolicyAnnual;
  allowExempt: boolean;
};

export type FeePaymentPolicySnapshot = {
  monthlyAmount: number;
  discountMonths: number;
};

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

  const monthlyAmount = Math.floor(Number(raw.monthlyAmount ?? base.monthlyAmount));
  const annualRaw = raw.annual as Record<string, unknown> | undefined;
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
  const allowExempt = raw.allowExempt !== false;

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

export async function loadTeamFeePolicy(db: Firestore, teamId: string): Promise<TeamFeePolicy> {
  const snap = await db.doc(`teams/${teamId}/feePolicies/default`).get();
  if (!snap.exists) return DEFAULT_TEAM_FEE_POLICY;
  return normalizeTeamFeePolicy(snap.data() as Record<string, unknown>);
}

function isInclusiveMonthRange(M: number, start: number, end: number): boolean {
  if (start <= end) return M >= start && M <= end;
  return M >= start || M <= end;
}

/**
 * 클라이언트 요청 할인 개월을 정책·조기납부 기간에 맞게 확정.
 * - 정책 상한 초과 시 HttpsError
 * - 조기납부 기간 밖이면 0 (무료 할인 없음)
 */
export function resolveAnnualPrepaidDiscountMonths(args: {
  policy: TeamFeePolicy;
  contractMonths: number;
  requestedRaw: number;
  nowMs: number;
  forceAllowOutsideEarlyBird?: boolean;
}): number {
  const { policy, contractMonths } = args;
  const requested = Math.floor(Number(args.requestedRaw));
  if (!Number.isFinite(requested) || requested < 0) {
    throw new HttpsError("invalid-argument", "discountMonths 값이 올바르지 않습니다.");
  }
  if (requested > policy.annual.discountMonths) {
    throw new HttpsError(
      "invalid-argument",
      `할인 개월은 최대 ${policy.annual.discountMonths}개까지 허용됩니다.`
    );
  }

  const maxWithSplit = Math.min(policy.annual.discountMonths, contractMonths - 1);
  let effective = Math.max(0, Math.min(requested, maxWithSplit));

  const early = policy.annual.earlyBirdPeriod;
  if (early) {
    const { M } = seoulCalendarFromInstant(args.nowMs);
    if (!args.forceAllowOutsideEarlyBird && !isInclusiveMonthRange(M, early.startMonth, early.endMonth)) {
      effective = 0;
    }
  }

  return effective;
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
