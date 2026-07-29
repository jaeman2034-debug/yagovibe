/**
 * PR4 Sprint C — Kakao AlimTalk provider (Functions).
 * Stub when not enabled/configured; Live Solapi BizMessage when ready.
 */

import { createHmac, randomBytes } from "node:crypto";
import { logger } from "firebase-functions";
import {
  ALIMTALK_TEMPLATE_REGISTRY,
  resolveAlimTalkTemplateCode,
  type AlimTalkTemplateId,
} from "./alimtalkTemplates";

export type KakaoAlimTalkSendInput = {
  recipientPhone: string;
  templateCode?: string;
  templateId?: AlimTalkTemplateId;
  templateVariables: Record<string, string>;
  buttons?: Array<{ name: string; urlMobile?: string; urlPc?: string }>;
  notificationId?: string;
  federationSlug?: string;
};

export type KakaoAlimTalkSendResult = {
  providerMessageId: string | null;
  requestId: string | null;
  status: "queued" | "sent" | "failed";
  error?: { code: string; message: string };
  provider: "kakao";
  templateCode: string;
  dryRun: boolean;
  httpStatus?: number | null;
  sentAt?: string;
  completedAt?: string;
};

export interface KakaoAlimTalkProvider {
  readonly isStub: boolean;
  readonly displayName: string;
  sendAlimTalk(input: KakaoAlimTalkSendInput): Promise<KakaoAlimTalkSendResult>;
}

function truthy(v: string | undefined): boolean {
  const s = String(v || "").trim().toLowerCase();
  return s === "1" || s === "true" || s === "yes";
}

function toLocalPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("82") && digits.length >= 10) return `0${digits.slice(2)}`;
  if (digits.startsWith("0")) return digits;
  return digits;
}

function buildSolapiAuthorization(apiKey: string, apiSecret: string): string {
  const date = new Date().toISOString();
  const salt = randomBytes(16).toString("hex");
  const signature = createHmac("sha256", apiSecret).update(date + salt).digest("hex");
  return `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signature}`;
}

function readLiveKakaoConfig(): {
  apiKey: string;
  apiSecret: string;
  senderKey: string;
  sender: string;
  apiUrl: string;
} | null {
  if (!truthy(process.env.KAKAO_ALIMTALK_ENABLED)) return null;
  const senderKey = String(
    process.env.KAKAO_SENDER_KEY || process.env.SOLAPI_PFID || ""
  ).trim();
  const apiKey = String(
    process.env.KAKAO_API_KEY || process.env.SOLAPI_API_KEY || ""
  ).trim();
  const apiSecret = String(
    process.env.KAKAO_API_SECRET || process.env.SOLAPI_API_SECRET || ""
  ).trim();
  const sender = String(
    process.env.KAKAO_SENDER_NUMBER ||
      process.env.SOLAPI_SENDER ||
      process.env.SOLAPI_FROM ||
      ""
  ).trim();
  if (!senderKey || !apiKey || !apiSecret || !sender) return null;
  return {
    apiKey,
    apiSecret,
    senderKey,
    sender,
    apiUrl:
      String(process.env.KAKAO_ALIMTALK_API_URL || "").trim() ||
      "https://api.solapi.com/messages/v4/send-many/detail",
  };
}

export function isKakaoLiveConfigured(): boolean {
  return readLiveKakaoConfig() != null;
}

export class KakaoAlimTalkProviderStub implements KakaoAlimTalkProvider {
  readonly isStub = true;
  readonly displayName = "Kakao AlimTalk (Stub)";

  async sendAlimTalk(
    input: KakaoAlimTalkSendInput
  ): Promise<KakaoAlimTalkSendResult> {
    const phone = toLocalPhone(String(input.recipientPhone || ""));
    const templateId = input.templateId || "RESERVATION_APPROVED";
    const templateCode =
      (input.templateCode && input.templateCode.trim()) ||
      resolveAlimTalkTemplateCode(templateId);
    const now = new Date().toISOString();
    if (!phone) {
      return {
        providerMessageId: null,
        requestId: null,
        status: "failed",
        error: { code: "MISSING_PHONE", message: "수신 전화번호가 없습니다." },
        provider: "kakao",
        templateCode,
        dryRun: true,
        sentAt: now,
        completedAt: now,
      };
    }
    void input.templateVariables;
    void ALIMTALK_TEMPLATE_REGISTRY;
    return {
      providerMessageId: `kakao_stub_${Date.now()}_${phone.slice(-4)}`,
      requestId: `req_stub_${Date.now()}`,
      status: "queued",
      provider: "kakao",
      templateCode,
      dryRun: true,
      sentAt: now,
      completedAt: now,
    };
  }
}

/**
 * Live: Solapi Kakao Options (pfId = SenderKey, templateId = TemplateCode).
 */
export class KakaoAlimTalkProviderLive implements KakaoAlimTalkProvider {
  readonly isStub = false;
  readonly displayName = "Kakao AlimTalk (Live)";

  async sendAlimTalk(
    input: KakaoAlimTalkSendInput
  ): Promise<KakaoAlimTalkSendResult> {
    const cfg = readLiveKakaoConfig();
    const templateId = input.templateId || "RESERVATION_APPROVED";
    const templateCode =
      (input.templateCode && input.templateCode.trim()) ||
      resolveAlimTalkTemplateCode(templateId);
    const sentAt = new Date().toISOString();

    if (!cfg) {
      return {
        providerMessageId: null,
        requestId: null,
        status: "failed",
        error: {
          code: "KAKAO_NOT_CONFIGURED",
          message: "KAKAO_ALIMTALK_ENABLED + SenderKey/API credentials required",
        },
        provider: "kakao",
        templateCode,
        dryRun: false,
        sentAt,
        completedAt: new Date().toISOString(),
      };
    }

    if (!templateCode || templateCode === "PENDING") {
      return {
        providerMessageId: null,
        requestId: null,
        status: "failed",
        error: {
          code: "TEMPLATE_PENDING",
          message: `Template code not approved for ${templateId}`,
        },
        provider: "kakao",
        templateCode: templateCode || "PENDING",
        dryRun: false,
        sentAt,
        completedAt: new Date().toISOString(),
      };
    }

    const to = toLocalPhone(String(input.recipientPhone || ""));
    if (!/^01\d{8,9}$/.test(to)) {
      return {
        providerMessageId: null,
        requestId: null,
        status: "failed",
        error: { code: "PHONE_INVALID", message: "유효하지 않은 전화번호입니다." },
        provider: "kakao",
        templateCode,
        dryRun: false,
        sentAt,
        completedAt: new Date().toISOString(),
      };
    }

    const variables: Record<string, string> = {};
    for (const [k, v] of Object.entries(input.templateVariables || {})) {
      const key = k.startsWith("#{") ? k : `#{${k}}`;
      variables[key] = String(v ?? "");
    }

    const body = {
      messages: [
        {
          to,
          from: cfg.sender,
          kakaoOptions: {
            pfId: cfg.senderKey,
            templateId: templateCode,
            variables,
            disableSms: true,
          },
        },
      ],
    };

    try {
      const authorization = buildSolapiAuthorization(cfg.apiKey, cfg.apiSecret);
      const res = await fetch(cfg.apiUrl, {
        method: "POST",
        headers: {
          Authorization: authorization,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      const json = (await res.json().catch(() => ({}))) as {
        groupId?: string;
        messageId?: string;
        errorCode?: string;
        errorMessage?: string;
        failedMessageList?: Array<{ statusMessage?: string }>;
      };
      const completedAt = new Date().toISOString();

      if (!res.ok) {
        const err =
          json.errorMessage ||
          json.failedMessageList?.[0]?.statusMessage ||
          `kakao_http_${res.status}`;
        logger.warn("[KakaoAlimTalkLive] send failed", {
          status: res.status,
          err,
          templateCode,
          toLast4: to.slice(-4),
        });
        return {
          providerMessageId: null,
          requestId: json.groupId || null,
          status: "failed",
          error: {
            code: json.errorCode || `HTTP_${res.status}`,
            message: err,
          },
          provider: "kakao",
          templateCode,
          dryRun: false,
          httpStatus: res.status,
          sentAt,
          completedAt,
        };
      }

      const providerMessageId =
        json.messageId || json.groupId || `kakao_${Date.now()}`;
      logger.info("[KakaoAlimTalkLive] sent", {
        providerMessageId,
        templateCode,
        toLast4: to.slice(-4),
        notificationId: input.notificationId || null,
      });
      return {
        providerMessageId,
        requestId: json.groupId || providerMessageId,
        status: "sent",
        provider: "kakao",
        templateCode,
        dryRun: false,
        httpStatus: res.status,
        sentAt,
        completedAt,
      };
    } catch (e) {
      const message = e instanceof Error ? e.message : "kakao_send_failed";
      return {
        providerMessageId: null,
        requestId: null,
        status: "failed",
        error: { code: "KAKAO_EXCEPTION", message },
        provider: "kakao",
        templateCode,
        dryRun: false,
        sentAt,
        completedAt: new Date().toISOString(),
      };
    }
  }
}

export async function sendAlimTalk(
  input: KakaoAlimTalkSendInput,
  provider?: KakaoAlimTalkProvider
): Promise<KakaoAlimTalkSendResult> {
  const p = provider || createKakaoAlimTalkProviderFromEnv();
  return p.sendAlimTalk(input);
}

export function createKakaoAlimTalkProviderFromEnv(): KakaoAlimTalkProvider {
  if (isKakaoLiveConfigured()) return new KakaoAlimTalkProviderLive();
  return new KakaoAlimTalkProviderStub();
}
