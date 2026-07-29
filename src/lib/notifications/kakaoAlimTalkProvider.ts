/**
 * PR4 Sprint B prep — Kakao AlimTalk provider (stub only; no REST call).
 */

import {
  ALIMTALK_TEMPLATE_REGISTRY,
  resolveTemplateCodeFromEnv,
  type AlimTalkTemplateId,
  renderAlimTalkPreview,
} from "@/lib/notifications/alimtalkTemplates";

export type AlimTalkButton = {
  type?: string;
  name: string;
  urlMobile?: string;
  urlPc?: string;
};

export type KakaoAlimTalkSendInput = {
  recipientPhone: string;
  /** Approved code or PENDING placeholder */
  templateCode?: string;
  templateId?: AlimTalkTemplateId;
  templateVariables: Record<string, string>;
  buttons?: AlimTalkButton[];
  notificationId?: string;
  federationSlug?: string;
};

export type KakaoAlimTalkSendResult = {
  providerMessageId: string | null;
  /** Stub always returns queued — no live send */
  status: "queued" | "sent" | "failed";
  error?: { code: string; message: string };
  provider: "kakao";
  templateCode: string;
  templateId: AlimTalkTemplateId | null;
  dryRun: boolean;
  previewBody?: string;
};

export interface KakaoAlimTalkProvider {
  readonly isStub: boolean;
  readonly displayName: string;
  sendAlimTalk(input: KakaoAlimTalkSendInput): Promise<KakaoAlimTalkSendResult>;
}

function viteEnvMap(): Record<string, string | undefined> {
  // Avoid bare `import.meta` so Jest (CJS) can parse this module.
  try {
    // eslint-disable-next-line no-new-func
    const meta = new Function("return import.meta")() as {
      env?: Record<string, string | undefined>;
    };
    return meta?.env || {};
  } catch {
    return {};
  }
}

/**
 * Stub: no Kakao network. status=queued for queue compatibility.
 */
export class KakaoAlimTalkProviderStub implements KakaoAlimTalkProvider {
  readonly isStub = true;
  readonly displayName = "Kakao AlimTalk (Stub)";

  async sendAlimTalk(
    input: KakaoAlimTalkSendInput
  ): Promise<KakaoAlimTalkSendResult> {
    const phone = String(input.recipientPhone || "").replace(/\D/g, "");
    const templateId = input.templateId || "RESERVATION_APPROVED";
    const templateCode =
      (input.templateCode && input.templateCode.trim()) ||
      resolveTemplateCodeFromEnv(templateId, {
        KAKAO_TEMPLATE_RESERVATION: viteEnvMap().VITE_KAKAO_TEMPLATE_RESERVATION,
        KAKAO_TEMPLATE_RESERVATION_REQUEST:
          viteEnvMap().VITE_KAKAO_TEMPLATE_RESERVATION_REQUEST,
        KAKAO_TEMPLATE_RESERVATION_APPROVED:
          viteEnvMap().VITE_KAKAO_TEMPLATE_RESERVATION_APPROVED,
        KAKAO_TEMPLATE_PAYMENT: viteEnvMap().VITE_KAKAO_TEMPLATE_PAYMENT,
        KAKAO_TEMPLATE_PAYMENT_REQUEST:
          viteEnvMap().VITE_KAKAO_TEMPLATE_PAYMENT_REQUEST,
        KAKAO_TEMPLATE_PAYMENT_CONFIRMED:
          viteEnvMap().VITE_KAKAO_TEMPLATE_PAYMENT_CONFIRMED,
        KAKAO_TEMPLATE_CANCEL: viteEnvMap().VITE_KAKAO_TEMPLATE_CANCEL,
        KAKAO_TEMPLATE_RESERVATION_CANCELLED:
          viteEnvMap().VITE_KAKAO_TEMPLATE_RESERVATION_CANCELLED,
        KAKAO_TEMPLATE_RESERVATION_REMINDER:
          viteEnvMap().VITE_KAKAO_TEMPLATE_RESERVATION_REMINDER,
        KAKAO_TEMPLATE_MATCH_REMINDER:
          viteEnvMap().VITE_KAKAO_TEMPLATE_MATCH_REMINDER,
        KAKAO_TEMPLATE_AI_REPORT: viteEnvMap().VITE_KAKAO_TEMPLATE_AI_REPORT,
        KAKAO_TEMPLATE_AI_REPORT_READY:
          viteEnvMap().VITE_KAKAO_TEMPLATE_AI_REPORT_READY,
        KAKAO_TEMPLATE_NOTICE: viteEnvMap().VITE_KAKAO_TEMPLATE_NOTICE,
        KAKAO_TEMPLATE_WELCOME: viteEnvMap().VITE_KAKAO_TEMPLATE_WELCOME,
      });

    if (!phone) {
      return {
        providerMessageId: null,
        status: "failed",
        error: { code: "MISSING_PHONE", message: "수신 전화번호가 없습니다." },
        provider: "kakao",
        templateCode,
        templateId,
        dryRun: true,
      };
    }

    const previewBody = ALIMTALK_TEMPLATE_REGISTRY[templateId]
      ? renderAlimTalkPreview(templateId, input.templateVariables || {})
      : "";

    return {
      providerMessageId: `kakao_stub_${Date.now()}_${phone.slice(-4)}`,
      status: "queued",
      provider: "kakao",
      templateCode,
      templateId,
      dryRun: true,
      previewBody,
    };
  }
}

/** Named export matching product brief */
export async function sendAlimTalk(
  input: KakaoAlimTalkSendInput,
  provider: KakaoAlimTalkProvider = new KakaoAlimTalkProviderStub()
): Promise<KakaoAlimTalkSendResult> {
  return provider.sendAlimTalk(input);
}

/** @deprecated use KakaoAlimTalkProviderStub */
export class KakaoAlimTalkProviderClientPlaceholder extends KakaoAlimTalkProviderStub {
  readonly isStub = false;
  readonly displayName = "Kakao AlimTalk (CF placeholder)";

  async sendAlimTalk(
    input: KakaoAlimTalkSendInput
  ): Promise<KakaoAlimTalkSendResult> {
    const base = await super.sendAlimTalk(input);
    if (base.status === "failed") return base;
    return {
      ...base,
      status: "queued",
      error: {
        code: "USE_CF_SEND_ALIMTALK",
        message: "실발송은 승인 후 CF에서 수행. 현재는 queued stub.",
      },
      dryRun: true,
    };
  }
}
