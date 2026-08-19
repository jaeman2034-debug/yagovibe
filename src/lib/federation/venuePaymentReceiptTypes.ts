/**
 * PR4-1 — Venue payment receipt + OCR review (no Open Banking).
 * 3-axis reservation model unchanged:
 *   paymentClaimStatus REQUESTED ≠ paymentStatus CONFIRMED
 * OCR never auto-confirms; admin approve required.
 */

export type VenuePaymentReceiptStatus =
  | "UPLOADED"
  | "OCR_DONE"
  | "PENDING_REVIEW"
  | "APPROVED"
  | "REJECTED";

/** Auto verification only — never equals admin CONFIRMED */
export type VenuePaymentVerificationStatus = "MATCH" | "REVIEW_REQUIRED";

export type VenuePaymentOcrResult = {
  bankName: string | null;
  amount: number | null;
  depositedAt: string | null;
  senderName: string | null;
  transactionId: string | null;
  rawText: string;
  reservationCodeHint: string | null;
};

/** Path: federations/{federationSlug}/venuePaymentReceipts/{receiptId} */
export type VenuePaymentReceipt = {
  id: string;
  federationSlug: string;
  reservationId: string;
  shortReservationCode: string;
  teamId: string;
  teamName: string;
  venueName: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  expectedAmount: number;
  receiptImageUrl: string;
  receiptStoragePath: string;
  contentType: string;
  ocrResult: VenuePaymentOcrResult;
  verificationStatus: VenuePaymentVerificationStatus;
  verificationReasons: string[];
  status: VenuePaymentReceiptStatus;
  uploadedBy: string;
  uploadedAt?: unknown;
  reviewedBy?: string | null;
  reviewedAt?: unknown;
  /** Audit — status before admin decision */
  previousStatus?: VenuePaymentReceiptStatus | null;
  /** Audit — status after admin decision */
  newStatus?: VenuePaymentReceiptStatus | null;
  rejectReason?: string | null;
  schemaVersion: 1;
  updatedAt?: unknown;
};

/** UX alias mapping (directive copy → frozen 3-axis) */
export const VENUE_PAYMENT_STATUS_ALIAS = {
  PAYMENT_PENDING: "confirmStatus=PENDING_PAYMENT ∧ paymentStatus=UNCONFIRMED",
  PAYMENT_CONFIRMED: "paymentStatus=CONFIRMED",
  RESERVATION_CONFIRMED: "confirmStatus=FINALIZED",
} as const;
