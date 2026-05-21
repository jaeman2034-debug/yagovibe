import type { Timestamp } from "firebase/firestore";
import type { AnnualPrepaidPaymentSourceType } from "@/lib/fees/annualPrepaidSource";
import type { FeePaymentPolicySnapshot } from "@/types/teamFeePolicy";
import type { MemberDuesType } from "@/types/memberDues";

export type TeamFee = {
  id: string;
  title: string;
  amount: number;
  dueDate?: Timestamp;
  status: "open" | "closed";
  createdAt?: Timestamp;
  reminderSent?: boolean;
  lastReminderAt?: Timestamp;
  /** 스케줄러가 집계한 연체(미납) 멤버 수 — UI 계산과 병행 가능 */
  overdueMemberCount?: number;
  overdueUpdatedAt?: Timestamp;
  /** 연체 자동 독촉 발송 이력 (키: 연체일수 D+N 의 N 문자열) */
  overdueReminderHistory?: Record<string, boolean>;
  overdueReminderUpdatedAt?: Timestamp;
  billingMode?: "manual" | "autopay_optional" | "autopay_required";
  autopayRunAt?: Timestamp;
  autopayStatus?: "scheduled" | "processing" | "done" | "partial" | "failed";
  autopayLastRunAt?: Timestamp;
  /** 월별 중복 방지 키(`YYYY-MM`, 서울) — 스케줄러·클라 생성 동일 규칙 */
  autoMonthKey?: string;
};

export type TeamMember = {
  uid: string;
  /** `teams/.../members/{id}` 문서 ID — 납부 문서가 예전 조인 키(문서 ID)로만 저장된 경우 조회용 */
  memberDocumentId?: string;
  /** Firestore `userId`/`uid`에 연결된 Auth UID — 없으면 문서 ID만으로 `uid`가 채워질 수 있음 */
  linkedAuthUid?: string;
  name: string;
  role: "owner" | "manager" | "member";
  joinedAt?: Timestamp;
  /** 월납 / 연납 / 면제 — 미설정 시 월납으로 간주 */
  duesType?: MemberDuesType;
  /** 연납 납부 시각(연도 매칭용) */
  yearlyPaidAt?: Timestamp;
  discountAmount?: number;
  discountLabel?: string;
};

export type FeePayment = {
  id: string;
  /** Firestore `feeId` — 문서 ID 파싱 시 `local_*` 등 `_` 포함 userId 대비 */
  feeId?: string;
  uid: string;
  /** teams/.../members 조인용 납부자 UID — Firestore `memberId`/`userId` 필드만 신뢰 */
  memberId?: string;
  memberName?: string;
  /**
   * 레거시 단일 금액(문서·PG에 따라 ‘청구’ 또는 ‘납부’ 등 혼재 가능).
   * `amountDue`/`amountPaid`가 있으면 UI·잔액은 `resolvePaymentDisplay`가 분리 필드 기준으로 계산.
   */
  amount: number;
  /** 명시 청구 총액(원) — 있으면 잔액 = `amountDue - amountPaid` 축 */
  amountDue?: number;
  /** 누적 납부(원) — `status !== paid`일 때 잔액 표시에 사용 */
  amountPaid?: number;
  /** 부분납부 중(누적 납부액이 청구액 미만) — 서버 Callable 전용 기록 */
  status: "paid" | "pending" | "partial" | "failed" | "cancelled";
  paidAt?: Timestamp;
  requestedAt?: Timestamp;
  updatedAt?: Timestamp;
  failCode?: string;
  failReason?: string;
  orderId?: string;
  source?: "manual" | "autopay" | "annual";
  /** bulk 첫 회차만 `annual_prepaid`, 이후 회차는 `annual_prepaid_split` */
  sourceType?: AnnualPrepaidPaymentSourceType;
  sourceBulkPaymentId?: string;
  annualBatchId?: string;
  allocatedFromAmount?: number;
  /** 연납 할인: 정가 합계(할인 전) */
  originalAmount?: number;
  /** 연납 할인: 실제 납부 합계(할인 후) — 분배·KPI 기준 */
  finalAmount?: number;
  discountMonths?: number;
  discountApplied?: boolean;
  /** 연납 등록 시점 정책 스냅샷 */
  policySnapshot?: FeePaymentPolicySnapshot;
  billingProfileUid?: string;
  chargeAttemptCount?: number;
  nextRetryAt?: Timestamp | null;
  autopayRunId?: string | null;
  retryExhausted?: boolean;
  lastFailedAt?: Timestamp;
  lastRetryScheduledAt?: Timestamp;
  /** `nonResponderFeeReminderScheduler` 재알림(n2/n5) 발송 멱등 */
  nonResponderReminderHistory?: { n2?: boolean; n5?: boolean };
  nonResponderReminderUpdatedAt?: Timestamp;
  /** 부분납부 Callable이 마지막으로 반영한 청크(표시·디버깅) */
  lastPaymentChunkAt?: Timestamp;
  lastPaymentChunkAmount?: number;
};

export type FeeMemberRow = {
  uid: string;
  /** 납부·KPI 조인 키 — 없으면 멤버 납부 리스트에서 렌더하지 않음 */
  memberId?: string;
  name: string;
  role: "owner" | "manager" | "member";
  duesType: MemberDuesType;
  /** `duesType === "yearly"`일 때 멤버 문서의 연납 시각(표시·경고용) */
  yearlyPaidAt?: Timestamp;
  /** 면제·연납 완료 등 — 수동 납부·독촉 대상에서 제외 */
  isBillingActionable?: boolean;
  /** 회비 유형 요약 (목록 표시용) */
  duesLabel?: string;
  /** 정책 안내 한 줄 (면제/연납 등) */
  billingNote?: string;
  paymentStatus: "paid" | "pending" | "failed" | "unpaid" | "overdue";
  amount: number;
  /** 연납 분해: 정가 합계(할인 전) — 표시·할인 안내용 */
  originalAmount?: number;
  /** 연납 분해: 실납부 합계(할인 후) */
  annualPrepaidFinalAmount?: number;
  discountMonths?: number;
  discountApplied?: boolean;
  sourceType?: AnnualPrepaidPaymentSourceType;
  sourceBulkPaymentId?: string;
  /** 총무가 현금·계좌 등으로 `paid` 처리한 경우 */
  settledManually?: boolean;
  paidAt?: Timestamp;
  failCode?: string;
  failReason?: string;
  /** 마감일 익일부터 누적 일수 (마감 당일은 0) */
  overdueDays?: number;
  /** payments 문서 원본 status (`partial` 등) — UI 배지·부분납부 액션용 */
  paymentDocStatus?: FeePayment["status"];
  /** 청구 라인 총액·누적 납부(원) — 장부 분리 필드가 있을 때만 */
  feeAmountDueWon?: number;
  feeAmountPaidWon?: number;
  /** 마지막 부분납부 청크 */
  lastPaymentChunkAt?: Timestamp;
  lastPaymentChunkAmount?: number;
  paymentSource?: "manual" | "autopay";
  chargeAttemptCount?: number;
  nextRetryAt?: Timestamp | null;
  retryExhausted?: boolean;
};

export type FeeDashboardStats = {
  totalMembers: number;
  paidCount: number;
  /** 완납(`paid`)이 아닌 멤버 수 — 미납 KPI용 */
  notPaidCount: number;
  pendingCount: number;
  failedCount: number;
  unpaidCount: number;
  overdueCount: number;
  /** 전체 멤버 대비 완납 비율(%) */
  paymentRate: number;
  /** 행(`FeeMemberRow`) 기준 수납 합계 — 레거시·보조 */
  revenue: number;
  /** `cashBook` 회비 수입 합(선택 회차 feeId) — 회계 반영 */
  collectedAmountWon?: number;
  /** 같은 팀 `cashBook` 회비 수입 합(모든 회차) — 선택 회차 KPI가 0일 때 비교용 */
  allFeesMembershipCashBookIncomeWon?: number;
  /** 멤버 행 기준 실입금 누적(부분납·연납 분해 포함) — `payments` 문서 직합과 다를 수 있음 */
  paymentsSoTCollectedWon?: number;
  outstandingAmountWon?: number;
  /** 연납·면제 등 당월 추가 입금 없이 완납 처리만 된 멤버 수 */
  paidWithoutCashMemberCount?: number;
  /** 활성 멤버 기준 연납(`yearly`) 인원·비율 */
  yearlyMemberCount?: number;
  yearlyMemberRate?: number;
};
