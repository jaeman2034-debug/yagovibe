/**
 * PR4 Sprint B prep — Kakao AlimTalk template registry.
 * templateCode stays "PENDING" until Biz approval registers real codes.
 * Channel: YAGO SPORTS · search id yagovibe
 */

export type AlimTalkTemplateId =
  | "RESERVATION_COMPLETE"
  | "PAYMENT_REQUEST"
  | "RESERVATION_CANCELLED"
  | "AI_REPORT_READY";

export type AlimTalkTemplateDef = {
  id: AlimTalkTemplateId;
  templateName: string;
  /** Always PENDING until approval fills env */
  templateCode: string;
  /** Env key for approved code (empty until approval) */
  templateCodeEnvKey: string;
  description: string;
  placeholders: string[];
  bodyPreview: string;
};

export const ALIMTALK_TEMPLATE_REGISTRY: Record<
  AlimTalkTemplateId,
  AlimTalkTemplateDef
> = {
  RESERVATION_COMPLETE: {
    id: "RESERVATION_COMPLETE",
    templateName: "예약완료",
    templateCode: "PENDING",
    templateCodeEnvKey: "KAKAO_TEMPLATE_RESERVATION",
    description: "구장 예약 배정/완료 안내",
    placeholders: ["venue", "date", "time", "team", "link"],
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
    templateName: "결제요청",
    templateCode: "PENDING",
    templateCodeEnvKey: "KAKAO_TEMPLATE_PAYMENT",
    description: "예약 승인 후 결제/입금 요청",
    placeholders: ["price", "deadline", "link"],
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
    templateName: "예약취소",
    templateCode: "PENDING",
    templateCodeEnvKey: "KAKAO_TEMPLATE_CANCEL",
    description: "예약 취소 안내",
    placeholders: ["contact"],
    bodyPreview: [
      "[YAGO SPORTS]",
      "",
      "예약이 취소되었습니다.",
      "",
      "문의 :",
      "{contact}",
    ].join("\n"),
  },
  AI_REPORT_READY: {
    id: "AI_REPORT_READY",
    templateName: "AI분석완료",
    templateCode: "PENDING",
    templateCodeEnvKey: "KAKAO_TEMPLATE_AI_REPORT",
    description: "AI 분석 리포트 준비 완료",
    placeholders: ["name", "link"],
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

export function listAlimTalkTemplates(): AlimTalkTemplateDef[] {
  return Object.values(ALIMTALK_TEMPLATE_REGISTRY);
}

export function renderAlimTalkPreview(
  id: AlimTalkTemplateId,
  vars: Record<string, string>
): string {
  let out = ALIMTALK_TEMPLATE_REGISTRY[id].bodyPreview;
  for (const [k, v] of Object.entries(vars)) {
    out = out.split(`{${k}}`).join(v);
  }
  return out;
}

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

/** Resolve approved code from env map; falls back to PENDING */
export function resolveTemplateCodeFromEnv(
  id: AlimTalkTemplateId,
  env: Record<string, string | undefined> = {}
): string {
  const def = ALIMTALK_TEMPLATE_REGISTRY[id];
  const fromEnv = String(env[def.templateCodeEnvKey] || "").trim();
  return fromEnv || def.templateCode;
}
