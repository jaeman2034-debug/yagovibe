/**
 * 회비 멤버 단위 추적 키 — 수동 납부 `payments.orderId` 및 cashBook `correlationId`와 동일 규칙.
 * (온라인 결제는 별도 `team_fee_*` orderId 사용)
 */
export function buildFeePaymentCorrelationId(feeId: string, memberUid: string): string {
  return `manual_fee_${feeId}_${memberUid}`;
}
