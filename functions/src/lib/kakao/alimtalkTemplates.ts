/**
 * PR4 Sprint B prep — AlimTalk templates (Functions; sync with client registry).
 */

export type AlimTalkTemplateId =
  | "RESERVATION_COMPLETE"
  | "PAYMENT_REQUEST"
  | "RESERVATION_CANCELLED"
  | "AI_REPORT_READY";

export const ALIMTALK_TEMPLATE_REGISTRY: Record<
  AlimTalkTemplateId,
  {
    id: AlimTalkTemplateId;
    templateName: string;
    templateCode: string;
    templateCodeEnvKey: string;
    placeholders: string[];
  }
> = {
  RESERVATION_COMPLETE: {
    id: "RESERVATION_COMPLETE",
    templateName: "예약완료",
    templateCode: "PENDING",
    templateCodeEnvKey: "KAKAO_TEMPLATE_RESERVATION",
    placeholders: ["venue", "date", "time", "team", "link"],
  },
  PAYMENT_REQUEST: {
    id: "PAYMENT_REQUEST",
    templateName: "결제요청",
    templateCode: "PENDING",
    templateCodeEnvKey: "KAKAO_TEMPLATE_PAYMENT",
    placeholders: ["price", "deadline", "link"],
  },
  RESERVATION_CANCELLED: {
    id: "RESERVATION_CANCELLED",
    templateName: "예약취소",
    templateCode: "PENDING",
    templateCodeEnvKey: "KAKAO_TEMPLATE_CANCEL",
    placeholders: ["contact"],
  },
  AI_REPORT_READY: {
    id: "AI_REPORT_READY",
    templateName: "AI분석완료",
    templateCode: "PENDING",
    templateCodeEnvKey: "KAKAO_TEMPLATE_AI_REPORT",
    placeholders: ["name", "link"],
  },
};

export function resolveAlimTalkTemplateCode(id: AlimTalkTemplateId): string {
  const def = ALIMTALK_TEMPLATE_REGISTRY[id];
  const v = String(process.env[def.templateCodeEnvKey] || "").trim();
  return v || def.templateCode;
}
