/**
 * PR4-3 / Sprint C — Operations Center types.
 */

export type OpsDeliveryFilter =
  | "queued"
  | "sending"
  | "delivered"
  | "failed"
  | "retry"
  | "all";

export type OpsSmsStatus =
  | "queued"
  | "queued_sms_pending"
  | "sending"
  | "sms_sent"
  | "sms_failed"
  | "other";

export type OpsMessageKind =
  | "RESERVATION_ASSIGNED"
  | "PAYMENT_APPROVED"
  | "RESERVATION_CONFIRMED"
  | "AI_REPORT_READY"
  | "OTHER";

export type OpsCenterTabId =
  | "observability"
  | "reservations"
  | "sms-queue"
  | "history"
  | "failures"
  | "stats";

export type OpsNotificationRow = {
  id: string;
  createdAt: Date | null;
  sentAt: Date | null;
  completedAt: Date | null;
  teamName: string;
  teamId: string;
  teamKind: "platform" | "guest" | null;
  guestTeamId: string | null;
  recipientRole: string;
  recipientPhone: string | null;
  recipientUid: string | null;
  kind: OpsMessageKind;
  status: OpsSmsStatus;
  deliveryStatus: OpsDeliveryFilter | "other";
  rawStatus: string;
  provider: string | null;
  providerMessageId: string | null;
  requestId: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  retryCount: number;
  success: boolean | null;
  title: string;
  message: string;
  body: string;
  federationSlug: string | null;
  reservationId: string | null;
  shortReservationCode: string | null;
};

export type OpsReservationRow = {
  id: string;
  teamName: string;
  teamKind: "platform" | "guest" | null;
  venueName: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  confirmStatus: string;
  paymentStatus: string;
  paymentClaimStatus: string;
  shortReservationCode: string;
  createdAt: Date | null;
};

export type OpsDashboardStats = {
  todayTotal: number;
  todayQueued: number;
  todayPendingSms: number;
  todaySending: number;
  todaySent: number;
  todayFailed: number;
  todayRetry: number;
  monthTotal: number;
  monthSent: number;
  monthFailed: number;
  monthAssigned: number;
  monthConfirmed: number;
  monthPayment: number;
  successRate: number | null;
};
