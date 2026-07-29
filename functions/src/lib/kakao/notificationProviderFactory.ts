/**
 * PR4 Sprint B prep — outbound channel factory (Functions).
 * SMS (SENS|stub) + Kakao AlimTalk (stub|ops).
 */

import {
  createOpsSmsProviderFromEnv,
  type OpsSmsProvider,
} from "../sms/opsSmsProvider";
import { resolveSmsProviderMode } from "../sms/smsProviderConfig";
import {
  createKakaoAlimTalkProviderFromEnv,
  type KakaoAlimTalkProvider,
} from "./kakaoAlimTalkProvider";

export type OutboundChannel = "sms" | "kakao" | "auto" | "stub";

export function resolveOutboundChannel(
  raw: string | undefined | null = process.env.NOTIFY_OUTBOUND
): OutboundChannel {
  const v = String(raw || "auto").trim().toLowerCase();
  if (v === "sms" || v === "kakao" || v === "stub" || v === "auto") return v;
  return "auto";
}

function kakaoEnabled(): boolean {
  const v = String(process.env.KAKAO_ALIMTALK_ENABLED || "")
    .trim()
    .toLowerCase();
  return v === "1" || v === "true";
}

export type NotificationProviderFactory = {
  channel: OutboundChannel;
  resolved: "sms" | "kakao" | "stub";
  sms: OpsSmsProvider;
  kakao: KakaoAlimTalkProvider;
};

export function NotificationProviderFactory(
  channelOverride?: OutboundChannel
): NotificationProviderFactory {
  const channel = channelOverride || resolveOutboundChannel();
  const sms = createOpsSmsProviderFromEnv();
  const kakao = createKakaoAlimTalkProviderFromEnv();

  if (channel === "sms") return { channel, resolved: "sms", sms, kakao };
  if (channel === "kakao") return { channel, resolved: "kakao", sms, kakao };
  if (channel === "stub") return { channel, resolved: "stub", sms, kakao };

  if (kakaoEnabled() && !kakao.isStub) {
    return { channel: "auto", resolved: "kakao", sms, kakao };
  }
  if (resolveSmsProviderMode() === "sens" && !sms.isStub) {
    return { channel: "auto", resolved: "sms", sms, kakao };
  }
  return { channel: "auto", resolved: "stub", sms, kakao };
}
