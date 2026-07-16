/**
 * Nowon Venue Rental — Sprint 1 types (aligned to Domain Contract).
 * SoT tenant: federations/{federationId}/…
 */

export type VenueDocStatus = "active" | "inactive";

export type VenueBookingStatus = "REQUESTED" | "APPROVED" | "REJECTED" | "CANCELLED";

export type VenuePaymentStatus = "UNCONFIRMED" | "CONFIRMED";

export type BookingApplicantType = "team" | "member" | "guest" | "operator" | "other";

export type VenuePricingStatus = "QUOTED" | "REVIEW_REQUIRED";

export type SlotUiStatus = "AVAILABLE" | "REQUESTED" | "APPROVED" | "BLOCKED";

/** LOCKED — 2h booking unit / slot interval */
export const VENUE_SLOT_INTERVAL_MINUTES = 120 as const;
export const VENUE_MINIMUM_BOOKING_MINUTES = 120 as const;

/** Sprint 2 additive — dated administrative baseline (XLSX), not a booking workflow state */
export type VenueBaselineSourceType = "XLSX_BASELINE";

export type VenueBaselineOccupancyStatus = "OCCUPIED";

/**
 * Path: federations/{federationId}/venueBaselineAllocations/{allocationId}
 * Canonical identity: venueId + bookingDate + startTime + endTime
 */
export type VenueBaselineAllocation = {
  id: string;
  federationId: string;
  venueId: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  sourceType: VenueBaselineSourceType;
  sourceAllocationLabel: string;
  sourceFile: string;
  sourceSheet: string;
  sourceCell: string;
  status: VenueBaselineOccupancyStatus;
  importManifestVersion: string;
  createdAt?: unknown;
  importedAt?: unknown;
};

/** Occupancy row kind for admin/read merge */
export type VenueSlotOccupancyKind = "BOOKING_REQUEST" | "BASELINE_ALLOCATION";

export type FederationVenue = {
  id: string;
  name: string;
  address?: string;
  fieldType?: string;
  status: VenueDocStatus;
  sortOrder?: number;
  createdAt?: unknown;
  updatedAt?: unknown;
};

/**
 * When no venue-specific operating windows exist in allocation data,
 * UI may show this fallback day window (06–22 local) as 2h slots.
 * Not a universal pricing/hours claim for all venues.
 */
export const DEFAULT_DAY_SLOT_START = "06:00";
export const DEFAULT_DAY_SLOT_END = "22:00";

export type VenueBooking = {
  id: string;
  federationId: string;
  venueId: string;
  venueName?: string;
  bookingDate: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string;
  applicantType: BookingApplicantType;
  applicantId?: string;
  teamId?: string;
  teamName?: string;
  bookingStatus: VenueBookingStatus;
  paymentStatus: VenuePaymentStatus;
  pricingStatus: VenuePricingStatus;
  pricingPolicyId?: string | null;
  pricingSnapshot?: unknown | null;
  baseAmount: number;
  lightingAmount: number;
  totalAmount: number;
  createdAt?: unknown;
  updatedAt?: unknown;
  createdByUid: string;
  decidedAt?: unknown;
  decidedByUid?: string;
  rejectReason?: string;
};

export function slotKey(bookingDate: string, startTime: string, endTime: string): string {
  return `${bookingDate}|${startTime}|${endTime}`;
}

export function formatSlotLabel(status: SlotUiStatus): string {
  switch (status) {
    case "AVAILABLE":
      return "신청 가능";
    case "REQUESTED":
      return "승인 대기";
    case "APPROVED":
      return "배정 완료";
    case "BLOCKED":
      return "이용 불가";
    default:
      return status;
  }
}
