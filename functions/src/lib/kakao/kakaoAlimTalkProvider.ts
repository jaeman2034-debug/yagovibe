/**
 * PR4 Sprint B prep — Kakao AlimTalk provider (Functions).
 * Until Biz approval + secrets: stub dry-run only.
 * After approval: fill sendAlimTalk HTTP to Kakao Biz API (placeholder below).
 *
 * Secrets / env (placeholders — do not commit real values):
 *   KAKAO_CHANNEL_ID
 *   KAKAO_SENDER_KEY
 *   KAKAO_API_KEY
 *   KAKAO_TEMPLATE_CODE_*
 *   KAKAO_ALIMTALK_ENABLED=true
 */

import {
  ALIMTALK_TEMPLATE_REGISTRY,
  renderAlimTalkPreview,
  resolveAlimTalkTemplateCode,
  type AlimTalkTemplateId,
} from "./alimtalkTemplates";

export type KakaoAlimTalkSendInput = {
  templateId: AlimTalkTemplateId;
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
  httpStatus: number | null;
  errorCode: string | null;
  errorMessage: string | null;
  requestAt: string;
  responseAt: string;
  latencyMs: number;
};

export interface KakaoAlimTalkProvider {
  readonly isStub: boolean;
  sendAlimTalk(input: KakaoAlimTalkSendInput): Promise<KakaoAlimTalkSendResult>;
}

function kakaoConfigured(): boolean {
  const channel = String(process.env.KAKAO_CHANNEL_ID || "").trim();
  const sender = String(process.env.KAKAO_SENDER_KEY || "").trim();
  const apiKey = String(process.env.KAKAO_API_KEY || "").trim();
  const enabled = String(process.env.KAKAO_ALIMTALK_ENABLED || "")
    .trim()
    .toLowerCase();
  return (
    (enabled === "1" || enabled === "true") &&
    !!channel &&
    !!sender &&
    !!apiKey
  );
}

export class KakaoAlimTalkProviderStub implements KakaoAlimTalkProvider {
  readonly isStub = true;

  async sendAlimTalk(
    input: KakaoAlimTalkSendInput
  ): Promise<KakaoAlimTalkSendResult> {
    const requestAt = new Date();
    await new Promise((r) => setTimeout(r, 5));
    const responseAt = new Date();
    const phone = String(input.toPhone || "").replace(/\D/g, "");
    const previewBody = renderAlimTalkPreview(input.templateId, input.vars);
    const templateCode = resolveAlimTalkTemplateCode(input.templateId);
    if (!phone) {
      return {
        ok: false,
        dryRun: true,
        provider: "KAKAO_STUB",
        providerMessageId: null,
        templateId: input.templateId,
        templateCode,
        previewBody,
        httpStatus: null,
        errorCode: "MISSING_PHONE",
        errorMessage: "수신 전화번호가 없습니다.",
        requestAt: requestAt.toISOString(),
        responseAt: responseAt.toISOString(),
        latencyMs: responseAt.getTime() - requestAt.getTime(),
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
      httpStatus: 202,
      errorCode: null,
      errorMessage: null,
      requestAt: requestAt.toISOString(),
      responseAt: responseAt.toISOString(),
      latencyMs: responseAt.getTime() - requestAt.getTime(),
    };
  }
}

/**
 * Real AlimTalk — NOT_CONFIGURED until secrets + approval.
 * Sprint B(승인 후): implement Kakao Biz Message API call here.
 */
export class KakaoAlimTalkOpsProvider implements KakaoAlimTalkProvider {
  readonly isStub = false;

  async sendAlimTalk(
    input: KakaoAlimTalkSendInput
  ): Promise<KakaoAlimTalkSendResult> {
    const requestAt = new Date();
    const previewBody = renderAlimTalkPreview(input.templateId, input.vars);
    const templateCode = resolveAlimTalkTemplateCode(input.templateId);
    const responseAt = new Date();

    if (!kakaoConfigured()) {
      return {
        ok: false,
        dryRun: false,
        provider: "KAKAO_ALIMTALK",
        providerMessageId: null,
        templateId: input.templateId,
        templateCode,
        previewBody,
        httpStatus: null,
        errorCode: "KAKAO_NOT_CONFIGURED",
        errorMessage:
          "KAKAO_CHANNEL_ID / KAKAO_SENDER_KEY / KAKAO_API_KEY / KAKAO_ALIMTALK_ENABLED 필요. 심사 승인 후 설정.",
        requestAt: requestAt.toISOString(),
        responseAt: responseAt.toISOString(),
        latencyMs: 0,
      };
    }

    if (!templateCode) {
      const envKey =
        ALIMTALK_TEMPLATE_REGISTRY[input.templateId].templateCodeEnvKey;
      return {
        ok: false,
        dryRun: false,
        provider: "KAKAO_ALIMTALK",
        providerMessageId: null,
        templateId: input.templateId,
        templateCode: null,
        previewBody,
        httpStatus: null,
        errorCode: "KAKAO_TEMPLATE_CODE_MISSING",
        errorMessage: `${envKey} 미설정. 카카오 콘솔 템플릿 등록 후 입력.`,
        requestAt: requestAt.toISOString(),
        responseAt: responseAt.toISOString(),
        latencyMs: 0,
      };
    }

    // Approval gate: HTTP call intentionally not implemented yet.
    void input;
    return {
      ok: false,
      dryRun: false,
      provider: "KAKAO_ALIMTALK",
      providerMessageId: null,
      templateId: input.templateId,
      templateCode,
      previewBody,
      httpStatus: null,
      errorCode: "KAKAO_API_NOT_IMPLEMENTED",
      errorMessage:
        "Kakao Biz AlimTalk HTTP 호출은 심사 승인 + 템플릿 등록 후 Sprint B에서 구현.",
      requestAt: requestAt.toISOString(),
      responseAt: responseAt.toISOString(),
      latencyMs: 0,
    };
  }
}

export function createKakaoAlimTalkProviderFromEnv(): KakaoAlimTalkProvider {
  return kakaoConfigured()
    ? new KakaoAlimTalkOpsProvider()
    : new KakaoAlimTalkProviderStub();
}

/** Named export matching product brief */
export async function sendAlimTalk(
  input: KakaoAlimTalkSendInput,
  provider: KakaoAlimTalkProvider = createKakaoAlimTalkProviderFromEnv()
): Promise<KakaoAlimTalkSendResult> {
  return provider.sendAlimTalk(input);
}
