/** Firestore `teams/{teamId}/feePolicies/default` — 팀 회비 정책 */
export type TeamFeePolicyEarlyBird = {
  startMonth: number;
  endMonth: number;
};

export type TeamFeePolicyAnnual = {
  enabled: boolean;
  /** MVP: 보통 12 */
  months: number;
  /** 할인 개월 상한(보너스 월 수, 0이면 할인 없음) */
  discountMonths: number;
  /** 시즌 외에도 운영자가 수동 할인 적용 가능 여부 */
  allowManualOverride?: boolean;
  /** 없으면 할인을 월 제한 없이(상한만) 허용 */
  earlyBirdPeriod?: TeamFeePolicyEarlyBird;
};

export type TeamFeePolicy = {
  /** 0이면 회차 fee 금액을 기준으로 함 */
  monthlyAmount: number;
  annual: TeamFeePolicyAnnual;
  allowExempt: boolean;
};

export type FeePaymentPolicySnapshot = {
  monthlyAmount: number;
  /** 적용된 할인 개월(조기납부 기간 밖이면 0) */
  discountMonths: number;
};
