/**
 * 🔥 Refund Policy - 환불 정책
 * 
 * Week3 핵심: 취소/부분환불 정책
 */

/**
 * 환불율 계산
 * 
 * @param startAt 슬롯 시작 시간
 * @param now 현재 시간 (기본값: 현재)
 * @returns 환불율 (0.0 ~ 1.0)
 */
export function calcRefundRate(startAt: Date, now: Date = new Date()): number {
  const diff = startAt.getTime() - now.getTime();
  const hours = diff / (1000 * 60 * 60);

  if (hours >= 24) {
    return 1.0; // 100% 환불
  }
  if (hours >= 6) {
    return 0.5; // 50% 환불
  }
  return 0.0; // 0% 환불 (당일/이후)
}

/**
 * 환불 금액 계산
 * 
 * @param amount 원래 결제 금액
 * @param startAt 슬롯 시작 시간
 * @param now 현재 시간
 * @returns 환불 금액
 */
export function calcRefundAmount(
  amount: number,
  startAt: Date,
  now: Date = new Date()
): number {
  const rate = calcRefundRate(startAt, now);
  return Math.floor(amount * rate);
}

/**
 * 환불 정책 설명
 */
export function getRefundPolicyDescription(startAt: Date): string {
  const rate = calcRefundRate(startAt);
  
  if (rate === 1.0) {
    return "24시간 전 취소 시 100% 환불";
  }
  if (rate === 0.5) {
    return "6시간 전 취소 시 50% 환불";
  }
  return "당일 취소 시 환불 불가";
}
