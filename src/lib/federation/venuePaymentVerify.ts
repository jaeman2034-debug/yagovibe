import type {
  VenuePaymentOcrResult,
  VenuePaymentVerificationStatus,
} from "@/lib/federation/venuePaymentReceiptTypes";

export type VenuePaymentVerifyInput = {
  expectedAmount: number;
  shortReservationCode: string;
  ocr: VenuePaymentOcrResult;
  /** Other pending/approved receipts for duplicate detection */
  siblingReceipts?: Array<{
    id: string;
    status: string;
    ocrResult?: Partial<VenuePaymentOcrResult> | null;
  }>;
  currentReceiptId?: string;
};

export type VenuePaymentVerifyResult = {
  verificationStatus: VenuePaymentVerificationStatus;
  reasons: string[];
};

/**
 * Auto compare reservation vs OCR.
 * NEVER maps to paymentStatus=CONFIRMED — only MATCH | REVIEW_REQUIRED.
 */
export function verifyVenuePaymentReceipt(
  input: VenuePaymentVerifyInput
): VenuePaymentVerifyResult {
  const reasons: string[] = [];
  const raw = String(input.ocr.rawText || "").trim();
  const amount = input.ocr.amount;

  // Blurry / partial / empty OCR — never crash; always admin review
  if (!raw) {
    return {
      verificationStatus: "REVIEW_REQUIRED",
      reasons: ["OCR 결과가 없거나 읽을 수 없습니다. 관리자 검토가 필요합니다."],
    };
  }

  if (amount == null) {
    reasons.push("OCR에서 입금금액을 추출하지 못했습니다.");
  } else if (
    !Number.isFinite(input.expectedAmount) ||
    input.expectedAmount <= 0
  ) {
    reasons.push("예약 금액이 없어 금액 대조를 건너뜁니다.");
  } else if (Math.abs(amount - input.expectedAmount) > 0) {
    reasons.push(
      `금액 불일치: 예약 ${input.expectedAmount.toLocaleString("ko-KR")}원 ≠ OCR ${amount.toLocaleString("ko-KR")}원`
    );
  }

  if (!input.ocr.depositedAt) {
    reasons.push("OCR에서 입금일시를 추출하지 못했습니다.");
  }

  if (!input.ocr.bankName) {
    reasons.push("OCR에서 은행명을 추출하지 못했습니다.");
  }

  if (!input.ocr.senderName) {
    reasons.push("OCR에서 송금인을 추출하지 못했습니다.");
  }

  const hint = input.ocr.reservationCodeHint;
  if (hint && hint.toUpperCase() !== input.shortReservationCode.toUpperCase()) {
    reasons.push(
      `예약번호 불일치: OCR ${hint} ≠ 예약 ${input.shortReservationCode}`
    );
  }

  const txn = input.ocr.transactionId?.trim();
  if (txn && input.siblingReceipts?.length) {
    const dup = input.siblingReceipts.find((r) => {
      if (input.currentReceiptId && r.id === input.currentReceiptId) return false;
      if (r.status === "REJECTED") return false;
      return String(r.ocrResult?.transactionId || "").trim() === txn;
    });
    if (dup) {
      reasons.push(`동일 거래번호 영수증이 이미 존재합니다 (${dup.id}).`);
    }
  }

  // Soft duplicate: same amount + depositedAt on another open receipt
  if (amount != null && input.ocr.depositedAt && input.siblingReceipts?.length) {
    const soft = input.siblingReceipts.find((r) => {
      if (input.currentReceiptId && r.id === input.currentReceiptId) return false;
      if (r.status === "REJECTED") return false;
      return (
        r.ocrResult?.amount === amount &&
        String(r.ocrResult?.depositedAt || "") === input.ocr.depositedAt
      );
    });
    if (soft) {
      reasons.push(`동일 금액·시각 영수증이 이미 존재합니다 (${soft.id}).`);
    }
  }

  // MATCH only when amount equals and no hard blockers
  const hardBlock = reasons.some(
    (r) =>
      r.includes("금액 불일치") ||
      r.includes("예약번호 불일치") ||
      r.includes("이미 존재")
  );
  const amountOk =
    amount != null &&
    Number.isFinite(input.expectedAmount) &&
    input.expectedAmount > 0 &&
    amount === input.expectedAmount;

  if (amountOk && !hardBlock && reasons.length === 0) {
    return { verificationStatus: "MATCH", reasons: [] };
  }

  // Amount match with only soft missing fields → still REVIEW if any missing, else MATCH
  if (amountOk && !hardBlock) {
    // Missing OCR fields → REVIEW_REQUIRED (admin eye)
    return { verificationStatus: "REVIEW_REQUIRED", reasons };
  }

  return { verificationStatus: "REVIEW_REQUIRED", reasons };
}
