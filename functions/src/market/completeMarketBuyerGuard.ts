import { HttpsError } from "firebase-functions/v2/https";

/**
 * 거래 완료 가능 여부 — 예약글은 문서상 예약자 필수, 선택 클라 buyerId와 불일치 시 차단
 */
export function assertCanCompleteMarketTransaction(
  m: Record<string, unknown>,
  optionalBuyerIdFromClient?: string | null
): void {
  const st = typeof m.status === "string" ? m.status : "";

  const reservedRaw = m.reservedBy;
  const reservedBy =
    typeof reservedRaw === "string" && reservedRaw.trim().length > 0
      ? reservedRaw.trim()
      : null;

  if (st === "reserved") {
    if (!reservedBy) {
      throw new HttpsError(
        "failed-precondition",
        "예약된 구매자 정보가 없어 거래를 완료할 수 없습니다."
      );
    }
  }

  const clientBuyer =
    typeof optionalBuyerIdFromClient === "string" && optionalBuyerIdFromClient.trim().length > 0
      ? optionalBuyerIdFromClient.trim()
      : null;

  if (clientBuyer && reservedBy && clientBuyer !== reservedBy) {
    throw new HttpsError(
      "permission-denied",
      "예약 구매자 정보가 일치하지 않습니다."
    );
  }
}
