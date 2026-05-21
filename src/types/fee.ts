/**
 * 회비/정산 데이터 타입 정의
 * 
 * Sprint 5: 회비/정산 실전 엔진
 */

import { Timestamp } from "firebase/firestore";

export type FeeType = "annual" | "monthly" | "temporary" | "donation";
export type FeeStatus = "unpaid" | "paid";

export interface MembershipFee {
  id: string;
  associationId: string;
  memberId: string;
  memberName: string;
  type: FeeType;
  amount: number;
  dueDate: Timestamp;
  paidAt?: Timestamp;
  status: FeeStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Expense {
  id: string;
  associationId: string;
  tournamentId?: string;
  category: string; // 'judge' | 'facility' | 'operation' | etc.
  amount: number;
  receiptImageUrl?: string;
  description?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface SettlementSummary {
  income: {
    tournamentFees: number;
    membershipFees: number;
    donations: number;
    total: number;
  };
  expense: {
    judge: number;
    facility: number;
    operation: number;
    total: number;
  };
  balance: number;
  period: {
    start: Timestamp;
    end: Timestamp;
  };
}

// 팀 단위 회비(teams/{teamId}/fees)
export type TeamFeeStatus = "open" | "closed";

export type TeamFeeBillingMode = "manual" | "autopay_optional" | "autopay_required";

export type TeamFeeAutopayStatus = "scheduled" | "processing" | "done" | "partial" | "failed";

export interface TeamFee {
  id: string;
  title: string;
  amount: number;
  dueDate: Timestamp;
  status: TeamFeeStatus;
  /** D-1 자동 알림 큐잉 여부 (스케줄러가 1회만 생성) */
  reminderSent?: boolean;
  lastReminderAt?: Timestamp;
  overdueMemberCount?: number;
  overdueUpdatedAt?: Timestamp;
  overdueReminderHistory?: Record<string, boolean>;
  overdueReminderUpdatedAt?: Timestamp;
  /** Toss Billing 자동결제 모드(팀 회비 1차 범위) */
  billingMode?: TeamFeeBillingMode;
  autopayRunAt?: Timestamp;
  autopayStatus?: TeamFeeAutopayStatus;
  autopayLastRunAt?: Timestamp;
  /** 월별 중복 방지 (`YYYY-MM`, 서울) */
  autoMonthKey?: string;
  createdBy: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  closedAt?: Timestamp;
}

/** teams/{teamId}/billingProfiles/{uid} — 원문 빌링키는 billingSecrets 에만 */
export type TeamBillingProfileStatus = "pending_registration" | "active" | "paused" | "revoked";

export interface TeamBillingProfile {
  uid: string;
  teamId: string;
  customerKey: string;
  billingMethod: "toss_card";
  status: TeamBillingProfileStatus;
  billingKeyMasked?: string | null;
  cardIssuerCode?: string | null;
  agreedAt?: Timestamp;
  revokedAt?: Timestamp;
  lastChargedAt?: Timestamp;
  lastChargeStatus?: "success" | "failed";
  lastOrderId?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

/** teams/{teamId}/fees/{feeId}/autopayRuns/{runId} */
export type FeeAutopayRunStatus = "scheduled" | "processing" | "completed" | "partial" | "failed";

export interface FeeAutopayRun {
  runId: string;
  feeId: string;
  teamId: string;
  scheduledFor?: Timestamp;
  startedAt?: Timestamp;
  finishedAt?: Timestamp;
  targetCount?: number;
  successCount?: number;
  failedCount?: number;
  status?: FeeAutopayRunStatus;
}

// 팀 회비 납부 SoT(teams/{teamId}/payments/{feeId}_{userId}, 필드 feeId·userId)
export type TeamFeePaymentStatus = "pending" | "paid" | "failed";

export type TeamFeePaymentSource = "manual" | "autopay";

export interface TeamFeePayment {
  userId: string;
  status: TeamFeePaymentStatus;
  amount: number;
  /** fee_reminder / billing_re_register A/B 실험 귀속 (서버 검증 후 저장) */
  experiment?: string;
  variant?: "A" | "B";
  attributionNotificationId?: string;
  /** `billing_reregister`: 재등록 알림 → 빌링키 후 자동결제 성공 퍼널 */
  attributionType?: string;
  createdAt?: Timestamp;
  paidAt?: Timestamp;
  paymentKey?: string;
  source?: TeamFeePaymentSource;
  billingProfileUid?: string;
  chargeAttemptCount?: number;
  nextRetryAt?: Timestamp | null;
  autopayRunId?: string | null;
  retryExhausted?: boolean;
  lastFailedAt?: Timestamp;
  lastRetryScheduledAt?: Timestamp;
}

