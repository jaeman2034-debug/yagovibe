/**
 * PR4 Sprint B prep — NOTIFICATION_PROVIDER factory (Functions).
 */

import {
  createOpsSmsProviderFromEnv,
  type OpsSmsProvider,
} from "../sms/opsSmsProvider";
import {
  createKakaoAlimTalkProviderFromEnv,
  type KakaoAlimTalkProvider,
} from "./kakaoAlimTalkProvider";

export type NotificationProviderMode = "sms" | "kakao" | "auto";

function truthy(v: string | undefined): boolean {
  const s = String(v || "").trim().toLowerCase();
  return s === "1" || s === "true" || s === "yes";
}

export function resolveNotificationProviderMode(
  raw: string | undefined | null = process.env.NOTIFICATION_PROVIDER
): NotificationProviderMode {
  const v = String(raw || "auto").trim().toLowerCase();
  if (v === "sms" || v === "kakao" || v === "auto") return v;
  return "auto";
}

export function resolveOutboundProvider(
  mode: NotificationProviderMode
): "sms" | "kakao" {
  if (mode === "sms") return "sms";
  if (mode === "kakao") return "kakao";
  const enabled = truthy(process.env.KAKAO_ALIMTALK_ENABLED);
  const sender = String(process.env.KAKAO_SENDER_KEY || "").trim();
  if (enabled && sender) return "kakao";
  return "sms";
}

export type NotificationProviderFactoryResult = {
  mode: NotificationProviderMode;
  resolved: "sms" | "kakao";
  sms: OpsSmsProvider;
  kakao: KakaoAlimTalkProvider;
};

export function NotificationProviderFactory(): NotificationProviderFactoryResult {
  const mode = resolveNotificationProviderMode();
  return {
    mode,
    resolved: resolveOutboundProvider(mode),
    sms: createOpsSmsProviderFromEnv(),
    kakao: createKakaoAlimTalkProviderFromEnv(),
  };
}
