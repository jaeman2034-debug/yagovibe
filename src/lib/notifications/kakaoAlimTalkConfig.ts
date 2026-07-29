/**
 * PR4 Sprint B prep — Kakao config / approval status (no secrets required).
 */

import {
  ALIMTALK_TEMPLATE_REGISTRY,
  listAlimTalkTemplates,
  resolveTemplateCodeFromEnv,
} from "@/lib/notifications/alimtalkTemplates";

export type EnvMap = Record<string, string | undefined>;

export type KakaoAlimTalkConfigStatus = {
  approvalStatus: "Pending" | "Ready";
  enabled: boolean;
  hasChannelId: boolean;
  hasSenderKey: boolean;
  hasApiKey: boolean;
  channelIdMasked: string | null;
  senderKeyPresent: boolean;
  templates: Array<{
    id: string;
    templateName: string;
    templateCode: string;
    placeholders: string[];
    description: string;
  }>;
  pendingTemplateCount: number;
};

function truthy(v: string | undefined): boolean {
  const s = String(v || "").trim().toLowerCase();
  return s === "1" || s === "true" || s === "yes";
}

function maskId(raw: string): string {
  const s = raw.trim();
  if (s.length <= 4) return "****";
  return `${s.slice(0, 2)}***${s.slice(-2)}`;
}

export function getKakaoAlimTalkConfigStatus(
  env: EnvMap = {}
): KakaoAlimTalkConfigStatus {
  const channelId = String(env.KAKAO_CHANNEL_ID || "").trim();
  const senderKey = String(env.KAKAO_SENDER_KEY || "").trim();
  const apiKey = String(env.KAKAO_API_KEY || "").trim();
  const enabled = truthy(env.KAKAO_ALIMTALK_ENABLED);

  const templates = listAlimTalkTemplates().map((t) => ({
    id: t.id,
    templateName: t.templateName,
    templateCode: resolveTemplateCodeFromEnv(t.id, env),
    placeholders: t.placeholders,
    description: t.description,
  }));

  const pendingTemplateCount = templates.filter(
    (t) => !t.templateCode || t.templateCode === "PENDING"
  ).length;

  const ready =
    enabled &&
    !!channelId &&
    !!senderKey &&
    !!apiKey &&
    pendingTemplateCount === 0;

  return {
    approvalStatus: ready ? "Ready" : "Pending",
    enabled,
    hasChannelId: !!channelId,
    hasSenderKey: !!senderKey,
    hasApiKey: !!apiKey,
    channelIdMasked: channelId ? maskId(channelId) : null,
    senderKeyPresent: !!senderKey,
    templates,
    pendingTemplateCount,
  };
}

export function buildKakaoAuditFields(input: {
  templateCode: string;
  providerMessageId: string | null;
  senderKeyPresent: boolean;
}): Record<string, unknown> {
  return {
    provider: "kakao",
    templateCode: input.templateCode || "PENDING",
    senderKey: input.senderKeyPresent ? "[SET]" : "[PENDING]",
    providerMessageId: input.providerMessageId,
  };
}

export function emptyKakaoEnvPlaceholders(): EnvMap {
  return {
    KAKAO_CHANNEL_ID: "",
    KAKAO_SENDER_KEY: "",
    KAKAO_API_KEY: "",
    KAKAO_TEMPLATE_RESERVATION: "",
    KAKAO_TEMPLATE_PAYMENT: "",
    KAKAO_TEMPLATE_CANCEL: "",
    KAKAO_TEMPLATE_AI_REPORT: "",
    KAKAO_ALIMTALK_ENABLED: "",
    NOTIFICATION_PROVIDER: "auto",
  };
}

void ALIMTALK_TEMPLATE_REGISTRY;
