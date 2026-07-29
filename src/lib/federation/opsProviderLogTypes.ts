/**
 * PR4-3 prep — Provider call logs (ops diagnostics).
 * Path: federations/{slug}/opsProviderLogs/{logId}
 * Append-only; CF writes in Sprint B+.
 */

export type OpsProviderLog = {
  id: string;
  federationSlug: string;
  notificationId: string | null;
  provider: string;
  providerMode: "stub" | "sens" | "kakao";
  dryRun: boolean;
  toPhoneMasked: string | null;
  templateKey: string | null;
  requestAt: Date | null;
  responseAt: Date | null;
  latencyMs: number | null;
  httpStatus: number | null;
  providerMessageId: string | null;
  ok: boolean;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: Date | null;
};

export function maskPhoneForLog(phone: string | null | undefined): string | null {
  const d = String(phone || "").replace(/\D/g, "");
  if (!d) return null;
  if (d.length < 7) return "***";
  return `${d.slice(0, 3)}****${d.slice(-4)}`;
}

export type OpsProviderLogWrite = {
  federationSlug: string;
  notificationId?: string | null;
  provider: string;
  providerMode: "stub" | "sens" | "kakao";
  dryRun: boolean;
  toPhone?: string | null;
  templateKey?: string | null;
  requestAt: Date | string;
  responseAt: Date | string;
  latencyMs: number;
  httpStatus?: number | null;
  providerMessageId?: string | null;
  ok: boolean;
  errorCode?: string | null;
  errorMessage?: string | null;
};
