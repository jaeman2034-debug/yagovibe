/**
 * PR4 Sprint B prep — Kakao AlimTalk stub (Functions). No REST call.
 */

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
  status: "queued" | "sent" | "failed";
  error?: { code: string; message: string };
  provider: "kakao";
  templateCode: string;
  dryRun: boolean;
};

export interface KakaoAlimTalkProvider {
  readonly isStub: boolean;
  sendAlimTalk(input: KakaoAlimTalkSendInput): Promise<KakaoAlimTalkSendResult>;
}

export class KakaoAlimTalkProviderStub implements KakaoAlimTalkProvider {
  readonly isStub = true;

  async sendAlimTalk(
    input: KakaoAlimTalkSendInput
  ): Promise<KakaoAlimTalkSendResult> {
    const phone = String(input.recipientPhone || "").replace(/\D/g, "");
    const templateId = input.templateId || "RESERVATION_COMPLETE";
    const templateCode =
      (input.templateCode && input.templateCode.trim()) ||
      resolveAlimTalkTemplateCode(templateId);
    if (!phone) {
      return {
        providerMessageId: null,
        status: "failed",
        error: { code: "MISSING_PHONE", message: "수신 전화번호가 없습니다." },
        provider: "kakao",
        templateCode,
        dryRun: true,
      };
    }
    void input.templateVariables;
    void ALIMTALK_TEMPLATE_REGISTRY;
    return {
      providerMessageId: `kakao_stub_${Date.now()}_${phone.slice(-4)}`,
      status: "queued",
      provider: "kakao",
      templateCode,
      dryRun: true,
    };
  }
}

export async function sendAlimTalk(
  input: KakaoAlimTalkSendInput,
  provider: KakaoAlimTalkProvider = new KakaoAlimTalkProviderStub()
): Promise<KakaoAlimTalkSendResult> {
  return provider.sendAlimTalk(input);
}

export function createKakaoAlimTalkProviderFromEnv(): KakaoAlimTalkProvider {
  return new KakaoAlimTalkProviderStub();
}
