import { createHash } from "crypto";

const AUTOPAY_PREFIX = "tf";

function shortHash(input: string, len: number): string {
  return createHash("sha256").update(input, "utf8").digest("hex").slice(0, len);
}

/**
 * 팀 회비 자동결제 주문 ID (토스 6~64자).
 * 형식: tf_{th6}_{fh6}_{uh6}_{yyyymm}_{seq2}
 */
export function buildTeamFeeAutopayOrderId(
  teamId: string,
  feeId: string,
  uid: string,
  billingCycleYyyymm: string,
  seq: number
): string {
  const cycle = billingCycleYyyymm.replace(/\D/g, "").slice(0, 6);
  const seqStr = String(Math.min(99, Math.max(0, seq))).padStart(2, "0");
  const th = shortHash(teamId, 6);
  const fh = shortHash(feeId, 6);
  const uh = shortHash(uid, 6);
  let id = `${AUTOPAY_PREFIX}_${th}_${fh}_${uh}_${cycle}_${seqStr}`;
  if (id.length > 64) {
    id = `${AUTOPAY_PREFIX}_${cycle}_${seqStr}_${shortHash(`${teamId}:${feeId}:${uid}:${cycle}:${seq}`, 40)}`;
    id = id.slice(0, 64);
  }
  return id;
}

export function isTeamFeeAutopayOrderId(orderId: string): boolean {
  return typeof orderId === "string" && orderId.startsWith(`${AUTOPAY_PREFIX}_`);
}
