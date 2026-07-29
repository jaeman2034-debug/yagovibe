/**
 * PR4 Sprint B prep — NotificationProviderFactory (SMS | Kakao | auto).
 *
 * Env (client): VITE_NOTIFICATION_PROVIDER or VITE_NOTIFY_OUTBOUND
 * Env (server): NOTIFICATION_PROVIDER
 * Values: sms | kakao | auto
 *
 * auto: Kakao enabled + SenderKey present → kakao, else sms
 */

import { getOpsSmsProvider, type OpsSmsProvider } from "@/lib/notifications/opsSmsProvider";
import {
  KakaoAlimTalkProviderStub,
  type KakaoAlimTalkProvider,
} from "@/lib/notifications/kakaoAlimTalkProvider";
import {
  getKakaoAlimTalkConfigStatus,
  type KakaoAlimTalkConfigStatus,
  type EnvMap,
} from "@/lib/notifications/kakaoAlimTalkConfig";

export type NotificationProviderMode = "sms" | "kakao" | "auto";

export type NotificationProviderBundle = {
  mode: NotificationProviderMode;
  resolved: "sms" | "kakao";
  sms: OpsSmsProvider;
  kakao: KakaoAlimTalkProvider;
  kakaoStatus: KakaoAlimTalkConfigStatus;
};

function readClientEnv(): EnvMap {
  try {
    // eslint-disable-next-line no-new-func
    const meta = new Function("return import.meta")() as { env?: EnvMap };
    const e = meta?.env || {};
    return {
      NOTIFICATION_PROVIDER: e.VITE_NOTIFICATION_PROVIDER || e.VITE_NOTIFY_OUTBOUND,
      KAKAO_ALIMTALK_ENABLED: e.VITE_KAKAO_ALIMTALK_ENABLED,
      KAKAO_CHANNEL_ID: e.VITE_KAKAO_CHANNEL_ID,
      KAKAO_SENDER_KEY: e.VITE_KAKAO_SENDER_KEY,
      KAKAO_API_KEY: e.VITE_KAKAO_API_KEY,
      KAKAO_TEMPLATE_RESERVATION: e.VITE_KAKAO_TEMPLATE_RESERVATION,
      KAKAO_TEMPLATE_PAYMENT: e.VITE_KAKAO_TEMPLATE_PAYMENT,
      KAKAO_TEMPLATE_CANCEL: e.VITE_KAKAO_TEMPLATE_CANCEL,
      KAKAO_TEMPLATE_AI_REPORT: e.VITE_KAKAO_TEMPLATE_AI_REPORT,
    };
  } catch {
    return {};
  }
}

export function resolveNotificationProviderMode(
  raw?: string | null
): NotificationProviderMode {
  const v = String(raw || "auto").trim().toLowerCase();
  if (v === "sms" || v === "kakao" || v === "auto") return v;
  return "auto";
}

/**
 * auto rule: Kakao enabled + SenderKey → kakao, else sms
 */
export function resolveOutboundProvider(
  mode: NotificationProviderMode,
  kakaoStatus: KakaoAlimTalkConfigStatus
): "sms" | "kakao" {
  if (mode === "sms") return "sms";
  if (mode === "kakao") return "kakao";
  if (kakaoStatus.enabled && kakaoStatus.hasSenderKey) return "kakao";
  return "sms";
}

export function createNotificationProviderFactory(
  env: EnvMap = readClientEnv(),
  modeOverride?: NotificationProviderMode
): NotificationProviderBundle {
  const mode = resolveNotificationProviderMode(
    modeOverride || env.NOTIFICATION_PROVIDER
  );
  const kakaoStatus = getKakaoAlimTalkConfigStatus(env);
  const sms = getOpsSmsProvider();
  const kakao: KakaoAlimTalkProvider = new KakaoAlimTalkProviderStub();
  const resolved = resolveOutboundProvider(mode, kakaoStatus);
  return { mode, resolved, sms, kakao, kakaoStatus };
}

let cached: NotificationProviderBundle | null = null;

export function getNotificationProviderFactory(): NotificationProviderBundle {
  if (!cached) cached = createNotificationProviderFactory();
  return cached;
}

export function resetNotificationProviderFactoryForTests(): void {
  cached = null;
}

/** Alias matching product brief */
export const NotificationProviderFactory = createNotificationProviderFactory;
