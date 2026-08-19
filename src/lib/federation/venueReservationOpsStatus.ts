/**
 * Sprint 2-2 — Unified 3-axis ops labels for venue reservations.
 * SoT signals: docs/YAGO_NOWON_VENUE_PAYMENT_SIGNAL_AND_CONFIRM_DESIGN.md §2.3
 *
 * Axes (never collapse to a single linear enum):
 *   paymentStatus × paymentClaimStatus × confirmStatus
 */

export type VenueOpsStage = "UNPAID" | "CLAIMED" | "PAYMENT_CONFIRMED" | "FINALIZED";

export type VenueOpsStatusInput = {
  paymentStatus?: "UNCONFIRMED" | "CONFIRMED" | string | null;
  paymentClaimStatus?: "NONE" | "REQUESTED" | string | null;
  confirmStatus?: "PENDING_PAYMENT" | "FINALIZED" | string | null;
};

export type VenueOpsStatus = {
  stage: VenueOpsStage;
  /** Admin board / badge key */
  badgeKey: VenueOpsStage;
  /** Short admin list copy (with emoji per PS design) */
  adminLabel: string;
  /** Member-facing status line */
  memberLabel: string;
  /** One-line helper under member status */
  memberHint: string;
};

const STAGE_COPY: Record<VenueOpsStage, Omit<VenueOpsStatus, "stage" | "badgeKey">> = {
  UNPAID: {
    adminLabel: "🔴 미입금",
    memberLabel: "미입금",
    memberHint: "계좌 이체 후 영수증을 올리거나 입금 확인을 요청해 주세요.",
  },
  CLAIMED: {
    adminLabel: "🟠 입금 확인 요청",
    memberLabel: "입금 확인 요청됨 (협회 확인 대기)",
    memberHint: "신고만 접수된 상태입니다. 협회가 통장을 확인하기 전까지 입금 완료가 아닙니다.",
  },
  PAYMENT_CONFIRMED: {
    adminLabel: "🟢 입금 완료",
    memberLabel: "입금 완료 (확정 대기)",
    memberHint: "입금이 확인되었습니다. 협회가 예약을 최종 확정하면 완료됩니다.",
  },
  FINALIZED: {
    adminLabel: "✅ 예약 확정",
    memberLabel: "예약 확정",
    memberHint: "예약이 최종 확정되었습니다.",
  },
};

/**
 * Resolve ops stage from 3-axis fields.
 * Priority: FINALIZED > PAYMENT_CONFIRMED > CLAIMED > UNPAID
 */
export function resolveVenueOpsStage(input: VenueOpsStatusInput): VenueOpsStage {
  if (input.confirmStatus === "FINALIZED") return "FINALIZED";
  if (input.paymentStatus === "CONFIRMED") return "PAYMENT_CONFIRMED";
  if (input.paymentClaimStatus === "REQUESTED" && input.paymentStatus !== "CONFIRMED") {
    return "CLAIMED";
  }
  return "UNPAID";
}

export function resolveVenueOpsStatus(input: VenueOpsStatusInput): VenueOpsStatus {
  const stage = resolveVenueOpsStage(input);
  const copy = STAGE_COPY[stage];
  return {
    stage,
    badgeKey: stage,
    ...copy,
  };
}

/** Timeline steps for member/admin detail (display only). */
export type VenueOpsTimelineStep = {
  id: "allocated" | "claimed" | "payment_confirmed" | "finalized";
  label: string;
  done: boolean;
  current: boolean;
};

export function buildVenueOpsTimeline(input: VenueOpsStatusInput): VenueOpsTimelineStep[] {
  const stage = resolveVenueOpsStage(input);
  const claimed =
    input.paymentClaimStatus === "REQUESTED" ||
    stage === "CLAIMED" ||
    stage === "PAYMENT_CONFIRMED" ||
    stage === "FINALIZED";
  const paymentConfirmed = stage === "PAYMENT_CONFIRMED" || stage === "FINALIZED";
  const finalized = stage === "FINALIZED";

  const currentId: VenueOpsTimelineStep["id"] =
    stage === "FINALIZED"
      ? "finalized"
      : stage === "PAYMENT_CONFIRMED"
        ? "payment_confirmed"
        : stage === "CLAIMED"
          ? "claimed"
          : "allocated";

  return [
    { id: "allocated", label: "배정", done: true, current: currentId === "allocated" },
    {
      id: "claimed",
      label: "입금 확인 요청",
      done: claimed,
      current: currentId === "claimed",
    },
    {
      id: "payment_confirmed",
      label: "입금 확인",
      done: paymentConfirmed,
      current: currentId === "payment_confirmed",
    },
    {
      id: "finalized",
      label: "예약 확정",
      done: finalized,
      current: currentId === "finalized",
    },
  ];
}

/** Admin action enablement (display/helper — services remain SoT for writes). */
export function venueOpsAdminActions(input: VenueOpsStatusInput): {
  canConfirmPayment: boolean;
  canUnconfirmPayment: boolean;
  canFinalize: boolean;
  confirmPaymentDisabledReason: string | null;
  finalizeDisabledReason: string | null;
} {
  const stage = resolveVenueOpsStage(input);
  const finalized = stage === "FINALIZED";
  const confirmed = stage === "PAYMENT_CONFIRMED" || finalized;

  return {
    canConfirmPayment: !finalized && !confirmed,
    canUnconfirmPayment: stage === "PAYMENT_CONFIRMED",
    canFinalize: stage === "PAYMENT_CONFIRMED",
    confirmPaymentDisabledReason: finalized
      ? "예약이 이미 확정되었습니다. 먼저 확정 취소를 하세요."
      : confirmed
        ? "이미 입금 확인된 예약입니다."
        : null,
    finalizeDisabledReason: finalized
      ? "이미 예약 확정된 상태입니다."
      : stage !== "PAYMENT_CONFIRMED"
        ? "입금 확인 후에만 예약 확정할 수 있습니다."
        : null,
  };
}
