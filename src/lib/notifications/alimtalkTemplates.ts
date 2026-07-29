/**
 * PR4 Sprint B prep — Kakao AlimTalk template registry.
 * Codes are placeholders until Kakao Business approval + template registration.
 * Channel search ID (ops): yagovibe · brand: YAGO SPORTS
 */

export type AlimTalkTemplateId =
  | "RESERVATION_COMPLETE"
  | "PAYMENT_REQUEST"
  | "RESERVATION_CANCELLED"
  | "AI_ANALYSIS_COMPLETE";

export type AlimTalkTemplateDef = {
  id: AlimTalkTemplateId;
  /** Kakao console template code — fill after approval */
  templateCodeEnvKey: string;
  /** Human label (ops) */
  labelKo: string;
  /** Preview body with {placeholders} — must match registered Kakao template */
  bodyPreview: string;
  requiredVars: string[];
};

export const ALIMTALK_TEMPLATE_REGISTRY: Record<
  AlimTalkTemplateId,
  AlimTalkTemplateDef
> = {
  RESERVATION_COMPLETE: {
    id: "RESERVATION_COMPLETE",
    templateCodeEnvKey: "KAKAO_TEMPLATE_CODE_RESERVATION_COMPLETE",
    labelKo: "예약 완료",
    requiredVars: ["venue", "date", "time", "team", "link"],
    bodyPreview: [
      "[YAGO SPORTS]",
      "",
      "예약이 완료되었습니다.",
      "",
      "구장 : {venue}",
      "",
      "날짜 : {date}",
      "",
      "시간 : {time}",
      "",
      "팀 : {team}",
      "",
      "확인하기",
      "{link}",
    ].join("\n"),
  },
  PAYMENT_REQUEST: {
    id: "PAYMENT_REQUEST",
    templateCodeEnvKey: "KAKAO_TEMPLATE_CODE_PAYMENT_REQUEST",
    labelKo: "결제 요청",
    requiredVars: ["price", "deadline", "link"],
    bodyPreview: [
      "[YAGO SPORTS]",
      "",
      "예약이 승인되었습니다.",
      "",
      "결제를 진행해 주세요.",
      "",
      "금액 : {price}",
      "",
      "마감 :",
      "{deadline}",
      "",
      "결제하기",
      "{link}",
    ].join("\n"),
  },
  RESERVATION_CANCELLED: {
    id: "RESERVATION_CANCELLED",
    templateCodeEnvKey: "KAKAO_TEMPLATE_CODE_RESERVATION_CANCELLED",
    labelKo: "예약 취소",
    requiredVars: ["contact"],
    bodyPreview: [
      "[YAGO SPORTS]",
      "",
      "예약이 취소되었습니다.",
      "",
      "문의 :",
      "{contact}",
    ].join("\n"),
  },
  AI_ANALYSIS_COMPLETE: {
    id: "AI_ANALYSIS_COMPLETE",
    templateCodeEnvKey: "KAKAO_TEMPLATE_CODE_AI_ANALYSIS_COMPLETE",
    labelKo: "AI 분석 완료",
    requiredVars: ["name", "link"],
    bodyPreview: [
      "[YAGO SPORTS]",
      "",
      "AI 분석이 완료되었습니다.",
      "",
      "선수 :",
      "{name}",
      "",
      "리포트 보기",
      "",
      "{link}",
    ].join("\n"),
  },
};

export function renderAlimTalkPreview(
  id: AlimTalkTemplateId,
  vars: Record<string, string>
): string {
  const def = ALIMTALK_TEMPLATE_REGISTRY[id];
  let out = def.bodyPreview;
  for (const [k, v] of Object.entries(vars)) {
    out = out.split(`{${k}}`).join(v);
  }
  return out;
}

/** Map venue notification template keys → AlimTalk template id (when wiring later) */
export function mapVenueKeyToAlimTalkId(
  venueTemplateKey: string
): AlimTalkTemplateId | null {
  switch (venueTemplateKey) {
    case "RESERVATION_ASSIGNED":
    case "RESERVATION_CONFIRMED":
      return "RESERVATION_COMPLETE";
    case "PAYMENT_RECEIVED":
    case "PAYMENT_APPROVED":
    case "PAYMENT_GUIDE":
      return "PAYMENT_REQUEST";
    case "RESERVATION_CANCELLED":
      return "RESERVATION_CANCELLED";
    default:
      return null;
  }
}
