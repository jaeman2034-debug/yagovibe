/**
 * PR4 Sprint B prep — Kakao AlimTalk provider (client-safe stub).
 * Real send is CF-owned after business approval; never put secrets in browser.
 */

import {
  ALIMTALK_TEMPLATE_REGISTRY,
  type AlimTalkTemplateId,
  renderAlimTalkPreview,
} from "@/lib/notifications/alimtalkTemplates";

export type KakaoAlimTalkSendInput = {
  templateId: AlimTalkTemplateId;
  /** Phone digits for AlimTalk (Kakao friend / phone bridge per Biz API) */
  toPhone: string;
  vars: Record<string, string>;
  notificationId?: string;
  federationSlug?: string;
};

export type KakaoAlimTalkSendResult = {
  ok: boolean;
  dryRun: boolean;
  provider: "KAKAO_STUB" | "KAKAO_ALIMTALK";
  providerMessageId: string | null;
  templateId: AlimTalkTemplateId;
  templateCode: string | null;
  previewBody: string;
  errorCode: string | null;
  errorMessage: string | null;
};

export interface KakaoAlimTalkProvider {
  readonly isStub: boolean;
  readonly displayName: string;
  sendAlimTalk(input: KakaoAlimTalkSendInput): Promise<KakaoAlimTalkSendResult>;
}

function readTemplateCode(templateId: AlimTalkTemplateId): string | null {
  const def = ALIMTALK_TEMPLATE_REGISTRY[templateId];
  const fromVite =
    typeof import.meta !== "undefined" && import.meta.env
      ? String(
          (import.meta.env as Record<string, string | undefined>)[
            `VITE_${def.templateCodeEnvKey}`
          ] || ""
        ).trim()
      : "";
  return fromVite || null;
}

/**
 * Dry-run stub — no Kakao network.
 * Approval pending: channel YAGO SPORTS / search id yagovibe.
 */
export class KakaoAlimTalkProviderStub implements KakaoAlimTalkProvider {
  readonly isStub = true;
  readonly displayName = "Kakao AlimTalk (Stub)";

  async sendAlimTalk(
    input: KakaoAlimTalkSendInput
  ): Promise<KakaoAlimTalkSendResult> {
    const phone = String(input.toPhone || "").replace(/\D/g, "");
    const previewBody = renderAlimTalkPreview(input.templateId, input.vars);
    const templateCode = readTemplateCode(input.templateId);
    if (!phone) {
      return {
        ok: false,
        dryRun: true,
        provider: "KAKAO_STUB",
        providerMessageId: null,
        templateId: input.templateId,
        templateCode,
        previewBody,
        errorCode: "MISSING_PHONE",
        errorMessage: "수신 전화번호가 없습니다.",
      };
    }
    return {
      ok: true,
      dryRun: true,
      provider: "KAKAO_STUB",
      providerMessageId: `kakao_stub_${Date.now()}_${phone.slice(-4)}`,
      templateId: input.templateId,
      templateCode,
      previewBody,
      errorCode: null,
      errorMessage: null,
    };
  }
}

/** After approval: UI should call CF, not browser Kakao API. */
export class KakaoAlimTalkProviderClientPlaceholder
  implements KakaoAlimTalkProvider
{
  readonly isStub = false;
  readonly displayName = "Kakao AlimTalk (CF)";

  async sendAlimTalk(
    input: KakaoAlimTalkSendInput
  ): Promise<KakaoAlimTalkSendResult> {
    return {
      ok: false,
      dryRun: false,
      provider: "KAKAO_ALIMTALK",
      providerMessageId: null,
      templateId: input.templateId,
      templateCode: readTemplateCode(input.templateId),
      previewBody: renderAlimTalkPreview(input.templateId, input.vars),
      errorCode: "USE_CF_SEND_ALIMTALK",
      errorMessage:
        "실발송은 Cloud Function(sendAlimTalk)을 사용하세요. 승인 후 secrets 연결.",
    };
  }
}

export function sendAlimTalk(
  input: KakaoAlimTalkSendInput,
  provider: KakaoAlimTalkProvider = new KakaoAlimTalkProviderStub()
): Promise<KakaoAlimTalkSendResult> {
  return provider.sendAlimTalk(input);
}
