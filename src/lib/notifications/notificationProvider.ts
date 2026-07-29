/**
 * Notification Provider abstraction (PR4-1 / PR4-3 / Sprint B prep).
 * App Notification = implemented.
 * Ops SMS: `@/lib/notifications/opsSmsProvider`
 * Kakao AlimTalk: `@/lib/notifications/kakaoAlimTalkProvider` + factory
 */

import { createNotification } from "@/services/platformNotificationService";
import type { NotificationType } from "@/types/notification";
import { buildReservationAssignedTemplate } from "@/lib/notifications/venueNotifyTemplates";
import { sendAlimTalk } from "@/lib/notifications/kakaoAlimTalkProvider";
import type { AlimTalkTemplateId } from "@/lib/notifications/alimtalkTemplates";
import { mapVenueKeyToAlimTalkId } from "@/lib/notifications/alimtalkTemplates";

export type NotificationChannel = "app" | "sms" | "kakao";

export type VenueNotifyMessage = {
  userId: string;
  title: string;
  message: string;
  body?: string;
  link?: string;
  pushDedupKey?: string;
  teamId?: string;
  teamName?: string;
  priority?: "high" | "normal" | "low";
  payload?: Record<string, unknown>;
  type?: NotificationType;
  /** Optional AlimTalk routing */
  recipientPhone?: string;
  alimTalkTemplateId?: AlimTalkTemplateId;
};

export interface NotificationProvider {
  readonly channel: NotificationChannel;
  send(msg: VenueNotifyMessage): Promise<void>;
}

/** In-app + FCM enqueue via root `notifications` (status=queued). */
export class AppNotificationProvider implements NotificationProvider {
  readonly channel: NotificationChannel = "app";

  async send(msg: VenueNotifyMessage): Promise<void> {
    if (!msg.userId.trim()) return;
    await createNotification({
      userId: msg.userId,
      type: msg.type || "SYSTEM_NOTICE",
      title: msg.title,
      message: msg.message,
      body: msg.body,
      link: msg.link,
      status: "queued",
      pushDedupKey: msg.pushDedupKey,
      teamId: msg.teamId,
      teamName: msg.teamName,
      priority: msg.priority || "high",
      payload: msg.payload,
    });
  }
}

/**
 * SMS channel — no-op at this layer; Ops SMS uses consumeQueuedSms / OpsSmsProvider.
 */
export class SmsNotificationProvider implements NotificationProvider {
  readonly channel: NotificationChannel = "sms";

  async send(_msg: VenueNotifyMessage): Promise<void> {
    return;
  }
}

/**
 * Kakao AlimTalk — stub dry-run until Biz approval + CF wiring.
 * Does not alter Notification Queue / Ops Center.
 */
export class KakaoNotificationProvider implements NotificationProvider {
  readonly channel: NotificationChannel = "kakao";

  async send(msg: VenueNotifyMessage): Promise<void> {
    const phone = String(msg.recipientPhone || "").replace(/\D/g, "");
    if (!phone) return;
    const fromPayload =
      msg.payload && typeof msg.payload.templateKey === "string"
        ? mapVenueKeyToAlimTalkId(msg.payload.templateKey)
        : null;
    const templateId =
      msg.alimTalkTemplateId || fromPayload || ("RESERVATION_COMPLETE" as const);
    await sendAlimTalk({
      templateId,
      toPhone: phone,
      vars: {
        team: msg.teamName || "",
        link: msg.link || "https://yago-vibe.com",
        venue: "",
        date: "",
        time: "",
        price: "",
        deadline: "",
        contact: "노원구축구협회",
        name: "",
      },
    });
  }
}

export class CompositeNotificationProvider implements NotificationProvider {
  readonly channel: NotificationChannel = "app";
  constructor(private readonly providers: NotificationProvider[]) {}

  async send(msg: VenueNotifyMessage): Promise<void> {
    await Promise.all(this.providers.map((p) => p.send(msg)));
  }
}

let defaultProvider: NotificationProvider | null = null;

export function getVenueNotificationProvider(): NotificationProvider {
  if (!defaultProvider) {
    defaultProvider = new CompositeNotificationProvider([
      new AppNotificationProvider(),
      new SmsNotificationProvider(),
      new KakaoNotificationProvider(),
    ]);
  }
  return defaultProvider;
}

/** @deprecated Prefer buildReservationAssignedTemplate (PR4 SoT). */
export function buildAllocationNotifyBody(input: {
  federationName: string;
  venueName: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  totalAmount: number;
  paymentDeadlineLabel: string;
  bankAccountGuide: string;
  shortReservationCode: string;
  detailPath?: string;
}): { title: string; message: string; body: string } {
  const t = buildReservationAssignedTemplate({
    ...input,
    detailPath: input.detailPath || "",
  });
  return { title: t.title, message: t.message, body: t.body };
}
