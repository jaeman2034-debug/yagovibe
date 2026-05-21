/**
 * `teams/{teamId}/feeRefunds/{refundId}` — append-only 환불 기록 (Functions가 생성)
 */
export type TeamFeeRefundAllocationDetail = {
  /** 회차별 배분액 — KPI·감사 추적용 */
  perFeeWon?: Record<string, number>;
};

export type TeamFeeRefundStatus = "completed" | string;

export type TeamFeeRefund = {
  id: string;
  teamId: string;
  feeId?: string;
  memberId: string;
  originalPaymentDocId: string;
  refundAmountWon: number;
  currency?: string;
  reason?: string;
  refundKind?: string;
  status: TeamFeeRefundStatus;
  allocationDetail?: TeamFeeRefundAllocationDetail;
  feeIds?: string[];
  sourceBulkPaymentId?: string;
  idempotencyKey?: string;
  createdByUid?: string;
};
