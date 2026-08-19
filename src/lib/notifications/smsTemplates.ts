/**
 * PR4-3 prep — SMS body templates (venue ops).
 * Keep copy out of CF / provider send paths for federation-ready wording later.
 */

export type SmsTemplateKey =
  | "RESERVATION_ASSIGNED"
  | "PAYMENT_GUIDE"
  | "RESERVATION_CONFIRMED"
  | "RESERVATION_CANCELLED";

export const SMS_TEMPLATE_KEY = {
  RESERVATION_ASSIGNED: "RESERVATION_ASSIGNED",
  PAYMENT_GUIDE: "PAYMENT_GUIDE",
  RESERVATION_CONFIRMED: "RESERVATION_CONFIRMED",
  RESERVATION_CANCELLED: "RESERVATION_CANCELLED",
} as const satisfies Record<SmsTemplateKey, SmsTemplateKey>;

export type SmsTemplateVars = {
  federationName?: string;
  teamName?: string;
  venueName?: string;
  bookingDate?: string;
  startTime?: string;
  endTime?: string;
  totalAmount?: number;
  bankAccountGuide?: string;
  shortReservationCode?: string;
};

function amountLabel(n?: number): string {
  if (typeof n === "number" && Number.isFinite(n) && n > 0) {
    return `${n.toLocaleString("ko-KR")}원`;
  }
  return "협회 안내";
}

/** SMS-oriented (compact) reservation assigned body */
export function buildSmsReservationAssigned(vars: SmsTemplateVars): string {
  const fed = vars.federationName?.trim() || "노원구축구협회";
  const team = vars.teamName?.trim() || "팀";
  return [
    `[${fed}]`,
    `${team} 구장 예약이 배정되었습니다.`,
    `구장 ${vars.venueName || "-"}`,
    `날짜 ${vars.bookingDate || "-"}`,
    `시간 ${(vars.startTime || "-")}~${(vars.endTime || "-")}`,
    `사용료 ${amountLabel(vars.totalAmount)}`,
    `입금 ${vars.bankAccountGuide || "협회 안내 계좌"}`,
    `예약번호 ${vars.shortReservationCode || "-"}`,
    "입금 후 야고 앱에서 [영수증 올리고 입금 확인 요청]으로 등록해 주세요. (신고≠입금 완료)",
  ].join("\n");
}

export function buildSmsPaymentGuide(vars: SmsTemplateVars): string {
  const fed = vars.federationName?.trim() || "노원구축구협회";
  return [
    `[${fed}]`,
    "입금 안내입니다.",
    `예약번호 ${vars.shortReservationCode || "-"}`,
    `구장 ${vars.venueName || "-"} · ${vars.bookingDate || "-"}`,
    `입금 ${vars.bankAccountGuide || "협회 안내 계좌"}`,
    `금액 ${amountLabel(vars.totalAmount)}`,
  ].join("\n");
}

export function buildSmsReservationConfirmed(vars: SmsTemplateVars): string {
  const fed = vars.federationName?.trim() || "노원구축구협회";
  return [
    `[${fed}]`,
    "예약이 최종 확정되었습니다.",
    `예약번호 ${vars.shortReservationCode || "-"}`,
    `구장 ${vars.venueName || "-"}`,
    `일시 ${vars.bookingDate || "-"} ${(vars.startTime || "")}~${(vars.endTime || "")}`,
  ].join("\n");
}

export function buildSmsReservationCancelled(vars: SmsTemplateVars): string {
  const fed = vars.federationName?.trim() || "노원구축구협회";
  return [
    `[${fed}]`,
    "구장 예약이 취소되었습니다.",
    `예약번호 ${vars.shortReservationCode || "-"}`,
    `구장 ${vars.venueName || "-"} · ${vars.bookingDate || "-"}`,
  ].join("\n");
}

export function buildSmsBody(
  key: SmsTemplateKey | string,
  vars: SmsTemplateVars
): string {
  switch (key) {
    case SMS_TEMPLATE_KEY.RESERVATION_ASSIGNED:
      return buildSmsReservationAssigned(vars);
    case SMS_TEMPLATE_KEY.PAYMENT_GUIDE:
    case "PAYMENT_APPROVED":
    case "PAYMENT_RECEIVED":
      return buildSmsPaymentGuide(vars);
    case SMS_TEMPLATE_KEY.RESERVATION_CONFIRMED:
      return buildSmsReservationConfirmed(vars);
    case SMS_TEMPLATE_KEY.RESERVATION_CANCELLED:
      return buildSmsReservationCancelled(vars);
    default:
      return buildSmsReservationAssigned(vars);
  }
}
