/**
 * Payment Service interface — bank Open Banking stays behind this boundary (Phase 2).
 * MVP implements receipt-evidence path only.
 */

import type { VenuePaymentReceipt } from "@/lib/federation/venuePaymentReceiptTypes";
import type { VenueReservation } from "@/lib/federation/venueReservationTypes";

export type SubmitDepositEvidenceInput = {
  federationSlug: string;
  reservationId: string;
  uploadedBy: string;
  file: File;
};

export type ReviewDepositEvidenceInput = {
  federationSlug: string;
  receiptId: string;
  adminUid: string;
  decision: "APPROVE" | "REJECT";
  rejectReason?: string | null;
};

/**
 * Extensible payment port.
 * Phase 2 may add: listBankTransfers / matchVirtualAccount / autoSuggestConfirm.
 */
export interface VenuePaymentService {
  submitDepositEvidence(
    input: SubmitDepositEvidenceInput
  ): Promise<{ receipt: VenuePaymentReceipt; reservation: VenueReservation }>;

  reviewDepositEvidence(
    input: ReviewDepositEvidenceInput
  ): Promise<{ receipt: VenuePaymentReceipt; reservation: VenueReservation }>;
}
