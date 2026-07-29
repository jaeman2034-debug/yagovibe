/**
 * PR4 Sprint C — Kakao templates (Functions). Sprint C env keys + legacy aliases.
 */

export type AlimTalkTemplateId =
  | "RESERVATION_REQUEST"
  | "RESERVATION_APPROVED"
  | "PAYMENT_REQUEST"
  | "PAYMENT_CONFIRMED"
  | "RESERVATION_CANCELLED"
  | "RESERVATION_REMINDER"
  | "MATCH_REMINDER"
  | "AI_REPORT_READY"
  | "NOTICE"
  | "WELCOME"
  | "RESERVATION_COMPLETE";

type Def = {
  id: AlimTalkTemplateId;
  displayName: string;
  templateCode: string;
  /** Primary Sprint C env key */
  templateCodeEnvKey: string;
  /** Sprint B / legacy aliases */
  templateCodeEnvAliases?: string[];
  variables: string[];
};

export const ALIMTALK_TEMPLATE_REGISTRY: Record<AlimTalkTemplateId, Def> = {
  RESERVATION_REQUEST: {
    id: "RESERVATION_REQUEST",
    displayName: "예약 신청 완료",
    templateCode: "PENDING",
    templateCodeEnvKey: "KAKAO_TEMPLATE_RESERVATION_REQUEST",
    variables: ["team", "venue", "date", "time", "reservationNo", "reservationUrl"],
  },
  RESERVATION_APPROVED: {
    id: "RESERVATION_APPROVED",
    displayName: "예약 승인 / 결제 요청",
    templateCode: "PENDING",
    templateCodeEnvKey: "KAKAO_TEMPLATE_RESERVATION_APPROVED",
    templateCodeEnvAliases: ["KAKAO_TEMPLATE_RESERVATION"],
    variables: ["team", "venue", "date", "time", "price", "deadline", "reservationUrl"],
  },
  PAYMENT_REQUEST: {
    id: "PAYMENT_REQUEST",
    displayName: "결제 요청",
    templateCode: "PENDING",
    templateCodeEnvKey: "KAKAO_TEMPLATE_PAYMENT_REQUEST",
    templateCodeEnvAliases: ["KAKAO_TEMPLATE_PAYMENT"],
    variables: ["team", "venue", "date", "price", "deadline", "reservationUrl"],
  },
  PAYMENT_CONFIRMED: {
    id: "PAYMENT_CONFIRMED",
    displayName: "입금 확인",
    templateCode: "PENDING",
    templateCodeEnvKey: "KAKAO_TEMPLATE_PAYMENT_CONFIRMED",
    variables: ["team", "venue", "date", "time", "reservationUrl"],
  },
  RESERVATION_CANCELLED: {
    id: "RESERVATION_CANCELLED",
    displayName: "예약 취소",
    templateCode: "PENDING",
    templateCodeEnvKey: "KAKAO_TEMPLATE_RESERVATION_CANCELLED",
    templateCodeEnvAliases: ["KAKAO_TEMPLATE_CANCEL"],
    variables: ["team", "venue", "date", "time", "reservationNo"],
  },
  RESERVATION_REMINDER: {
    id: "RESERVATION_REMINDER",
    displayName: "예약 리마인더",
    templateCode: "PENDING",
    templateCodeEnvKey: "KAKAO_TEMPLATE_RESERVATION_REMINDER",
    variables: ["team", "venue", "date", "time", "reservationUrl"],
  },
  MATCH_REMINDER: {
    id: "MATCH_REMINDER",
    displayName: "경기 리마인더",
    templateCode: "PENDING",
    templateCodeEnvKey: "KAKAO_TEMPLATE_MATCH_REMINDER",
    variables: ["team", "venue", "date", "time", "coach"],
  },
  AI_REPORT_READY: {
    id: "AI_REPORT_READY",
    displayName: "AI 분석 완료",
    templateCode: "PENDING",
    templateCodeEnvKey: "KAKAO_TEMPLATE_AI_REPORT_READY",
    templateCodeEnvAliases: ["KAKAO_TEMPLATE_AI_REPORT"],
    variables: ["player", "reportUrl"],
  },
  NOTICE: {
    id: "NOTICE",
    displayName: "공지",
    templateCode: "PENDING",
    templateCodeEnvKey: "KAKAO_TEMPLATE_NOTICE",
    variables: ["noticeTitle", "noticeUrl"],
  },
  WELCOME: {
    id: "WELCOME",
    displayName: "환영",
    templateCode: "PENDING",
    templateCodeEnvKey: "KAKAO_TEMPLATE_WELCOME",
    variables: ["team"],
  },
  RESERVATION_COMPLETE: {
    id: "RESERVATION_COMPLETE",
    displayName: "예약 승인(레거시)",
    templateCode: "PENDING",
    templateCodeEnvKey: "KAKAO_TEMPLATE_RESERVATION",
    templateCodeEnvAliases: ["KAKAO_TEMPLATE_RESERVATION_APPROVED"],
    variables: ["team", "venue", "date", "time", "price", "deadline", "reservationUrl"],
  },
};

export function resolveAlimTalkTemplateCode(id: AlimTalkTemplateId): string {
  const def = ALIMTALK_TEMPLATE_REGISTRY[id];
  const keys = [def.templateCodeEnvKey, ...(def.templateCodeEnvAliases || [])];
  for (const k of keys) {
    const v = String(process.env[k] || "").trim();
    if (v) return v;
  }
  return def.templateCode;
}

export function listAlimTalkTemplates() {
  return Object.values(ALIMTALK_TEMPLATE_REGISTRY).filter(
    (t) => t.id !== "RESERVATION_COMPLETE"
  );
}

export function mapVenueKeyToAlimTalkId(
  venueTemplateKey: string
): AlimTalkTemplateId | null {
  switch (venueTemplateKey) {
    case "RESERVATION_ASSIGNED":
      return "RESERVATION_APPROVED";
    case "RESERVATION_CONFIRMED":
      return "PAYMENT_CONFIRMED";
    case "PAYMENT_APPROVED":
    case "PAYMENT_CONFIRMED":
      return "PAYMENT_CONFIRMED";
    case "PAYMENT_GUIDE":
    case "PAYMENT_RECEIVED":
      return "PAYMENT_REQUEST";
    case "RESERVATION_CANCELLED":
      return "RESERVATION_CANCELLED";
    case "AI_REPORT_READY":
    case "GROWTH_REPORT_DELIVERED":
      return "AI_REPORT_READY";
    default:
      return null;
  }
}
