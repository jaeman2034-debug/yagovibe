/**
 * 🔥 PG Adapter - 결제사 어댑터
 * 
 * Week3 핵심: Mock → 실제 PG 교체 가능
 */

export type PgRequest = {
  reservationId: string;
  amount: number;
  userId?: string;
  metadata?: Record<string, any>;
};

export type PgResult =
  | { ok: true; pgTid: string; message?: string }
  | { ok: false; reason: string; code?: string };

/**
 * 결제 요청 (Mock 구현)
 * 
 * 실제 연동 시:
 * - Toss Payments: https://docs.tosspayments.com/
 * - KCP: https://admin.kcp.co.kr/
 * - 이니시스: https://www.inicis.com/
 */
export async function requestPay(p: PgRequest): Promise<PgResult> {
  // Mock: 항상 성공
  // 실제 구현 시:
  // const response = await fetch("https://api.tosspayments.com/v1/payments", {
  //   method: "POST",
  //   headers: {
  //     "Authorization": `Basic ${btoa(`${SECRET_KEY}:`)}`,
  //     "Content-Type": "application/json",
  //   },
  //   body: JSON.stringify({
  //     amount: p.amount,
  //     orderId: p.reservationId,
  //     orderName: "구장 예약",
  //     customerName: p.userId,
  //   }),
  // });
  // const data = await response.json();
  // return data.status === "READY" 
  //   ? { ok: true, pgTid: data.paymentKey }
  //   : { ok: false, reason: data.message };

  return {
    ok: true,
    pgTid: `mock_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    message: "Mock payment approved",
  };
}

/**
 * 결제 승인 (Mock 구현)
 * 
 * 실제 연동 시:
 * - Toss: 승인 API 호출
 * - KCP: 승인 API 호출
 */
export async function approvePay(
  pgTid: string,
  amount: number
): Promise<PgResult> {
  // Mock: 항상 성공
  // 실제 구현 시:
  // const response = await fetch(`https://api.tosspayments.com/v1/payments/${pgTid}`, {
  //   method: "POST",
  //   headers: {
  //     "Authorization": `Basic ${btoa(`${SECRET_KEY}:`)}`,
  //     "Content-Type": "application/json",
  //   },
  //   body: JSON.stringify({ amount }),
  // });
  // const data = await response.json();
  // return data.status === "DONE"
  //   ? { ok: true, pgTid: data.paymentKey }
  //   : { ok: false, reason: data.message };

  return {
    ok: true,
    pgTid,
    message: "Mock payment approved",
  };
}

/**
 * 결제 취소 (Mock 구현)
 */
export async function cancelPay(
  pgTid: string,
  amount: number,
  reason?: string
): Promise<PgResult> {
  // Mock: 항상 성공
  // 실제 구현 시:
  // const response = await fetch(`https://api.tosspayments.com/v1/payments/${pgTid}/cancel`, {
  //   method: "POST",
  //   headers: {
  //     "Authorization": `Basic ${btoa(`${SECRET_KEY}:`)}`,
  //     "Content-Type": "application/json",
  //   },
  //   body: JSON.stringify({ cancelAmount: amount, cancelReason: reason }),
  // });
  // const data = await response.json();
  // return data.status === "CANCELLED"
  //   ? { ok: true, pgTid: data.paymentKey }
  //   : { ok: false, reason: data.message };

  return {
    ok: true,
    pgTid,
    message: "Mock payment cancelled",
  };
}
