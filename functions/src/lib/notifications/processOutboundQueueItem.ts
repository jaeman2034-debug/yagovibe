/**
 * PR4 Sprint C — process one outbound notification (SMS or Kakao).
 * Used by consumeQueuedSms + auto-trigger + retry.
 */

import type { Firestore, DocumentSnapshot } from "firebase-admin/firestore";
import { FieldValue } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import { NotificationProviderFactory } from "../kakao/notificationProviderFactory";
import {
  mapVenueKeyToAlimTalkId,
  resolveAlimTalkTemplateCode,
  type AlimTalkTemplateId,
} from "../kakao/alimtalkTemplates";
import { appendOpsProviderLog } from "../sms/appendOpsProviderLog";
import { buildSmsBody } from "../sms/smsTemplates";
import { resolveSmsProviderMode } from "../sms/smsProviderConfig";

export type ProcessOutboundResult = {
  notificationId: string;
  channel: "sms" | "kakao";
  dryRun: boolean;
  ok: boolean;
  statusUnchanged?: boolean;
  status?: string;
  deliveryStatus?: string;
  providerMessageId?: string | null;
  requestId?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
};

function extractPhone(raw: Record<string, unknown>): string {
  if (typeof raw.recipientPhone === "string" && raw.recipientPhone) {
    return raw.recipientPhone;
  }
  const payload =
    raw.payload && typeof raw.payload === "object"
      ? (raw.payload as Record<string, unknown>)
      : {};
  return typeof payload.recipientPhone === "string" ? payload.recipientPhone : "";
}

function extractTemplateKey(raw: Record<string, unknown>): string {
  if (typeof raw.templateKey === "string" && raw.templateKey) return raw.templateKey;
  if (typeof raw.notificationType === "string" && raw.notificationType) {
    return raw.notificationType;
  }
  const payload =
    raw.payload && typeof raw.payload === "object"
      ? (raw.payload as Record<string, unknown>)
      : {};
  return typeof payload.templateKey === "string"
    ? payload.templateKey
    : "RESERVATION_ASSIGNED";
}

function buildAlimTalkVars(
  raw: Record<string, unknown>,
  templateKey: string
): Record<string, string> {
  const payload =
    raw.payload && typeof raw.payload === "object"
      ? (raw.payload as Record<string, unknown>)
      : {};
  const str = (v: unknown) => (typeof v === "string" ? v : v != null ? String(v) : "");
  return {
    team: str(raw.teamName || payload.teamName),
    venue: str(payload.venueName || raw.venueName),
    date: str(payload.bookingDate || payload.date),
    time: str(
      payload.time ||
        (payload.startTime && payload.endTime
          ? `${payload.startTime}~${payload.endTime}`
          : "")
    ),
    price: str(payload.price || payload.amountLabel || payload.totalAmount),
    deadline: str(payload.deadline || "이용일 전월 안내"),
    reservationNo: str(
      payload.shortReservationCode || payload.reservationNo || payload.reservationId
    ),
    reservationUrl: str(raw.link || payload.reservationUrl || payload.detailPath),
    paymentStatus: str(payload.paymentStatus),
    coach: str(payload.coach),
    player: str(payload.player || payload.playerName),
    reportUrl: str(payload.reportUrl || raw.link),
    noticeTitle: str(raw.title || payload.noticeTitle),
    noticeUrl: str(raw.link || payload.noticeUrl),
    templateKey,
  };
}

export async function processOutboundNotificationDoc(
  db: Firestore,
  doc: DocumentSnapshot,
  opts?: { actorUid?: string; forceChannel?: "sms" | "kakao" }
): Promise<ProcessOutboundResult> {
  const raw = (doc.data() || {}) as Record<string, unknown>;
  const federationSlug =
    (typeof raw.federationSlug === "string" && raw.federationSlug) ||
    (raw.payload &&
    typeof raw.payload === "object" &&
    typeof (raw.payload as { federationSlug?: string }).federationSlug === "string"
      ? (raw.payload as { federationSlug: string }).federationSlug
      : "");

  const phone = extractPhone(raw);
  const templateKey = extractTemplateKey(raw);
  const factory = NotificationProviderFactory();
  const channel = opts?.forceChannel || factory.resolved;

  const now = FieldValue.serverTimestamp();
  await doc.ref.update({
    status: "sending",
    deliveryStatus: "sending",
    updatedAt: now,
  });

  if (channel === "kakao") {
    const alimId: AlimTalkTemplateId =
      (typeof raw.alimTalkTemplateId === "string" &&
        (raw.alimTalkTemplateId as AlimTalkTemplateId)) ||
      mapVenueKeyToAlimTalkId(templateKey) ||
      "RESERVATION_APPROVED";
    const templateCode = resolveAlimTalkTemplateCode(alimId);
    const vars = buildAlimTalkVars(raw, templateKey);
    const requestAt = new Date().toISOString();
    const sendResult = await factory.kakao.sendAlimTalk({
      recipientPhone: phone,
      templateId: alimId,
      templateCode,
      templateVariables: vars,
      notificationId: doc.id,
      federationSlug,
    });
    const responseAt = new Date().toISOString();

    if (federationSlug) {
      await appendOpsProviderLog(db, {
        federationSlug,
        notificationId: doc.id,
        provider: "kakao",
        providerMode: sendResult.dryRun ? "stub" : "kakao",
        dryRun: sendResult.dryRun,
        toPhone: phone,
        templateKey: alimId,
        requestAt,
        responseAt,
        latencyMs: Math.max(
          0,
          new Date(responseAt).getTime() - new Date(requestAt).getTime()
        ),
        httpStatus: sendResult.httpStatus ?? null,
        providerMessageId: sendResult.providerMessageId,
        ok: sendResult.status === "sent" || (sendResult.dryRun && sendResult.status !== "failed"),
        errorCode: sendResult.error?.code || null,
        errorMessage: sendResult.error?.message || null,
      });
    }

    if (sendResult.dryRun) {
      // Stub: revert to queued so Ops can retry after credentials
      await doc.ref.update({
        status: "queued_sms_pending",
        deliveryStatus: "queued",
        provider: "kakao",
        templateCode: sendResult.templateCode,
        alimTalkTemplateId: alimId,
        requestId: sendResult.requestId,
        providerMessageId: sendResult.providerMessageId,
        updatedAt: FieldValue.serverTimestamp(),
      });
      return {
        notificationId: doc.id,
        channel: "kakao",
        dryRun: true,
        ok: sendResult.status !== "failed",
        statusUnchanged: true,
        deliveryStatus: "queued",
        providerMessageId: sendResult.providerMessageId,
        requestId: sendResult.requestId,
        errorCode: sendResult.error?.code || null,
        errorMessage: sendResult.error?.message || null,
      };
    }

    if (sendResult.status === "sent") {
      await doc.ref.update({
        status: "sms_sent",
        deliveryStatus: "delivered",
        success: true,
        provider: "kakao",
        providerMessageId: sendResult.providerMessageId,
        requestId: sendResult.requestId,
        templateCode: sendResult.templateCode,
        alimTalkTemplateId: alimId,
        sentAt: FieldValue.serverTimestamp(),
        completedAt: FieldValue.serverTimestamp(),
        errorCode: null,
        errorMessage: null,
        updatedAt: FieldValue.serverTimestamp(),
      });
      if (federationSlug) {
        await db.collection(`federations/${federationSlug}/venueAllocationChangeLogs`).add({
          federationId: federationSlug,
          changeType: "KAKAO_SENT",
          notificationId: doc.id,
          provider: "kakao",
          providerMessageId: sendResult.providerMessageId,
          requestId: sendResult.requestId,
          recipientPhone: phone || null,
          recipientRole: raw.recipientRole || null,
          createdBy: opts?.actorUid || "system",
          changedByUid: opts?.actorUid || "system",
          createdAt: FieldValue.serverTimestamp(),
        });
      }
      return {
        notificationId: doc.id,
        channel: "kakao",
        dryRun: false,
        ok: true,
        status: "sms_sent",
        deliveryStatus: "delivered",
        providerMessageId: sendResult.providerMessageId,
        requestId: sendResult.requestId,
      };
    }

    await doc.ref.update({
      status: "sms_failed",
      deliveryStatus: "failed",
      success: false,
      provider: "kakao",
      providerMessageId: sendResult.providerMessageId,
      requestId: sendResult.requestId,
      templateCode: sendResult.templateCode,
      alimTalkTemplateId: alimId,
      completedAt: FieldValue.serverTimestamp(),
      errorCode: sendResult.error?.code || "KAKAO_FAILED",
      errorMessage: sendResult.error?.message || "AlimTalk send failed",
      updatedAt: FieldValue.serverTimestamp(),
    });
    return {
      notificationId: doc.id,
      channel: "kakao",
      dryRun: false,
      ok: false,
      status: "sms_failed",
      deliveryStatus: "failed",
      providerMessageId: sendResult.providerMessageId,
      requestId: sendResult.requestId,
      errorCode: sendResult.error?.code || null,
      errorMessage: sendResult.error?.message || null,
    };
  }

  // SMS channel (existing Sens path)
  const smsMode = resolveSmsProviderMode();
  const payload =
    raw.payload && typeof raw.payload === "object"
      ? (raw.payload as Record<string, unknown>)
      : {};
  const bodyFromTpl = buildSmsBody(templateKey, {
    federationName: "노원구축구협회",
    teamName: typeof raw.teamName === "string" ? raw.teamName : "",
    venueName: "",
    bookingDate: "",
    startTime: "",
    endTime: "",
    shortReservationCode:
      typeof payload.shortReservationCode === "string"
        ? payload.shortReservationCode
        : "",
    bankAccountGuide: "",
    totalAmount: 0,
  });
  const body =
    (typeof raw.body === "string" && raw.body.trim()) ||
    (typeof raw.message === "string" && raw.message.trim()) ||
    bodyFromTpl;

  const sendResult = await factory.sms.send({
    notificationId: doc.id,
    toPhone: phone,
    body,
    federationSlug,
    templateKey,
  });

  if (federationSlug) {
    await appendOpsProviderLog(db, {
      federationSlug,
      notificationId: doc.id,
      provider: sendResult.provider,
      providerMode: sendResult.providerMode,
      dryRun: sendResult.dryRun,
      toPhone: phone,
      templateKey,
      requestAt: sendResult.requestAt,
      responseAt: sendResult.responseAt,
      latencyMs: sendResult.latencyMs,
      httpStatus: sendResult.httpStatus,
      providerMessageId: sendResult.providerMessageId,
      ok: sendResult.ok,
      errorCode: sendResult.errorCode,
      errorMessage: sendResult.errorMessage,
    });
  }

  if (smsMode === "stub" || sendResult.dryRun) {
    await doc.ref.update({
      status: "queued_sms_pending",
      deliveryStatus: "queued",
      updatedAt: FieldValue.serverTimestamp(),
    });
    return {
      notificationId: doc.id,
      channel: "sms",
      dryRun: true,
      ok: sendResult.ok,
      statusUnchanged: true,
      deliveryStatus: "queued",
      providerMessageId: sendResult.providerMessageId,
    };
  }

  if (sendResult.ok) {
    await doc.ref.update({
      status: "sms_sent",
      deliveryStatus: "delivered",
      success: true,
      provider: sendResult.provider,
      providerMessageId: sendResult.providerMessageId,
      sentAt: FieldValue.serverTimestamp(),
      completedAt: FieldValue.serverTimestamp(),
      smsStatus: "sms_sent",
      errorCode: null,
      errorMessage: null,
      updatedAt: FieldValue.serverTimestamp(),
    });
    return {
      notificationId: doc.id,
      channel: "sms",
      dryRun: false,
      ok: true,
      status: "sms_sent",
      deliveryStatus: "delivered",
      providerMessageId: sendResult.providerMessageId,
    };
  }

  await doc.ref.update({
    status: "sms_failed",
    deliveryStatus: "failed",
    success: false,
    provider: sendResult.provider,
    providerMessageId: sendResult.providerMessageId,
    smsStatus: "sms_failed",
    completedAt: FieldValue.serverTimestamp(),
    errorCode: sendResult.errorCode,
    errorMessage: sendResult.errorMessage,
    updatedAt: FieldValue.serverTimestamp(),
  });
  logger.info("[processOutbound] sms failed", { id: doc.id, code: sendResult.errorCode });
  return {
    notificationId: doc.id,
    channel: "sms",
    dryRun: false,
    ok: false,
    status: "sms_failed",
    deliveryStatus: "failed",
    providerMessageId: sendResult.providerMessageId,
    errorCode: sendResult.errorCode,
    errorMessage: sendResult.errorMessage,
  };
}
