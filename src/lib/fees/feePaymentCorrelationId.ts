/**
 * 회비 멤버 단위 추적 키 — Cloud Function `recordManualTeamFeePayment` 의 orderId 규칙과 동일.
 */
export function buildFeePaymentCorrelationId(feeId: string, memberUid: string): string {
  return `manual_fee_${feeId}_${memberUid}`;
}
