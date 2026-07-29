/**
 * PR4-3 prep — SMS provider mode selection (client).
 * VITE_SMS_PROVIDER=stub|sens (default stub)
 */

export type SmsProviderMode = "stub" | "sens";

function readViteSmsProvider(): string | undefined {
  try {
    // eslint-disable-next-line no-new-func
    const meta = new Function("return import.meta")() as {
      env?: { VITE_SMS_PROVIDER?: string };
    };
    return meta?.env?.VITE_SMS_PROVIDER;
  } catch {
    return undefined;
  }
}

export function resolveSmsProviderMode(
  raw?: string | null
): SmsProviderMode {
  const v = String(raw ?? readViteSmsProvider() ?? "stub")
    .trim()
    .toLowerCase();
  if (v === "sens" || v === "ncp" || v === "naver") return "sens";
  return "stub";
}

export function isSmsProviderSensMode(raw?: string | null): boolean {
  return resolveSmsProviderMode(raw) === "sens";
}
