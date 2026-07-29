/**
 * PR4-3 Sprint A — Operations Center data (read-only until Sprint B/C).
 */

import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
  type QueryConstraint,
} from "firebase/firestore";
import { db, functions } from "@/lib/firebase";
import type {
  OpsDashboardStats,
  OpsDeliveryFilter,
  OpsMessageKind,
  OpsNotificationRow,
  OpsReservationRow,
  OpsSmsStatus,
} from "@/lib/federation/opsCenterTypes";
import type { OpsProviderLog } from "@/lib/federation/opsProviderLogTypes";
import { maskPhoneForLog } from "@/lib/federation/opsProviderLogTypes";
import { httpsCallable } from "firebase/functions";

const ROLE_LABEL: Record<string, string> = {
  chairman: "회장",
  manager: "총무",
  coach: "감독",
};

export function opsRoleLabel(role: string): string {
  return ROLE_LABEL[role] || role || "—";
}

export function opsKindLabel(kind: OpsMessageKind): string {
  switch (kind) {
    case "RESERVATION_ASSIGNED":
      return "예약배정";
    case "PAYMENT_APPROVED":
      return "입금확인";
    case "RESERVATION_CONFIRMED":
      return "예약확정";
    case "AI_REPORT_READY":
      return "AI리포트";
    default:
      return "기타";
  }
}

export function opsStatusLabel(status: OpsSmsStatus): string {
  switch (status) {
    case "queued":
      return "앱대기";
    case "queued_sms_pending":
      return "Queued";
    case "sending":
      return "Sending";
    case "sms_sent":
      return "Delivered";
    case "sms_failed":
      return "Failed";
    default:
      return status;
  }
}

export function opsDeliveryLabel(d: OpsDeliveryFilter | "other"): string {
  switch (d) {
    case "queued":
      return "Queued";
    case "sending":
      return "Sending";
    case "delivered":
      return "Delivered";
    case "failed":
      return "Failed";
    case "retry":
      return "Retry";
    default:
      return d;
  }
}

function toDate(v: unknown): Date | null {
  if (!v) return null;
  if (v instanceof Date) return v;
  if (typeof v === "object" && v && "toDate" in v && typeof (v as { toDate: () => Date }).toDate === "function") {
    try {
      return (v as { toDate: () => Date }).toDate();
    } catch {
      return null;
    }
  }
  if (typeof v === "string" || typeof v === "number") {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function parseKind(raw: Record<string, unknown>): OpsMessageKind {
  const key =
    (typeof raw.templateKey === "string" && raw.templateKey) ||
    (typeof raw.notificationType === "string" && raw.notificationType) ||
    "";
  if (key === "RESERVATION_ASSIGNED") return "RESERVATION_ASSIGNED";
  if (key === "PAYMENT_APPROVED" || key === "PAYMENT_CONFIRMED") return "PAYMENT_APPROVED";
  if (key === "RESERVATION_CONFIRMED") return "RESERVATION_CONFIRMED";
  if (key === "AI_REPORT_READY" || key === "GROWTH_REPORT_DELIVERED") return "AI_REPORT_READY";
  const payload = raw.payload && typeof raw.payload === "object" ? (raw.payload as Record<string, unknown>) : {};
  const pk = typeof payload.templateKey === "string" ? payload.templateKey : "";
  if (pk === "RESERVATION_ASSIGNED") return "RESERVATION_ASSIGNED";
  if (pk === "PAYMENT_APPROVED" || pk === "PAYMENT_CONFIRMED") return "PAYMENT_APPROVED";
  if (pk === "RESERVATION_CONFIRMED") return "RESERVATION_CONFIRMED";
  if (pk === "AI_REPORT_READY") return "AI_REPORT_READY";
  return "OTHER";
}

function parseSmsStatus(rawStatus: string): OpsSmsStatus {
  if (
    rawStatus === "queued" ||
    rawStatus === "queued_sms_pending" ||
    rawStatus === "sending" ||
    rawStatus === "sms_sent" ||
    rawStatus === "sms_failed"
  ) {
    return rawStatus;
  }
  return "other";
}

function parseDeliveryStatus(
  raw: Record<string, unknown>,
  status: OpsSmsStatus
): OpsDeliveryFilter | "other" {
  const d = typeof raw.deliveryStatus === "string" ? raw.deliveryStatus : "";
  if (
    d === "queued" ||
    d === "sending" ||
    d === "delivered" ||
    d === "failed" ||
    d === "retry"
  ) {
    return d;
  }
  const retryCount = typeof raw.retryCount === "number" ? raw.retryCount : 0;
  if (status === "queued_sms_pending" && retryCount > 0) return "retry";
  if (status === "queued_sms_pending" || status === "queued") return "queued";
  if (status === "sending") return "sending";
  if (status === "sms_sent") return "delivered";
  if (status === "sms_failed") return "failed";
  return "other";
}

function parseNotificationRow(id: string, raw: Record<string, unknown>): OpsNotificationRow {
  const payload =
    raw.payload && typeof raw.payload === "object" && !Array.isArray(raw.payload)
      ? (raw.payload as Record<string, unknown>)
      : {};
  const rawStatus = typeof raw.status === "string" ? raw.status : "";
  const status = parseSmsStatus(rawStatus);
  const federationSlug =
    (typeof raw.federationSlug === "string" && raw.federationSlug) ||
    (typeof payload.federationSlug === "string" && payload.federationSlug) ||
    null;
  return {
    id,
    createdAt: toDate(raw.createdAt),
    sentAt: toDate(raw.sentAt) || toDate(raw.smsSentAt),
    completedAt: toDate(raw.completedAt),
    teamName: typeof raw.teamName === "string" ? raw.teamName : "—",
    teamId: typeof raw.teamId === "string" ? raw.teamId : "",
    teamKind:
      raw.teamKind === "guest" || raw.teamKind === "platform" ? raw.teamKind : null,
    guestTeamId: typeof raw.guestTeamId === "string" ? raw.guestTeamId : null,
    recipientRole: typeof raw.recipientRole === "string" ? raw.recipientRole : "",
    recipientPhone:
      (typeof raw.recipientPhone === "string" && raw.recipientPhone) ||
      (typeof payload.recipientPhone === "string" && payload.recipientPhone) ||
      null,
    recipientUid:
      (typeof raw.recipientUid === "string" && raw.recipientUid) ||
      (typeof payload.recipientUid === "string" && payload.recipientUid) ||
      null,
    kind: parseKind(raw),
    status,
    deliveryStatus: parseDeliveryStatus(raw, status),
    rawStatus,
    provider: typeof raw.provider === "string" ? raw.provider : null,
    providerMessageId:
      typeof raw.providerMessageId === "string" ? raw.providerMessageId : null,
    requestId: typeof raw.requestId === "string" ? raw.requestId : null,
    errorCode: typeof raw.errorCode === "string" ? raw.errorCode : null,
    errorMessage: typeof raw.errorMessage === "string" ? raw.errorMessage : null,
    retryCount: typeof raw.retryCount === "number" ? raw.retryCount : 0,
    success: typeof raw.success === "boolean" ? raw.success : null,
    title: typeof raw.title === "string" ? raw.title : "",
    message: typeof raw.message === "string" ? raw.message : "",
    body: typeof raw.body === "string" ? raw.body : "",
    federationSlug,
    reservationId:
      (typeof payload.reservationId === "string" && payload.reservationId) || null,
    shortReservationCode:
      (typeof payload.shortReservationCode === "string" &&
        payload.shortReservationCode) ||
      null,
  };
}

/**
 * List venue/ops notifications for a federation.
 * Prefers top-level federationSlug; falls back to payload.federationSlug.
 */
export async function listFederationOpsNotifications(
  federationSlug: string,
  opts?: {
    status?: OpsSmsStatus | "all";
    kind?: OpsMessageKind | "all";
    max?: number;
  }
): Promise<OpsNotificationRow[]> {
  const max = opts?.max ?? 150;
  const col = collection(db, "notifications");

  const tryQueries: QueryConstraint[][] = [
    [where("federationSlug", "==", federationSlug), orderBy("createdAt", "desc"), limit(max)],
    [where("payload.federationSlug", "==", federationSlug), orderBy("createdAt", "desc"), limit(max)],
    [where("payload.federationSlug", "==", federationSlug), limit(max)],
  ];

  let rows: OpsNotificationRow[] = [];
  let lastErr: unknown = null;
  for (const constraints of tryQueries) {
    try {
      const snap = await getDocs(query(col, ...constraints));
      rows = snap.docs.map((d) => parseNotificationRow(d.id, d.data() as Record<string, unknown>));
      lastErr = null;
      break;
    } catch (e) {
      lastErr = e;
    }
  }
  if (lastErr && rows.length === 0) {
    // Last resort: change-log–adjacent guest/platform venue notifs via templateKey scan is too wide.
    // Surface empty with console for ops debug.
    console.warn("[opsCenter] listFederationOpsNotifications failed", lastErr);
    return [];
  }

  rows.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));

  let filtered = rows;
  if (opts?.status && opts.status !== "all") {
    filtered = filtered.filter((r) => r.status === opts.status);
  }
  if (opts?.kind && opts.kind !== "all") {
    filtered = filtered.filter((r) => r.kind === opts.kind);
  }
  return filtered;
}

export async function listFederationOpsReservations(
  federationSlug: string,
  max = 80
): Promise<OpsReservationRow[]> {
  const col = collection(db, "federations", federationSlug, "venueReservations");
  let snap;
  try {
    snap = await getDocs(query(col, orderBy("createdAt", "desc"), limit(max)));
  } catch {
    snap = await getDocs(query(col, limit(max)));
  }
  return snap.docs
    .map((d) => {
      const r = d.data() as Record<string, unknown>;
      return {
        id: d.id,
        teamName: typeof r.teamName === "string" ? r.teamName : "—",
        teamKind:
          r.teamKind === "guest" || r.teamKind === "platform" ? r.teamKind : null,
        venueName: typeof r.venueName === "string" ? r.venueName : "—",
        bookingDate: typeof r.bookingDate === "string" ? r.bookingDate : "",
        startTime: typeof r.startTime === "string" ? r.startTime : "",
        endTime: typeof r.endTime === "string" ? r.endTime : "",
        confirmStatus: typeof r.confirmStatus === "string" ? r.confirmStatus : "",
        paymentStatus: typeof r.paymentStatus === "string" ? r.paymentStatus : "",
        paymentClaimStatus:
          typeof r.paymentClaimStatus === "string" ? r.paymentClaimStatus : "",
        shortReservationCode:
          typeof r.shortReservationCode === "string" ? r.shortReservationCode : "",
        createdAt: toDate(r.createdAt),
      } satisfies OpsReservationRow;
    })
    .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
}

function startOfTodaySeoul(): Date {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const day = fmt.format(new Date()); // YYYY-MM-DD
  return new Date(`${day}T00:00:00+09:00`);
}

function startOfMonthSeoul(): Date {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
  });
  const parts = fmt.format(new Date()).split("-");
  const y = parts[0];
  const m = parts[1];
  return new Date(`${y}-${m}-01T00:00:00+09:00`);
}

export function buildOpsDashboardStats(rows: OpsNotificationRow[]): OpsDashboardStats {
  const today0 = startOfTodaySeoul().getTime();
  const month0 = startOfMonthSeoul().getTime();
  const today = rows.filter((r) => (r.createdAt?.getTime() || 0) >= today0);
  const month = rows.filter((r) => (r.createdAt?.getTime() || 0) >= month0);

  const todaySent = today.filter(
    (r) => r.status === "sms_sent" || r.deliveryStatus === "delivered"
  ).length;
  const todayFailed = today.filter(
    (r) => r.status === "sms_failed" || r.deliveryStatus === "failed"
  ).length;
  const monthSent = month.filter(
    (r) => r.status === "sms_sent" || r.deliveryStatus === "delivered"
  ).length;
  const monthFailed = month.filter(
    (r) => r.status === "sms_failed" || r.deliveryStatus === "failed"
  ).length;
  const decided = monthSent + monthFailed;

  return {
    todayTotal: today.length,
    todayQueued: today.filter((r) => r.status === "queued").length,
    todayPendingSms: today.filter(
      (r) =>
        r.status === "queued_sms_pending" || r.deliveryStatus === "queued"
    ).length,
    todaySending: today.filter(
      (r) => r.status === "sending" || r.deliveryStatus === "sending"
    ).length,
    todaySent,
    todayFailed,
    todayRetry: today.filter(
      (r) => r.retryCount > 0 || r.deliveryStatus === "retry"
    ).length,
    monthTotal: month.length,
    monthSent,
    monthFailed,
    monthAssigned: month.filter((r) => r.kind === "RESERVATION_ASSIGNED").length,
    monthConfirmed: month.filter((r) => r.kind === "RESERVATION_CONFIRMED").length,
    monthPayment: month.filter((r) => r.kind === "PAYMENT_APPROVED").length,
    successRate: decided > 0 ? Math.round((monthSent / decided) * 1000) / 10 : null,
  };
}

export function formatOpsPhone(phone: string | null): string {
  if (!phone) return "—";
  const d = phone.replace(/\D/g, "");
  if (d.length === 11) return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  return phone;
}

export function formatOpsTime(d: Date | null): string {
  if (!d) return "—";
  return d.toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export async function listFederationOpsProviderLogs(
  federationSlug: string,
  max = 50
): Promise<OpsProviderLog[]> {
  const col = collection(db, "federations", federationSlug, "opsProviderLogs");
  let snap;
  try {
    snap = await getDocs(query(col, orderBy("createdAt", "desc"), limit(max)));
  } catch {
    snap = await getDocs(query(col, limit(max)));
  }
  return snap.docs
    .map((d) => {
      const r = d.data() as Record<string, unknown>;
      return {
        id: d.id,
        federationSlug:
          typeof r.federationSlug === "string" ? r.federationSlug : federationSlug,
        notificationId:
          typeof r.notificationId === "string" ? r.notificationId : null,
        provider: typeof r.provider === "string" ? r.provider : "—",
        providerMode:
          r.providerMode === "sens" || r.providerMode === "kakao"
            ? r.providerMode
            : "stub",
        dryRun: r.dryRun === true,
        toPhoneMasked:
          typeof r.toPhoneMasked === "string"
            ? r.toPhoneMasked
            : maskPhoneForLog(typeof r.toPhone === "string" ? r.toPhone : null),
        templateKey: typeof r.templateKey === "string" ? r.templateKey : null,
        requestAt: toDate(r.requestAt),
        responseAt: toDate(r.responseAt),
        latencyMs: typeof r.latencyMs === "number" ? r.latencyMs : null,
        httpStatus: typeof r.httpStatus === "number" ? r.httpStatus : null,
        providerMessageId:
          typeof r.providerMessageId === "string" ? r.providerMessageId : null,
        ok: r.ok === true,
        errorCode: typeof r.errorCode === "string" ? r.errorCode : null,
        errorMessage: typeof r.errorMessage === "string" ? r.errorMessage : null,
        createdAt: toDate(r.createdAt),
      } satisfies OpsProviderLog;
    })
    .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
}

/** Manager callable — stub dry-run or live SMS/Kakao (Sprint C). */
export async function runConsumeQueuedSms(input: {
  federationSlug: string;
  limit?: number;
  notificationId?: string;
}): Promise<{
  ok: true;
  providerMode: string;
  processed: number;
  results: Array<Record<string, unknown>>;
}> {
  const callable = httpsCallable<
    typeof input,
    {
      ok: true;
      providerMode: string;
      processed: number;
      results: Array<Record<string, unknown>>;
    }
  >(functions, "consumeQueuedSms");
  const res = await callable(input);
  return res.data;
}

/** Sprint C — single or bulk retry of failed outbound notifications. */
export async function runRetryFailedNotifications(input: {
  federationSlug: string;
  notificationId?: string;
  bulk?: boolean;
  limit?: number;
}): Promise<{
  ok: true;
  processed: number;
  results: Array<Record<string, unknown>>;
}> {
  const callable = httpsCallable<
    typeof input,
    {
      ok: true;
      processed: number;
      results: Array<Record<string, unknown>>;
    }
  >(functions, "retryFailedNotifications");
  const res = await callable(input);
  return res.data;
}
