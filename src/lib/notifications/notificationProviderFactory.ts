/**
 * PR4 Sprint B prep — choose outbound channel provider (SMS | Kakao | auto).
 * Does not alter Notification Queue / Ops Center; selection only.
 *
 * Env:
 *   VITE_NOTIFY_OUTBOUND=auto|sms|kakao|stub  (default auto→sms stub until keys)
 *   SMS_PROVIDER / VITE_SMS_PROVIDER=stub|sens
 *   KAKAO_ALIMTALK_ENABLED=true (after approval)
 */

import { getOpsSmsProvider, type OpsSmsProvider } from "@/lib/notifications/opsSmsProvider";
import { resolveSmsProviderMode } from "@/lib/notifications/smsProviderConfig";
import {
  KakaoAlimTalkProviderClientPlaceholder,
  KakaoAlimTalkProviderStub,
  type KakaoAlimTalkProvider,
} from "@/lib/notifications/kakaoAlimTalkProvider";

export type OutboundNotifyChannel = "sms" | "kakao" | "auto" | "stub";

export function resolveOutboundNotifyChannel(
  raw: string | undefined | null = import.meta.env.VITE_NOTIFY_OUTBOUND
): OutboundNotifyChannel {
  const v = String(raw || "auto").trim().toLowerCase();
  if (v === "sms" || v === "kakao" || v === "stub" || v === "auto") return v;
  return "auto";
}

function isKakaoAlimTalkEnabled(): boolean {
  const v = String(import.meta.env.VITE_KAKAO_ALIMTALK_ENABLED || "")
    .trim()
    .toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

export type NotificationProviderBundle = {
  channel: OutboundNotifyChannel;
  resolved: "sms" | "kakao" | "stub";
  sms: OpsSmsProvider;
  kakao: KakaoAlimTalkProvider;
};

/**
 * Factory — auto prefers Kakao when enabled, else SMS provider mode.
 */
export function createNotificationProviderFactory(
  channelOverride?: OutboundNotifyChannel
): NotificationProviderBundle {
  const channel = channelOverride || resolveOutboundNotifyChannel();
  const sms = getOpsSmsProvider();
  const kakao = isKakaoAlimTalkEnabled()
    ? new KakaoAlimTalkProviderClientPlaceholder()
    : new KakaoAlimTalkProviderStub();

  if (channel === "sms") {
    return { channel, resolved: "sms", sms, kakao };
  }
  if (channel === "kakao") {
    return { channel, resolved: "kakao", sms, kakao };
  }
  if (channel === "stub") {
    return { channel, resolved: "stub", sms, kakao };
  }

  // auto
  if (isKakaoAlimTalkEnabled()) {
    return { channel: "auto", resolved: "kakao", sms, kakao };
  }
  if (resolveSmsProviderMode() === "sens") {
    return { channel: "auto", resolved: "sms", sms, kakao };
  }
  return { channel: "auto", resolved: "stub", sms, kakao };
}

/** Convenience singleton for ops UI badges */
let cached: NotificationProviderBundle | null = null;

export function getNotificationProviderFactory(): NotificationProviderBundle {
  if (!cached) cached = createNotificationProviderFactory();
  return cached;
}

export function resetNotificationProviderFactoryForTests(): void {
  cached = null;
}
