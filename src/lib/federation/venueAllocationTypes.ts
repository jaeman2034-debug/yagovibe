/**
 * Nowon Federation — venue allocation request domain
 *
 * Path A: multi-club REQUESTED → admin REQUEST_SELECTION → one winner
 * Path B: admin ADMIN_DIRECT pre-allocation (no club request required)
 * P11/P12/P13: reallocate / cancel / required reason + change logs
 */

export type VenueAllocationRequestStatus =
  | "REQUESTED"
  | "ALLOCATED"
  | "NOT_ALLOCATED"
  | "WITHDRAWN"
  | "CANCELLED";

/** How the final slot winner was decided */
export type VenueAllocationSource = "REQUEST_SELECTION" | "ADMIN_DIRECT";

/** P13 reason codes (LOCKED) */
export type VenueAllocationChangeReasonCode =
  | "DUPLICATE_ALLOCATION"
  | "TEAM_REQUEST"
  | "MATCH_SCHEDULE_CHANGE"
  | "WEATHER_RAIN"
  | "FEDERATION_ADJUSTMENT"
  | "OTHER";

export type VenueAllocationChangeType = "REALLOCATE" | "CANCEL";

export const VENUE_ALLOCATION_REASON_OPTIONS: Array<{
  code: VenueAllocationChangeReasonCode;
  label: string;
}> = [
  { code: "DUPLICATE_ALLOCATION", label: "중복 배정" },
  { code: "TEAM_REQUEST", label: "팀 요청" },
  { code: "MATCH_SCHEDULE_CHANGE", label: "경기 일정 변경" },
  { code: "WEATHER_RAIN", label: "우천" },
  { code: "FEDERATION_ADJUSTMENT", label: "협회 운영 조정" },
  { code: "OTHER", label: "기타 (직접 입력)" },
];

/** Path: federations/{federationId}/venueAllocationRequests/{requestId} */
export type VenueAllocationRequest = {
  id: string;
  federationId: string;
  venueId: string;
  venueName?: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  teamId: string;
  teamName?: string;
  createdByUid: string;
  requestStatus: VenueAllocationRequestStatus;
  /** Present on ALLOCATED rows */
  allocationSource?: VenueAllocationSource | null;
  /** Future payment obligation — not implemented; stays UNCONFIRMED after allocate */
  paymentStatus: "UNCONFIRMED" | "CONFIRMED";
  pricingStatus?: "QUOTED" | "REVIEW_REQUIRED";
  pricingPolicyId?: string | null;
  pricingSnapshot?: unknown | null;
  baseAmount: number;
  lightingAmount: number;
  totalAmount: number;
  createdAt?: unknown;
  updatedAt?: unknown;
  allocatedByUid?: string;
  allocatedAt?: unknown;
  withdrewAt?: unknown;
};

/**
 * Canonical one-winner cursor for a venue/date/slot.
 * Path: federations/{federationId}/venueSlotAllocations/{slotId}
 * Doc id = slot_{venueId}_{YYYY-MM-DD}_{HHmm}
 * status CANCELLED → slot OPEN for new requests (P12).
 */
export type VenueSlotAllocation = {
  id: string;
  federationId: string;
  venueId: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  allocatedTeamId: string;
  allocatedTeamName?: string;
  allocatedRequestId: string;
  allocatedByUid: string;
  allocatedAt?: unknown;
  allocationSource: VenueAllocationSource;
  status: "ALLOCATED" | "CANCELLED";
  cancelledByUid?: string;
  cancelledAt?: unknown;
  cancelReasonCode?: VenueAllocationChangeReasonCode | null;
  cancelReasonText?: string | null;
  previousAllocatedTeamId?: string | null;
};

/** Path: federations/{federationId}/venueAllocationChangeLogs/{logId} */
export type VenueAllocationChangeLog = {
  id: string;
  federationId: string;
  venueId: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  slotAllocationId: string;
  changeType: VenueAllocationChangeType;
  reasonCode: VenueAllocationChangeReasonCode;
  reasonText: string | null;
  fromTeamId: string | null;
  toTeamId: string | null;
  allocationSource: VenueAllocationSource | null;
  changedByUid: string;
  changedAt?: unknown;
  createdAt?: unknown;
};

/** UI slot states for the preserved public board */
export type AllocationSlotUiStatus =
  | "AVAILABLE"
  | "OWN_PENDING"
  | "ALLOCATED"
  | "BLOCKED";

/** Admin monthly board cell status */
export type AdminBoardSlotStatus = "OPEN" | "REQUEST_POOL" | "ALLOCATED";

export type AdminMonthlyBoardRow = {
  key: string;
  venueId: string;
  venueName: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  status: AdminBoardSlotStatus;
  requestCount: number;
  pendingRequests: VenueAllocationRequest[];
  winner?: VenueSlotAllocation | null;
  winnerTeamName?: string;
};

/** Per-day rollup for monthly allocation calendar */
export type AdminCalendarDaySummary = {
  bookingDate: string;
  open: number;
  requestPool: number;
  /** ALLOCATED via ADMIN_DIRECT */
  adminDirect: number;
  /** ALLOCATED via REQUEST_SELECTION */
  requestSelection: number;
};

export const VENUE_ALLOCATION_DOMAIN = {
  mismatch: "SINGLE_REQUEST_SLOT_MODEL_MISMATCH",
  baselineReconciliation: "BASELINE_ALLOCATION_SEMANTIC_RECONCILIATION_REQUIRED",
  engineNote: "REQUESTED is non-blocking; ALLOCATED is blocking",
} as const;

export function assertAllocationReason(
  reasonCode: VenueAllocationChangeReasonCode,
  reasonText?: string | null
): { reasonCode: VenueAllocationChangeReasonCode; reasonText: string | null } {
  if (!VENUE_ALLOCATION_REASON_OPTIONS.some((o) => o.code === reasonCode)) {
    throw new Error("변경 사유를 선택하세요.");
  }
  const text = reasonText != null ? String(reasonText).trim() : "";
  if (reasonCode === "OTHER" && !text) {
    throw new Error("기타 사유를 입력하세요.");
  }
  return { reasonCode, reasonText: text || null };
}

export function formatAllocationSlotLabel(
  status: AllocationSlotUiStatus,
  opts?: { isOwnAllocated?: boolean }
): string {
  switch (status) {
    case "AVAILABLE":
      return "배정 신청 가능";
    case "OWN_PENDING":
      return "배정 심사 중";
    case "ALLOCATED":
      return opts?.isOwnAllocated ? "우리 팀 배정" : "배정 완료";
    case "BLOCKED":
      return "이용 불가";
    default:
      return status;
  }
}

/** Map legacy bookingStatus → allocation domain (documentation + read adapters) */
export function mapLegacyBookingStatusToAllocation(
  bookingStatus: string
): VenueAllocationRequestStatus | "UNKNOWN" {
  switch (bookingStatus) {
    case "REQUESTED":
      return "REQUESTED";
    case "APPROVED":
      return "ALLOCATED";
    case "REJECTED":
      return "NOT_ALLOCATED";
    case "CANCELLED":
      return "WITHDRAWN";
    default:
      return "UNKNOWN";
  }
}
