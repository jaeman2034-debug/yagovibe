/**
 * PR4-3 Sprint A/B prep — Ops SMS provider interface + mode switch.
 * SMS_PROVIDER / VITE_SMS_PROVIDER: stub | sens
 */

import { resolveSmsProviderMode } from "@/lib/notifications/smsProviderConfig";

export type OpsSmsProviderId = "SENS_STUB" | "SENS";

export type OpsSmsSendInput = {
  notificationId: string;
  toPhone: string;
  body: string;
  federationSlug: string;
  templateKey?: string;
};

export type OpsSmsSendResult = {
  ok: boolean;
  dryRun: boolean;
  provider: OpsSmsProviderId;
  providerMessageId: string | null;
  sentAt: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  httpStatus?: number | null;
  latencyMs?: number;
};

export interface OpsSmsProvider {
  readonly providerId: OpsSmsProviderId;
  readonly displayName: string;
  readonly isStub: boolean;
  send(input: OpsSmsSendInput): Promise<OpsSmsSendResult>;
}

export class SensProviderStub implements OpsSmsProvider {
  readonly providerId: OpsSmsProviderId = "SENS_STUB";
  readonly displayName = "Naver SENS (Stub)";
  readonly isStub = true;

  async send(input: OpsSmsSendInput): Promise<OpsSmsSendResult> {
    const t0 = Date.now();
    const phone = String(input.toPhone || "").replace(/\D/g, "");
    if (!phone) {
      return {
        ok: false,
        dryRun: true,
        provider: this.providerId,
        providerMessageId: null,
        sentAt: null,
        errorCode: "MISSING_PHONE",
        errorMessage: "수신 전화번호가 없습니다.",
        httpStatus: null,
        latencyMs: Date.now() - t0,
      };
    }
    return {
      ok: true,
      dryRun: true,
      provider: this.providerId,
      providerMessageId: `stub_${Date.now()}_${phone.slice(-4)}`,
      sentAt: new Date().toISOString(),
      errorCode: null,
      errorMessage: null,
      httpStatus: 202,
      latencyMs: Date.now() - t0,
    };
  }
}

/**
 * Client-side sens placeholder — real send is CF-owned (consumeQueuedSms).
 * Selecting sens here only signals UI mode; do not call NCP from browser.
 */
export class SensOpsSmsProviderClientPlaceholder implements OpsSmsProvider {
  readonly providerId: OpsSmsProviderId = "SENS";
  readonly displayName = "Naver SENS (CF)";
  readonly isStub = false;

  async send(_input: OpsSmsSendInput): Promise<OpsSmsSendResult> {
    return {
      ok: false,
      dryRun: false,
      provider: this.providerId,
      providerMessageId: null,
      sentAt: null,
      errorCode: "USE_CONSUME_QUEUED_SMS",
      errorMessage: "실발송은 Cloud Function consumeQueuedSms를 사용하세요.",
      httpStatus: null,
      latencyMs: 0,
    };
  }
}

let opsSmsProvider: OpsSmsProvider | null = null;

export function setOpsSmsProvider(provider: OpsSmsProvider): void {
  opsSmsProvider = provider;
}

export function getOpsSmsProvider(): OpsSmsProvider {
  if (!opsSmsProvider) {
    opsSmsProvider =
      resolveSmsProviderMode() === "sens"
        ? new SensOpsSmsProviderClientPlaceholder()
        : new SensProviderStub();
  }
  return opsSmsProvider;
}
