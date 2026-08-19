/**
 * Sprint 2-4 PREP — Event → Kakao AlimTalk template + NCP env placeholders.
 * templateCode remains PENDING until Biz/NCP approval.
 */

import type { AlimTalkTemplateId } from "@/lib/notifications/kakao/templates";
import { ALIMTALK_TEMPLATE_REGISTRY } from "@/lib/notifications/kakao/templates";
import type { PlatformNotifyEventId } from "@/lib/notifications/ncp/platformNotifyEvents";

export type NotifyChannelKind = "kakao_alimtalk" | "sms" | "email" | "app";

export type PlatformNotifyTemplateBinding = {
  eventId: PlatformNotifyEventId;
  /** Existing Kakao registry id (no new Biz template until approval) */
  alimTalkTemplateId: AlimTalkTemplateId;
  /** Preferred outbound channel order when live */
  channelPreference: NotifyChannelKind[];
  /**
   * Future NCP SENS / Kakao template code env key (placeholder).
   * Not read for live send in Sprint 2-4 prep.
   */
  ncpTemplateCodeEnvKey: string;
  /** Human note for ops / approval checklist */
  approvalNote: string;
};

/**
 * Maps product events → already-registered AlimTalk templates.
 * Separate Kakao Biz templates for claim vs finalize may be added after NCP reply.
 */
export const PLATFORM_NOTIFY_TEMPLATE_MAP: Record<
  PlatformNotifyEventId,
  PlatformNotifyTemplateBinding
> = {
  TEAM_CREATED: {
    eventId: "TEAM_CREATED",
    alimTalkTemplateId: "WELCOME",
    channelPreference: ["kakao_alimtalk", "app", "sms"],
    ncpTemplateCodeEnvKey: "NCP_TEMPLATE_TEAM_CREATED",
    approvalNote: "Reuse WELCOME until dedicated team-created template approved",
  },
  VENUE_BOOKING_REQUESTED: {
    eventId: "VENUE_BOOKING_REQUESTED",
    alimTalkTemplateId: "RESERVATION_REQUEST",
    channelPreference: ["kakao_alimtalk", "app", "sms"],
    ncpTemplateCodeEnvKey: "NCP_TEMPLATE_VENUE_BOOKING_REQUESTED",
    approvalNote: "Aligns with RESERVATION_REQUEST",
  },
  PAYMENT_CLAIM_REQUESTED: {
    eventId: "PAYMENT_CLAIM_REQUESTED",
    alimTalkTemplateId: "PAYMENT_REQUEST",
    channelPreference: ["kakao_alimtalk", "app", "sms"],
    ncpTemplateCodeEnvKey: "NCP_TEMPLATE_PAYMENT_CLAIM_REQUESTED",
    approvalNote:
      "Manager-facing claim signal; copy must say 확인 요청 ≠ 입금 완료. Dedicated template TBD.",
  },
  PAYMENT_CONFIRMED: {
    eventId: "PAYMENT_CONFIRMED",
    alimTalkTemplateId: "PAYMENT_CONFIRMED",
    channelPreference: ["kakao_alimtalk", "app", "sms"],
    ncpTemplateCodeEnvKey: "NCP_TEMPLATE_PAYMENT_CONFIRMED",
    approvalNote: "Admin CONFIRMED only — never on member claim path",
  },
  RESERVATION_FINALIZED: {
    eventId: "RESERVATION_FINALIZED",
    // Until a separate finalized template is approved, reuse PAYMENT_CONFIRMED body
    alimTalkTemplateId: "PAYMENT_CONFIRMED",
    channelPreference: ["kakao_alimtalk", "app", "sms"],
    ncpTemplateCodeEnvKey: "NCP_TEMPLATE_RESERVATION_FINALIZED",
    approvalNote: "Prefer dedicated FINALIZED template after NCP/Biz approval",
  },
  AI_REPORT_READY: {
    eventId: "AI_REPORT_READY",
    alimTalkTemplateId: "AI_REPORT_READY",
    channelPreference: ["kakao_alimtalk", "app", "sms", "email"],
    ncpTemplateCodeEnvKey: "NCP_TEMPLATE_AI_REPORT_READY",
    approvalNote: "Parent delivery path; product gate may still apply (K3)",
  },
};

export function getTemplateBinding(
  eventId: PlatformNotifyEventId
): PlatformNotifyTemplateBinding {
  return PLATFORM_NOTIFY_TEMPLATE_MAP[eventId];
}

/** Resolve Kakao template def for an event (code still PENDING until env filled). */
export function resolveAlimTalkTemplateForEvent(eventId: PlatformNotifyEventId) {
  const binding = getTemplateBinding(eventId);
  return {
    binding,
    template: ALIMTALK_TEMPLATE_REGISTRY[binding.alimTalkTemplateId],
  };
}

/** Empty NCP env key checklist for ops (values not required until GO). */
export function listNcpTemplateEnvPlaceholders(): Array<{
  eventId: PlatformNotifyEventId;
  envKey: string;
  alimTalkTemplateId: AlimTalkTemplateId;
}> {
  return (Object.keys(PLATFORM_NOTIFY_TEMPLATE_MAP) as PlatformNotifyEventId[]).map(
    (eventId) => ({
      eventId,
      envKey: PLATFORM_NOTIFY_TEMPLATE_MAP[eventId].ncpTemplateCodeEnvKey,
      alimTalkTemplateId: PLATFORM_NOTIFY_TEMPLATE_MAP[eventId].alimTalkTemplateId,
    })
  );
}
