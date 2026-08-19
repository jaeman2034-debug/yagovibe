/**
 * PR4 — Venue notification templates (canonical keys).
 * Allocate must ONLY use RESERVATION_ASSIGNED — never PAYMENT_* templates.
 * SMS compact copy: `@/lib/notifications/smsTemplates` (PR4-3 prep).
 */

export type VenueNotifyTemplateKey =
  | "RESERVATION_ASSIGNED"
  | "PAYMENT_RECEIVED"
  | "PAYMENT_APPROVED"
  | "RESERVATION_CONFIRMED";

export const VENUE_NOTIFY_TEMPLATE = {
  RESERVATION_ASSIGNED: "RESERVATION_ASSIGNED",
  PAYMENT_RECEIVED: "PAYMENT_RECEIVED",
  PAYMENT_APPROVED: "PAYMENT_APPROVED",
  RESERVATION_CONFIRMED: "RESERVATION_CONFIRMED",
} as const satisfies Record<VenueNotifyTemplateKey, VenueNotifyTemplateKey>;

export type ReservationAssignedTemplateInput = {
  federationName?: string;
  teamName?: string;
  venueName: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  totalAmount: number;
  paymentDeadlineLabel?: string;
  bankAccountGuide: string;
  shortReservationCode: string;
  detailPath: string;
};

/** PR4-1.2 — identical body for 회장·총무·감독 */
export function buildReservationAssignedTemplate(
  input: ReservationAssignedTemplateInput
): {
  templateKey: typeof VENUE_NOTIFY_TEMPLATE.RESERVATION_ASSIGNED;
  title: string;
  message: string;
  body: string;
  link: string;
} {
  const fed = input.federationName?.trim() || "노원구축구협회";
  const team = input.teamName?.trim() || "팀";
  const amountLabel =
    Number.isFinite(input.totalAmount) && input.totalAmount > 0
      ? `${input.totalAmount.toLocaleString("ko-KR")}원`
      : "협회 안내";
  const body = [
    `[${fed}]`,
    "",
    `${team} 구장 예약이 배정되었습니다.`,
    "",
    "구장",
    input.venueName,
    "",
    "날짜",
    input.bookingDate,
    "",
    "시간",
    `${input.startTime}~${input.endTime}`,
    "",
    "사용료",
    amountLabel,
    "",
    "입금계좌",
    input.bankAccountGuide,
    "",
    "예약번호",
    input.shortReservationCode,
    "",
    "입금 후",
    "",
    "야고 앱에서",
    "",
    "[영수증 올리고 입금 확인 요청]",
    "",
    "버튼을 눌러",
    "",
    "영수증을 등록해 주세요.",
    "",
    "(신고 ≠ 입금 완료)",
  ].join("\n");

  return {
    templateKey: VENUE_NOTIFY_TEMPLATE.RESERVATION_ASSIGNED,
    title: "예약 배정 안내",
    message: `${team} · ${input.venueName} · ${input.bookingDate} ${input.startTime}~${input.endTime}`,
    body,
    link: input.detailPath,
  };
}

export function buildPaymentApprovedTemplate(input: {
  shortReservationCode: string;
  venueName: string;
  bookingDate: string;
}): { templateKey: typeof VENUE_NOTIFY_TEMPLATE.PAYMENT_APPROVED; title: string; message: string; body: string } {
  return {
    templateKey: VENUE_NOTIFY_TEMPLATE.PAYMENT_APPROVED,
    title: "입금 확인 완료",
    message: `예약번호 ${input.shortReservationCode} · ${input.venueName} ${input.bookingDate}`,
    body: "협회에서 입금을 확인했습니다.",
  };
}

export function buildReservationConfirmedTemplate(input: {
  shortReservationCode: string;
  venueName: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
}): {
  templateKey: typeof VENUE_NOTIFY_TEMPLATE.RESERVATION_CONFIRMED;
  title: string;
  message: string;
  body: string;
} {
  return {
    templateKey: VENUE_NOTIFY_TEMPLATE.RESERVATION_CONFIRMED,
    title: "예약이 최종 확정되었습니다",
    message: `예약번호 ${input.shortReservationCode} · ${input.venueName} ${input.bookingDate} ${input.startTime}–${input.endTime}`,
    body: "구장 이용이 확정되었습니다. 예약 상세에서 확인해 주세요.",
  };
}

export function buildPaymentReceivedTemplate(input: {
  teamName: string;
  venueName: string;
  bookingDate: string;
  shortReservationCode: string;
}): {
  templateKey: typeof VENUE_NOTIFY_TEMPLATE.PAYMENT_RECEIVED;
  title: string;
  message: string;
  body: string;
} {
  return {
    templateKey: VENUE_NOTIFY_TEMPLATE.PAYMENT_RECEIVED,
    title: "입금 확인 요청",
    message: `${input.teamName} · ${input.venueName} ${input.bookingDate}`,
    body: `예약번호 ${input.shortReservationCode}. 통장·영수증 확인 후 승인하세요.`,
  };
}
