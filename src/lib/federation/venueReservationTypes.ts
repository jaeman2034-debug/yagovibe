/**
 * PR1–PR3 — Venue reservation + claim + admin confirm/finalize.
 * SoT: docs/YAGO_NOWON_VENUE_PAYMENT_MVP_SCOPE_FREEZE.md
 *
 * PAYMENT_CLAIMED LOCK:
 *   alias for paymentClaimStatus=REQUESTED ∧ paymentStatus=UNCONFIRMED
 *   ≠ admin CONFIRMED (PR3)
 */
import type { CanonicalPricingSnapshot } from "./venueAllocationTypes";


export type VenuePaymentClaimStatus = "NONE" | "REQUESTED";
export type VenueAllocationConfirmStatus = "PENDING_PAYMENT" | "FINALIZED";

/** Path: federations/{federationSlug}/venueReservations/{reservationId} */
export type VenueReservation = {
  id: string;
  /** Internal SoT id — equals venueSlotAllocations doc id (idempotent key). */
  reservationId: string;
  /** Member-facing + 입금 메모 code, e.g. NW-2507-A3F2 */
  shortReservationCode: string;
  federationSlug: string;
  slotAllocationId: string;
  allocatedRequestId: string;
  venueId: string;
  venueName: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  teamId: string;
  teamName: string;
  /** PR4-1.5 */
  teamKind?: "platform" | "guest";
  guestTeamId?: string | null;
  platformTeamId?: string | null;
  createdByUid: string;
  allocatedByUid: string;
  allocationSource?: "REQUEST_SELECTION" | "ADMIN_DIRECT" | null;
  paymentStatus: "UNCONFIRMED" | "CONFIRMED";
  paymentClaimStatus: VenuePaymentClaimStatus;
  confirmStatus: VenueAllocationConfirmStatus;
  /** Member who submitted 「입금 확인 요청」 */
  paymentClaimedByUid?: string | null;
  paymentClaimedAt?: unknown;
  /** Optional member-reported deposit time (ISO or Timestamp) — not bank SoT */
  paymentClaimDepositedAt?: string | null;
  /** Admin payment confirm (PR3) */
  paymentConfirmedByUid?: string | null;
  paymentConfirmedAt?: unknown;
  paymentUnconfirmedByUid?: string | null;
  paymentUnconfirmedAt?: unknown;
  finalizedByUid?: string | null;
  finalizedAt?: unknown;
  unfinalizeReasonCode?: string | null;
  unfinalizeReasonText?: string | null;
  baseAmount: number;
  lightingAmount: number;
  totalAmount: number;
  /** Copied verbatim from the immutable QUOTED request snapshot. */
  pricingStatus: "QUOTED";
  pricingSnapshot: CanonicalPricingSnapshot;
  /** Display guide only — not a payment rail */
  bankAccountGuide: string;
  /** Q3 copy — 사용 전월까지 */
  paymentDeadlineLabel: string;
  /** App path for QR / deep link */
  detailPath: string;
  schemaVersion: 1;
  createdAt?: unknown;
  updatedAt?: unknown;
  /** Idempotent notify marker (allocate) */
  notifyDedupKey?: string | null;
  /** Idempotent notify marker (claim → managers) */
  claimNotifyDedupKey?: string | null;
  /** PR4-1 — latest uploaded receipt (evidence only; ≠ CONFIRMED) */
  latestReceiptId?: string | null;
  paymentReceiptVerificationStatus?: "MATCH" | "REVIEW_REQUIRED" | null;
};

/** UX/ops alias — never treat as paymentStatus=CONFIRMED */
export function isPaymentClaimed(r: Pick<VenueReservation, "paymentClaimStatus" | "paymentStatus">): boolean {
  return r.paymentClaimStatus === "REQUESTED" && r.paymentStatus === "UNCONFIRMED";
}

export function isPaymentConfirmed(r: Pick<VenueReservation, "paymentStatus">): boolean {
  return r.paymentStatus === "CONFIRMED";
}

export function isReservationFinalized(r: Pick<VenueReservation, "confirmStatus">): boolean {
  return r.confirmStatus === "FINALIZED";
}

export function venueReservationDetailPath(
  federationSlug: string,
  reservationId: string
): string {
  return `/federations/${encodeURIComponent(federationSlug)}/reservations/${encodeURIComponent(reservationId)}`;
}
