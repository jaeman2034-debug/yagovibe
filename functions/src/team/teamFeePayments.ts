import * as admin from "firebase-admin";
import type { DocumentData, DocumentSnapshot } from "firebase-admin/firestore";
import { createHash, createHmac, timingSafeEqual } from "crypto";
import * as logger from "firebase-functions/logger";
import { onCall, onRequest, HttpsError } from "firebase-functions/v2/https";
import { buildFeePaymentCorrelationId } from "../lib/feePaymentCorrelationId";
import { buildTeamFeePaymentDocId, parseTeamFeePaymentDocId } from "../lib/teamFeePaymentDocId";
import { isTeamFeeAutopayOrderId } from "../lib/tossTeamFeeOrderIds";
import { TRACKED_NOTIFICATION_EXPERIMENTS } from "../lib/notificationExperimentMetrics";
import { assertTeamMemberCountWithinPlan } from "../lib/teamPlan";
import { teamDocumentActivityPatch } from "../lib/teamActivityTouch";
import {
  buildFeePaymentPolicySnapshot,
  loadTeamFeePolicy,
  resolveAnnualPrepaidDiscountMonths,
} from "./teamFeePolicy";
import { voidCashBookEntryIfExistsBySourceRef } from "./accounting/createCashBookEntry";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const TOSS_SECRET_KEY = process.env.TOSS_SECRET_KEY || "";
const TOSS_WEBHOOK_SECRET = process.env.TOSS_WEBHOOK_SECRET || "";

/**
 * payments 도메인: amountDue = 해당 회차 청구액, amountPaid = 누적 납부액(부분납부 시 increment 누적).
 * amount는 레거시·토스 주문 금액과의 호환 필드.
 */

type TeamFeePaymentStatus = "paid" | "failed";

function requireTossSecretKey() {
  if (!TOSS_SECRET_KEY) {
    throw new HttpsError("failed-precondition", "TOSS_SECRET_KEY가 설정되지 않았습니다.");
  }
}

function mapTeamFeePaymentStatus(tossStatus: string | undefined): TeamFeePaymentStatus {
  return tossStatus === "DONE" ? "paid" : "failed";
}

function verifyTossWebhookSignature(body: string, signature: string, secret: string): boolean {
  const digest = createHmac("sha256", secret).update(body).digest("base64");
  try {
    return timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
  } catch {
    return false;
  }
}

function buildOrderId(teamId: string, feeId: string, uid: string) {
  const seed = `${teamId}:${feeId}:${uid}`;
  const digest = createHash("sha256").update(seed).digest("hex").slice(0, 28);
  return `team_fee_${digest}`;
}

function buildAnnualBulkPaymentId(
  teamId: string,
  userId: string,
  startMarker: string,
  months: number,
  totalAmount: number,
  paidAtIso: string
): string {
  const seed = `${teamId}:${userId}:${startMarker}:${months}:${totalAmount}:${paidAtIso}`;
  const digest = createHash("sha256").update(seed).digest("hex").slice(0, 20);
  return `annual_${digest}`;
}

function toDateFromFirestore(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (value instanceof admin.firestore.Timestamp) return value.toDate();
  if (value && typeof value === "object" && "toDate" in (value as Record<string, unknown>)) {
    try {
      const d = (value as { toDate: () => Date }).toDate();
      if (d instanceof Date && !Number.isNaN(d.getTime())) return d;
    } catch {
      return null;
    }
  }
  return null;
}

function monthKeyFromDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function monthTitleFromDate(d: Date): string {
  return `${d.getMonth() + 1}월 회비`;
}

function addMonthsKeepingDay(base: Date, monthOffset: number): Date {
  const y = base.getFullYear();
  const m = base.getMonth() + monthOffset;
  const day = base.getDate();
  const lastDay = new Date(y, m + 1, 0).getDate();
  return new Date(y, m, Math.min(day, lastDay));
}

function parsePaidAtToTimestamp(raw: unknown): admin.firestore.Timestamp {
  if (raw instanceof admin.firestore.Timestamp) return raw;
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    return admin.firestore.Timestamp.fromDate(raw);
  }
  if (typeof raw === "string" && raw.trim()) {
    const d = new Date(raw);
    if (!Number.isNaN(d.getTime())) return admin.firestore.Timestamp.fromDate(d);
  }
  throw new HttpsError("invalid-argument", "paidAt 형식이 올바르지 않습니다.");
}

async function resolveValidatedFeeAttributionForPayment(
  uid: string,
  teamId: string,
  feeId: string,
  notificationIdRaw: unknown
): Promise<{ experiment: string; variant: "A" | "B"; attributionNotificationId: string } | null> {
  const notificationId = typeof notificationIdRaw === "string" ? notificationIdRaw.trim() : "";
  if (!notificationId) return null;

  const snap = await db.doc(`notifications/${notificationId}`).get();
  if (!snap.exists) return null;
  const n = snap.data() || {};
  const targetUid =
    (typeof n.userId === "string" && n.userId) ||
    (typeof n.targetUid === "string" && n.targetUid) ||
    "";
  if (targetUid !== uid) return null;
  if ((typeof n.teamId === "string" ? n.teamId : "") !== teamId) return null;
  const nFeeId = typeof n.feeId === "string" ? n.feeId : "";
  if (nFeeId && nFeeId !== feeId) return null;
  const t = typeof n.type === "string" ? n.type : "";
  if (t !== "fee_reminder" && t !== "billing_re_register_request") return null;
  const experiment = typeof n.experiment === "string" ? n.experiment.trim() : "";
  const variant = n.variant === "A" || n.variant === "B" ? n.variant : null;
  if (!variant || !TRACKED_NOTIFICATION_EXPERIMENTS.has(experiment)) return null;

  return { experiment, variant, attributionNotificationId: notificationId };
}

/**
 * 회비·장부에서 쓰는 billing 키(멤버 문서 ID 또는 Auth `userId`)로 활성 멤버 스냅샷 조회.
 * 직접 추가 후 문서 ID만 있는 멤버 · 연결 후 `userId`만 일치하는 멤버 모두 커버.
 */
export async function getActiveTeamMemberDocSnap(
  teamId: string,
  billingKey: string
): Promise<DocumentSnapshot | null> {
  const key = String(billingKey || "").trim();
  if (!teamId || !key) return null;

  const col = db.collection("teams").doc(teamId).collection("members");
  const direct = await col.doc(key).get();
  if (direct.exists) {
    const st = String(direct.data()?.status ?? "active").trim().toLowerCase();
    if (st === "active") return direct;
  }

  const byUserId = await col.where("userId", "==", key).limit(3).get();
  for (const d of byUserId.docs) {
    const st = String(d.data()?.status ?? "active").trim().toLowerCase();
    if (st === "active") return d;
  }
  return null;
}

export async function ensureActiveTeamMember(teamId: string, uid: string) {
  const memberSnap = await getActiveTeamMemberDocSnap(teamId, uid);
  if (!memberSnap?.exists) {
    throw new HttpsError("permission-denied", "팀 멤버만 결제할 수 있습니다.");
  }
}

async function resolveMemberDisplayName(teamId: string, uid: string): Promise<string | null> {
  try {
    const snap = await getActiveTeamMemberDocSnap(teamId, uid);
    if (!snap?.exists) return null;
    const data = snap.data() || {};
    const name =
      (typeof data.name === "string" && data.name.trim()) ||
      (typeof data.displayName === "string" && data.displayName.trim()) ||
      (typeof data.userName === "string" && data.userName.trim()) ||
      "";
    return name || null;
  } catch {
    return null;
  }
}

/** 회비 총무/스태프 — Firestore `isHubTeamStaff` 와 동급 (부팀장·매니저 포함) */
export async function assertHubTeamStaffForManualFee(teamId: string, actorUid: string): Promise<void> {
  const teamSnap = await db.doc(`teams/${teamId}`).get();
  if (!teamSnap.exists) {
    throw new HttpsError("not-found", "팀을 찾을 수 없습니다.");
  }
  const ownerUid = String((teamSnap.data() as Record<string, unknown>)?.ownerUid || "");
  if (ownerUid && ownerUid === actorUid) {
    return;
  }

  const memberSnap = await db.doc(`teams/${teamId}/members/${actorUid}`).get();
  if (!memberSnap.exists) {
    throw new HttpsError("permission-denied", "팀 스태프만 수동 납부를 기록할 수 있습니다.");
  }
  const m = memberSnap.data() || {};
  const status = String(m.status || "active");
  if (status !== "active") {
    throw new HttpsError("permission-denied", "활성 팀원만 수동 납부를 기록할 수 있습니다.");
  }

  const roleRaw = String(m.role || "").trim();
  const role = roleRaw.toLowerCase();
  const accessLevel = String(m.accessLevel || "").trim();
  const staffRoles = new Set([
    "owner",
    "manager",
    "coach",
    "admin",
    "vice",
    "부팀장",
    "총무",
    "관리자",
    "운영자",
  ]);
  if (accessLevel === "ADMIN" || staffRoles.has(role) || staffRoles.has(roleRaw)) {
    return;
  }

  throw new HttpsError("permission-denied", "팀 스태프만 수동 납부를 기록할 수 있습니다.");
}

/**
 * merge 시 기존 `createdAt`이 Timestamp가 아니면 Firestore 인코딩에서 런타임 예외가 날 수 있다.
 * (직렬화된 plain object, 잘못된 타입 등)
 */
function safeExistingPaymentCreatedAt(raw: unknown): admin.firestore.Timestamp | admin.firestore.FieldValue {
  if (raw instanceof admin.firestore.Timestamp) {
    return raw;
  }
  if (raw && typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    if (typeof o.toDate === "function") {
      try {
        const d = (o as { toDate: () => Date }).toDate();
        if (d instanceof Date && !Number.isNaN(d.getTime())) {
          return admin.firestore.Timestamp.fromDate(d);
        }
      } catch {
        /* fall through */
      }
    }
    const sec = o.seconds;
    const nan = o.nanoseconds ?? o.nanos;
    if (typeof sec === "number" && Number.isFinite(sec) && typeof nan === "number" && Number.isFinite(nan)) {
      try {
        return new admin.firestore.Timestamp(Math.trunc(sec), Math.trunc(nan));
      } catch {
        /* fall through */
      }
    }
  }
  return admin.firestore.FieldValue.serverTimestamp();
}

/** Firestore는 필드 값으로 `undefined`를 허용하지 않는다. Callable은 이 경우 곧바로 internal로 떨어진다. */
function assertNoUndefinedFirestoreFields(label: string, data: Record<string, unknown>, ctx: Record<string, string>) {
  for (const [key, val] of Object.entries(data)) {
    if (val === undefined) {
      logger.error("[recordManualTeamFeePayment] undefined field in payload", { label, key, ...ctx });
      throw new HttpsError(
        "failed-precondition",
        "납부 기록에 필요한 값이 비어 있어 저장할 수 없습니다. 새로고침 후 다시 시도해 주세요."
      );
    }
  }
}

/** 경로 세그먼트에 `/` 등이 있으면 잘못된 문서 경로로 이어져 commit 단계에서 터질 수 있다. */
function assertSafeFirestorePathSegment(fieldLabel: string, id: string) {
  const v = String(id || "").trim();
  if (!v) {
    throw new HttpsError("invalid-argument", `${fieldLabel}이(가) 필요합니다.`);
  }
  if (v.includes("/") || v.includes("\\") || v === "." || v === "..") {
    throw new HttpsError("invalid-argument", `유효하지 않은 ${fieldLabel}입니다.`);
  }
  if (v.length > 800) {
    throw new HttpsError("invalid-argument", `${fieldLabel}이(가) 너무 깁니다.`);
  }
}

async function confirmWithToss(paymentKey: string, orderId: string, amount: number) {
  requireTossSecretKey();
  const response = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${TOSS_SECRET_KEY}:`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      paymentKey,
      orderId,
      amount,
    }),
  });

  const responseText = await response.text();
  const responseJson = responseText
    ? (JSON.parse(responseText) as {
        code?: string;
        message?: string;
        approvedAt?: string;
        totalAmount?: number;
        status?: string;
        method?: string;
      })
    : {};

  if (!response.ok) {
    throw new HttpsError(
      "internal",
      responseJson.message || "토스 결제 승인 실패",
      { code: responseJson.code || "TOSS_CONFIRM_FAILED" }
    );
  }

  return responseJson as {
    approvedAt?: string;
    totalAmount?: number;
    status?: string;
    method?: string;
    code?: string;
    message?: string;
  };
}

async function getTossPayment(paymentKey: string) {
  requireTossSecretKey();
  const response = await fetch(`https://api.tosspayments.com/v1/payments/${paymentKey}`, {
    method: "GET",
    headers: {
      Authorization: `Basic ${Buffer.from(`${TOSS_SECRET_KEY}:`).toString("base64")}`,
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`토스 결제 조회 실패: ${errorBody}`);
  }
  return (await response.json()) as {
    orderId?: string;
    totalAmount?: number;
    status?: string;
    method?: string;
    approvedAt?: string;
    paymentKey?: string;
    code?: string;
    message?: string;
  };
}

export const createTeamFeePayment = onCall(
  { region: "asia-northeast3", cors: true, timeoutSeconds: 30 },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    }

    const uid = request.auth.uid;
    const teamId = String(request.data?.teamId || "");
    const feeId = String(request.data?.feeId || "");
    const origin = String(request.data?.origin || "");

    if (!teamId || !feeId || !origin) {
      throw new HttpsError("invalid-argument", "teamId, feeId, origin이 필요합니다.");
    }

    await ensureActiveTeamMember(teamId, uid);

    const feeRef = db.doc(`teams/${teamId}/fees/${feeId}`);
    const feeSnap = await feeRef.get();
    if (!feeSnap.exists) {
      throw new HttpsError("not-found", "회비를 찾을 수 없습니다.");
    }
    const feeData = feeSnap.data() || {};
    const amount = Number(feeData.amount || 0);
    if (amount <= 0) {
      throw new HttpsError("failed-precondition", "결제 금액이 올바르지 않습니다.");
    }
    if (feeData.status !== "open") {
      throw new HttpsError("failed-precondition", "마감된 회비입니다.");
    }

    const paymentRef = db.doc(`teams/${teamId}/payments/${buildTeamFeePaymentDocId(feeId, uid)}`);
    const paymentSnap = await paymentRef.get();
    const orderId = buildOrderId(teamId, feeId, uid);
    const orderName = String(feeData.title || "팀 회비");
    const memberName = await resolveMemberDisplayName(teamId, uid);

    if (paymentSnap.exists) {
      const paymentData = paymentSnap.data() || {};
      if (paymentData.status === "paid") {
        return { alreadyPaid: true };
      }
      const st = String(paymentData.status ?? "").trim().toLowerCase();
      if (st === "partial") {
        throw new HttpsError(
          "failed-precondition",
          "부분납부가 기록된 회차는 온라인 결제를 새로 시작할 수 없습니다. 잔액은 총무에게 문의해 주세요."
        );
      }
    }

    const attribution = await resolveValidatedFeeAttributionForPayment(
      uid,
      teamId,
      feeId,
      request.data?.feeAttributionNotificationId
    );

    const paymentPayload: Record<string, unknown> = {
      teamId,
      feeId,
      userId: uid,
      ...(memberName ? { memberName } : { memberName: admin.firestore.FieldValue.delete() }),
      amount,
      amountDue: amount,
      amountPaid: 0,
      status: "pending",
      orderId,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: paymentSnap.exists
        ? paymentSnap.data()?.createdAt || admin.firestore.FieldValue.serverTimestamp()
        : admin.firestore.FieldValue.serverTimestamp(),
    };

    if (attribution) {
      paymentPayload.experiment = attribution.experiment;
      paymentPayload.variant = attribution.variant;
      paymentPayload.attributionNotificationId = attribution.attributionNotificationId;
    } else {
      paymentPayload.experiment = admin.firestore.FieldValue.delete();
      paymentPayload.variant = admin.firestore.FieldValue.delete();
      paymentPayload.attributionNotificationId = admin.firestore.FieldValue.delete();
      paymentPayload.attributionType = admin.firestore.FieldValue.delete();
    }

    /** merge 유지 시 이전 연납 분해 필드가 남아 UI·집계가 흔들릴 수 있어 단건 결제 시도마다 정리 */
    Object.assign(paymentPayload, {
      source: admin.firestore.FieldValue.delete(),
      sourceType: admin.firestore.FieldValue.delete(),
      sourceBulkPaymentId: admin.firestore.FieldValue.delete(),
      annualBatchId: admin.firestore.FieldValue.delete(),
      allocatedFromAmount: admin.firestore.FieldValue.delete(),
      originalAmount: admin.firestore.FieldValue.delete(),
      finalAmount: admin.firestore.FieldValue.delete(),
      discountMonths: admin.firestore.FieldValue.delete(),
      discountApplied: admin.firestore.FieldValue.delete(),
      policySnapshot: admin.firestore.FieldValue.delete(),
      annualPayment: admin.firestore.FieldValue.delete(),
      allocationOrder: admin.firestore.FieldValue.delete(),
      appliedAt: admin.firestore.FieldValue.delete(),
      manualRecordedByUid: admin.firestore.FieldValue.delete(),
      manualRecordedAt: admin.firestore.FieldValue.delete(),
      paidAt: admin.firestore.FieldValue.delete(),
      method: admin.firestore.FieldValue.delete(),
      lastPaymentChunkAt: admin.firestore.FieldValue.delete(),
      lastPaymentChunkAmount: admin.firestore.FieldValue.delete(),
    });

    await paymentRef.set(paymentPayload, { merge: true });

    console.log("💳 payment_event", {
      phase: "create",
      teamId,
      feeId,
      userId: uid,
      orderId,
      status: "pending",
    });

    return {
      orderId,
      amount,
      orderName,
      successUrl: `${origin}/team/${encodeURIComponent(teamId)}?tab=home&feePayment=success&feeId=${encodeURIComponent(
        feeId
      )}&paymentKey={paymentKey}&orderId={orderId}&amount={amount}`,
      failUrl: `${origin}/team/${encodeURIComponent(teamId)}?tab=home&feePayment=fail&feeId=${encodeURIComponent(
        feeId
      )}&code={code}&message={message}`,
    };
  }
);

export const confirmTeamFeePayment = onCall(
  { region: "asia-northeast3", cors: true, timeoutSeconds: 30 },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    }

    const uid = request.auth.uid;
    const teamId = String(request.data?.teamId || "");
    const feeId = String(request.data?.feeId || "");
    const orderId = String(request.data?.orderId || "");
    const paymentKey = String(request.data?.paymentKey || "");
    const amount = Number(request.data?.amount || 0);

    if (!teamId || !feeId || !orderId || !paymentKey || amount <= 0) {
      throw new HttpsError("invalid-argument", "결제 승인 파라미터가 올바르지 않습니다.");
    }

    await ensureActiveTeamMember(teamId, uid);

    const feeRef = db.doc(`teams/${teamId}/fees/${feeId}`);
    const feeSnap = await feeRef.get();
    if (!feeSnap.exists) {
      throw new HttpsError("not-found", "회비를 찾을 수 없습니다.");
    }
    const feeAmount = Number(feeSnap.data()?.amount || 0);
    if (feeAmount <= 0 || feeAmount !== amount) {
      throw new HttpsError("invalid-argument", "결제 금액이 일치하지 않습니다.");
    }

    const paymentRef = db.doc(`teams/${teamId}/payments/${buildTeamFeePaymentDocId(feeId, uid)}`);
    const paymentSnap = await paymentRef.get();
    if (!paymentSnap.exists) {
      throw new HttpsError("not-found", "결제 요청 문서를 찾을 수 없습니다.");
    }

    const paymentData = paymentSnap.data() || {};
    if (paymentData.status === "paid") {
      return { success: true, alreadyPaid: true };
    }
    if (paymentData.orderId && paymentData.orderId !== orderId) {
      throw new HttpsError("invalid-argument", "주문 정보가 일치하지 않습니다.");
    }

    try {
      const tossResult = await confirmWithToss(paymentKey, orderId, amount);
      const normalizedStatus = mapTeamFeePaymentStatus(tossResult.status);

      await paymentRef.set(
        {
          status: normalizedStatus,
          paymentKey,
          orderId,
          amount,
          ...(normalizedStatus === "paid"
            ? { amountDue: feeAmount, amountPaid: amount }
            : {}),
          method: tossResult.method || null,
          paidAt:
            normalizedStatus === "paid"
              ? admin.firestore.FieldValue.serverTimestamp()
              : null,
          failCode: normalizedStatus === "failed" ? tossResult.code || "TOSS_NOT_DONE" : null,
          failReason: normalizedStatus === "failed" ? tossResult.message || "결제가 완료되지 않았습니다." : null,
          failedAt:
            normalizedStatus === "failed"
              ? admin.firestore.FieldValue.serverTimestamp()
              : null,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      console.log("💳 payment_event", {
        phase: "confirm",
        teamId,
        feeId,
        userId: uid,
        orderId,
        paymentKey,
        status: normalizedStatus,
      });

      return {
        success: normalizedStatus === "paid",
        status: tossResult.status || "UNKNOWN",
      };
    } catch (error) {
      const failCode =
        error instanceof HttpsError && error.details && typeof error.details === "object"
          ? String((error.details as { code?: string }).code || "TOSS_CONFIRM_FAILED")
          : "TOSS_CONFIRM_FAILED";
      const failReason =
        error instanceof Error ? error.message : "결제 승인 중 오류가 발생했습니다.";

      await paymentRef.set(
        {
          status: "failed",
          paymentKey,
          orderId,
          amount,
          failCode,
          failReason,
          failedAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      console.error("💳 payment_event", {
        phase: "confirm",
        teamId,
        feeId,
        userId: uid,
        orderId,
        paymentKey,
        status: "failed",
        failCode,
        failReason,
      });
      throw error;
    }
  }
);

export const teamFeePaymentWebhook = onRequest(
  { region: "asia-northeast3", cors: true, timeoutSeconds: 30 },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method Not Allowed" });
      return;
    }

    try {
      const webhookSignature = String(
        req.headers["toss-signature"] || req.headers["x-toss-signature"] || ""
      );
      const rawBody = req.rawBody?.toString();
      if (!rawBody || !webhookSignature) {
        res.status(400).json({ error: "Invalid request" });
        return;
      }
      if (!TOSS_WEBHOOK_SECRET) {
        res.status(500).json({ error: "Webhook secret is not configured" });
        return;
      }
      if (!verifyTossWebhookSignature(rawBody, webhookSignature, TOSS_WEBHOOK_SECRET)) {
        console.error("❌ Invalid webhook signature");
        res.status(403).json({ error: "Forbidden" });
        return;
      }

      const paymentKey = String(req.body?.paymentKey || "");
      if (!paymentKey) {
        res.status(400).json({ error: "paymentKey가 필요합니다." });
        return;
      }

      const tossPayment = await getTossPayment(paymentKey);
      const orderId = String(tossPayment.orderId || "");
      const amount = Number(tossPayment.totalAmount || 0);
      if (!orderId || amount <= 0) {
        res.status(400).json({ error: "유효하지 않은 결제 정보입니다." });
        return;
      }

      const paymentSnap = await db
        .collectionGroup("payments")
        .where("orderId", "==", orderId)
        .limit(1)
        .get();

      if (paymentSnap.empty) {
        res.status(404).json({ error: "결제 문서를 찾을 수 없습니다." });
        return;
      }

      const target = paymentSnap.docs[0];
      const current = target.data() || {};
      if (current.status === "paid") {
        console.log("💳 payment_event", {
          phase: "webhook",
          orderId,
          paymentKey,
          status: "already_paid",
        });
        res.status(200).json({ success: true, alreadyPaid: true });
        return;
      }

      const expectedOrderAmount = Number(current.amount ?? current.amountDue ?? 0);
      if (expectedOrderAmount !== amount) {
        res.status(400).json({ error: "금액 불일치" });
        return;
      }

      const normalizedStatus = mapTeamFeePaymentStatus(tossPayment.status);
      const paymentSource = isTeamFeeAutopayOrderId(orderId)
        ? "autopay"
        : typeof current.source === "string"
          ? current.source
          : "manual";

      /** 웹훅 payload에 feeId/userId 없음 → cashBook 트리거가 skip. teams/.../payments/{feeId}_{userId}면 문서 ID로 보강 */
      const segs = target.ref.path.split("/");
      let feeIdPatch = String(current.feeId || "").trim();
      let userIdPatch = String(current.userId || "").trim();
      if (
        (!feeIdPatch || !userIdPatch) &&
        segs.length === 4 &&
        segs[0] === "teams" &&
        segs[2] === "payments"
      ) {
        const parsed = parseTeamFeePaymentDocId(segs[3]);
        if (parsed) {
          if (!feeIdPatch) feeIdPatch = parsed.feeId;
          if (!userIdPatch) userIdPatch = parsed.userId;
        }
      }
      if ((!String(current.feeId || "").trim() || !String(current.userId || "").trim()) && feeIdPatch && userIdPatch) {
        logger.info("💳 payment_event", {
          phase: "webhook",
          action: "patch_fee_user_from_payment_doc_id",
          path: target.ref.path,
          feeId: feeIdPatch,
          userId: userIdPatch,
        });
      }

      const teamIdFromPath = segs[0] === "teams" && segs[1] ? segs[1] : "";
      const teamIdResolved = String(current.teamId || "").trim() || teamIdFromPath;

      let feeAmountForDue = amount;
      if (normalizedStatus === "paid" && feeIdPatch && teamIdResolved) {
        const feeSnap = await db.doc(`teams/${teamIdResolved}/fees/${feeIdPatch}`).get();
        if (feeSnap.exists) {
          const fa = Math.floor(Number(feeSnap.data()?.amount || 0));
          if (fa > 0) feeAmountForDue = fa;
        }
      }

      const patch: Record<string, unknown> = {
        status: normalizedStatus,
        paymentKey,
        method: tossPayment.method || null,
        source: paymentSource,
        paidAt:
          normalizedStatus === "paid"
            ? admin.firestore.FieldValue.serverTimestamp()
            : null,
        failCode: normalizedStatus === "failed" ? tossPayment.code || "TOSS_WEBHOOK_FAILED" : null,
        failReason:
          normalizedStatus === "failed"
            ? tossPayment.message || "결제가 완료되지 않았습니다."
            : null,
        failedAt:
          normalizedStatus === "failed"
            ? admin.firestore.FieldValue.serverTimestamp()
            : null,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      if (normalizedStatus === "paid") {
        patch.amount = amount;
        patch.amountDue = feeAmountForDue;
        patch.amountPaid = amount;
      }
      if (feeIdPatch) patch.feeId = feeIdPatch;
      if (userIdPatch) patch.userId = userIdPatch;
      if (teamIdFromPath && !String(current.teamId || "").trim()) patch.teamId = teamIdFromPath;

      await target.ref.set(patch, { merge: true });

      console.log("💳 payment_event", {
        phase: "webhook",
        orderId,
        paymentKey,
        status: normalizedStatus,
      });

      res.status(200).json({ success: true });
    } catch (error) {
      console.error("[teamFeePaymentWebhook] 처리 실패:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

/**
 * 현금·계좌이체 등 오프라인 수납을 `payments`에 반영 + 감사 로그 1건.
 * 클라이언트는 payments 에 update 권한이 없으므로 Callable 전용.
 */
export const recordManualTeamFeePayment = onCall(
  { region: "asia-northeast3", cors: true, timeoutSeconds: 30 },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    }

    const actorUid = request.auth.uid;
    const teamId = String(request.data?.teamId || "").trim();
    const feeId = String(request.data?.feeId || "").trim();
    const targetUid = String(request.data?.targetUid || "").trim();

    try {
      if (!teamId || !feeId || !targetUid) {
        throw new HttpsError("invalid-argument", "teamId, feeId, targetUid가 필요합니다.");
      }
      assertSafeFirestorePathSegment("teamId", teamId);
      assertSafeFirestorePathSegment("feeId", feeId);
      assertSafeFirestorePathSegment("targetUid", targetUid);

      await assertHubTeamStaffForManualFee(teamId, actorUid);
      await ensureActiveTeamMember(teamId, targetUid);
      await assertTeamMemberCountWithinPlan(teamId);

      const feeRef = db.doc(`teams/${teamId}/fees/${feeId}`);
      const feeSnap = await feeRef.get();
      if (!feeSnap.exists) {
        throw new HttpsError("not-found", "회비를 찾을 수 없습니다.");
      }
      const feeData = feeSnap.data() || {};
      if (feeData.status !== "open") {
        throw new HttpsError("failed-precondition", "마감된 회비에는 납부를 기록할 수 없습니다.");
      }
      const feeAmount = Math.floor(Number(feeData.amount || 0));
      if (!Number.isFinite(feeAmount) || feeAmount <= 0) {
        throw new HttpsError("failed-precondition", "회비 금액이 올바르지 않습니다.");
      }

      const paymentRef = db.doc(`teams/${teamId}/payments/${buildTeamFeePaymentDocId(feeId, targetUid)}`);
      const paymentSnap = await paymentRef.get();
      const prev = paymentSnap.exists ? paymentSnap.data() || {} : {};

      /** 이미 완납이면 감사 로그·payments 쓰기 없이 종료 (멱등) */
      if (prev.status === "paid") {
        const correlationId = buildFeePaymentCorrelationId(feeId, targetUid);
        console.log("💳 payment_event", {
          level: "warn",
          phase: "manual_mark_paid_skipped",
          action: "manual_payment_idempotent",
          correlationId,
          teamId,
          feeId,
          userId: targetUid,
          by: actorUid,
        });
        return { success: true, alreadyPaid: true as const };
      }
      const prevStatusNorm = String(prev.status ?? "").trim().toLowerCase();
      if (prevStatusNorm === "partial") {
        throw new HttpsError(
          "failed-precondition",
          "부분납부가 진행 중인 멤버입니다. 잔액은 부분납부 기록으로 반영하거나, 롤백 후 전액 수동 완납을 사용해 주세요."
        );
      }
      const prevOrderId = typeof prev.orderId === "string" ? prev.orderId.trim() : "";
      const onlineCheckoutInFlight =
        prev.status === "pending" &&
        prevOrderId.length > 0 &&
        !prevOrderId.startsWith("manual_fee_");
      const confirmOfflineDespiteOnlinePending =
        request.data?.confirmOfflineDespiteOnlinePending === true ||
        request.data?.confirmOfflineDespiteOnlinePending === "true";
      if (onlineCheckoutInFlight && !confirmOfflineDespiteOnlinePending) {
        throw new HttpsError(
          "failed-precondition",
          "온라인 결제가 진행 중으로 표시되어 있습니다. 현금·계좌로 받았다면 「납부 처리」에서 확인란을 선택한 뒤 완납 기록해 주세요."
        );
      }
      if (onlineCheckoutInFlight && confirmOfflineDespiteOnlinePending) {
        logger.warn("[recordManualTeamFeePayment] offline_manual_overrides_pending_checkout", {
          teamId,
          feeId,
          targetUid,
          actorUid,
          supersededCheckoutOrderId: prevOrderId,
        });
      }

      const prevAmountRaw = prev.amount;
      const prevAmount =
        typeof prevAmountRaw === "number"
          ? Math.floor(prevAmountRaw)
          : typeof prevAmountRaw === "string"
            ? Math.floor(Number(prevAmountRaw))
            : NaN;
      if (
        Number.isFinite(prevAmount) &&
        prevAmount > 0 &&
        prevAmount !== feeAmount
      ) {
        throw new HttpsError(
          "failed-precondition",
          "저장된 납부 금액이 이번 회비 금액과 일치하지 않습니다. 데이터를 확인한 뒤 다시 시도해 주세요."
        );
      }
      if (!Number.isFinite(prevAmount) || prevAmount <= 0) {
        logger.warn("[recordManualTeamFeePayment] repair amount before paid", {
          teamId,
          feeId,
          targetUid,
          prevAmountRaw: prev.amount,
          repairedAmount: feeAmount,
        });
      }

      let memberName: string | null = null;
      try {
        const mem = await getActiveTeamMemberDocSnap(teamId, targetUid);
        if (mem?.exists) {
          const md = mem.data() || {};
          memberName =
            (typeof md.name === "string" && md.name.trim()) ||
            (typeof md.displayName === "string" && md.displayName.trim()) ||
            null;
        }
      } catch {
        /* ignore */
      }

      const orderId = buildFeePaymentCorrelationId(feeId, targetUid);
      const batch = db.batch();

      const paymentPayload: Record<string, unknown> = {
        teamId,
        feeId,
        userId: targetUid,
        ...(memberName ? { memberName } : { memberName: admin.firestore.FieldValue.delete() }),
        amount: feeAmount,
        amountDue: feeAmount,
        amountPaid: feeAmount,
        status: "paid",
        source: "manual",
        orderId,
        paymentKey: admin.firestore.FieldValue.delete(),
        method: "manual_offline",
        paidAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: prev.createdAt ? safeExistingPaymentCreatedAt(prev.createdAt) : admin.firestore.FieldValue.serverTimestamp(),
        manualRecordedByUid: actorUid,
        manualRecordedAt: admin.firestore.FieldValue.serverTimestamp(),
        failCode: admin.firestore.FieldValue.delete(),
        failReason: admin.firestore.FieldValue.delete(),
        failedAt: admin.firestore.FieldValue.delete(),
        experiment: admin.firestore.FieldValue.delete(),
        variant: admin.firestore.FieldValue.delete(),
        attributionNotificationId: admin.firestore.FieldValue.delete(),
        attributionType: admin.firestore.FieldValue.delete(),
      };
      assertNoUndefinedFirestoreFields("payment", paymentPayload, { teamId, feeId, targetUid, actorUid });
      batch.set(paymentRef, paymentPayload as DocumentData, { merge: true });

      const auditRef = feeRef.collection("paymentAuditLog").doc();
      const auditPayload: Record<string, unknown> = {
        type: "manual_mark_paid",
        teamId,
        feeId,
        targetUid,
        amount: feeAmount,
        recordedByUid: actorUid,
        orderId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        ...(onlineCheckoutInFlight && confirmOfflineDespiteOnlinePending
          ? {
              offlineOverridesOnlinePending: true,
              supersededCheckoutOrderId: prevOrderId || null,
            }
          : {}),
      };
      assertNoUndefinedFirestoreFields("paymentAuditLog", auditPayload, { teamId, feeId, targetUid, actorUid });
      batch.set(auditRef, auditPayload as DocumentData);
      batch.set(db.doc(`teams/${teamId}`), teamDocumentActivityPatch() as DocumentData, { merge: true });

      try {
        await batch.commit();
      } catch (commitErr) {
        logger.error("[recordManualTeamFeePayment] batch.commit failed", {
          teamId,
          feeId,
          targetUid,
          actorUid,
          message: commitErr instanceof Error ? commitErr.message : String(commitErr),
          stack: commitErr instanceof Error ? commitErr.stack : undefined,
        });
        throw commitErr;
      }

      console.log("💳 payment_event", {
        level: "info",
        phase: "manual_mark_paid",
        action: "manual_payment_recorded",
        correlationId: orderId,
        teamId,
        feeId,
        userId: targetUid,
        by: actorUid,
        amount: feeAmount,
        orderId,
      });

      return { success: true as const, alreadyPaid: false as const };
    } catch (e) {
      if (e instanceof HttpsError) {
        throw e;
      }
      const errMsg = e instanceof Error ? e.message : String(e);
      const errStack = e instanceof Error ? e.stack : undefined;
      logger.error("[recordManualTeamFeePayment] unexpected", {
        teamId,
        feeId,
        targetUid,
        actorUid,
        message: errMsg,
        stack: errStack,
      });
      throw new HttpsError(
        "internal",
        "납부 기록 처리 중 서버 오류가 발생했습니다. Cloud Logging에서 [recordManualTeamFeePayment]를 검색해 주세요."
      );
    }
  }
);

export const registerAnnualPrepaidPayment = onCall(
  { region: "asia-northeast3", cors: true, timeoutSeconds: 90 },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    }

    const actorUid = request.auth.uid;
    const teamId = String(request.data?.teamId || "").trim();
    const targetUid = String(request.data?.userId || "").trim();
    const startFeeId = String(request.data?.startFeeId || "").trim();
    const startMonth = String(request.data?.startMonth || "").trim();
    const months = Math.floor(Number(request.data?.months || 0));
    const totalAmountLegacy = Math.floor(Number(request.data?.totalAmount ?? 0));
    const finalAmountFromClient = Math.floor(Number(request.data?.finalAmount ?? NaN));
    const originalAmountFromClient = Math.floor(Number(request.data?.originalAmount ?? NaN));
    const discountMonthsRaw = Math.floor(Number(request.data?.discountMonths ?? 0));
    const discountTypeRaw = String(request.data?.discountType || "NONE").trim().toUpperCase();
    const isOverride = Boolean(request.data?.isOverride);
    const overrideReasonRaw = String(request.data?.overrideReason || "").trim();
    const paidAtTs = parsePaidAtToTimestamp(request.data?.paidAt);

    if (!teamId || !targetUid) {
      throw new HttpsError("invalid-argument", "teamId, userId가 필요합니다.");
    }
    if (!startFeeId && !startMonth) {
      throw new HttpsError("invalid-argument", "startFeeId 또는 startMonth가 필요합니다.");
    }
    if (!Number.isFinite(months) || months <= 0 || months > 24) {
      throw new HttpsError("invalid-argument", "months는 1~24 범위여야 합니다.");
    }
    assertSafeFirestorePathSegment("teamId", teamId);
    assertSafeFirestorePathSegment("userId", targetUid);
    if (startFeeId) assertSafeFirestorePathSegment("startFeeId", startFeeId);

    try {
      await assertHubTeamStaffForManualFee(teamId, actorUid);
      await ensureActiveTeamMember(teamId, targetUid);
      await assertTeamMemberCountWithinPlan(teamId);
      const targetMemberName = await resolveMemberDisplayName(teamId, targetUid);

      const feesSnap = await db
        .collection("teams")
        .doc(teamId)
        .collection("fees")
        .orderBy("dueDate", "asc")
        .get();
      if (feesSnap.empty) {
        throw new HttpsError("failed-precondition", "회비 차수가 없어 연납 분해를 진행할 수 없습니다.");
      }

      const feeDocs = feesSnap.docs.filter((d) => {
        const data = d.data() || {};
        return String(data.status || "open").trim().toLowerCase() !== "closed";
      });

      let startIndex = -1;
      if (startFeeId) {
        startIndex = feeDocs.findIndex((d) => d.id === startFeeId);
      } else {
        startIndex = feeDocs.findIndex((d) => {
          const data = d.data() || {};
          const autoMonthKey = String(data.autoMonthKey || "").trim();
          return autoMonthKey === startMonth;
        });
      }
      if (startIndex < 0) {
        throw new HttpsError("not-found", "연납 시작 회차를 찾을 수 없습니다.");
      }

      let targetFees = feeDocs.slice(startIndex, startIndex + months);
      if (targetFees.length < months) {
        const startFeeData = (feeDocs[startIndex].data() || {}) as Record<string, unknown>;
        const startDue = toDateFromFirestore(startFeeData.dueDate);
        const startAmount = Math.floor(Number(startFeeData.amount ?? 0));
        if (!startDue || !Number.isFinite(startAmount) || startAmount <= 0) {
          throw new HttpsError("failed-precondition", "연납 시작 회차 정보가 올바르지 않습니다.");
        }

        const existingMonthKeys = new Set<string>();
        for (const d of feesSnap.docs) {
          const data = (d.data() || {}) as Record<string, unknown>;
          const autoMonthKey = String(data.autoMonthKey || "").trim();
          if (autoMonthKey) {
            existingMonthKeys.add(autoMonthKey);
            continue;
          }
          const due = toDateFromFirestore(data.dueDate);
          if (due) existingMonthKeys.add(monthKeyFromDate(due));
        }

        const feesCol = db.collection("teams").doc(teamId).collection("fees");
        const createBatch = db.batch();
        let autoCreatedCount = 0;
        for (let i = 0; i < months; i += 1) {
          const dueDate = addMonthsKeepingDay(startDue, i);
          const monthKey = monthKeyFromDate(dueDate);
          if (existingMonthKeys.has(monthKey)) continue;
          const newFeeRef = feesCol.doc();
          createBatch.set(newFeeRef, {
            title: monthTitleFromDate(dueDate),
            amount: startAmount,
            dueDate: admin.firestore.Timestamp.fromDate(dueDate),
            status: "open",
            reminderSent: false,
            createdBy: actorUid,
            autoMonthKey: monthKey,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          existingMonthKeys.add(monthKey);
          autoCreatedCount += 1;
        }

        if (autoCreatedCount > 0) {
          await createBatch.commit();
          logger.info("[registerAnnualPrepaidPayment] auto created missing fee rounds", {
            teamId,
            actorUid,
            targetUid,
            startFeeId,
            startMonth,
            months,
            autoCreatedCount,
          });
        }

        const refreshedFeesSnap = await db
          .collection("teams")
          .doc(teamId)
          .collection("fees")
          .orderBy("dueDate", "asc")
          .get();
        const refreshedOpenFeeDocs = refreshedFeesSnap.docs.filter((d) => {
          const data = d.data() || {};
          return String(data.status || "open").trim().toLowerCase() !== "closed";
        });
        const refreshedStartIndex = startFeeId
          ? refreshedOpenFeeDocs.findIndex((d) => d.id === startFeeId)
          : refreshedOpenFeeDocs.findIndex((d) => {
              const data = d.data() || {};
              const autoMonthKey = String(data.autoMonthKey || "").trim();
              return autoMonthKey === startMonth;
            });
        if (refreshedStartIndex < 0) {
          throw new HttpsError("not-found", "연납 시작 회차를 찾을 수 없습니다.");
        }
        targetFees = refreshedOpenFeeDocs.slice(refreshedStartIndex, refreshedStartIndex + months);
      }
      if (targetFees.length < months) {
        throw new HttpsError("failed-precondition", "요청한 months 만큼의 회비 차수가 부족합니다.");
      }
      const targetFeeIds = targetFees.map((f) => f.id);
      if (new Set(targetFeeIds).size !== targetFeeIds.length) {
        throw new HttpsError("failed-precondition", "연납 분해 대상 회차에 중복 feeId가 있습니다.");
      }

      const refMonthly = Math.floor(
        Number((targetFees[0].data() as Record<string, unknown> | undefined)?.amount ?? 0)
      );
      if (!Number.isFinite(refMonthly) || refMonthly <= 0) {
        throw new HttpsError("invalid-argument", "연납 시작 회차의 회비 금액을 확인할 수 없습니다.");
      }

      const policy = await loadTeamFeePolicy(db, teamId);
      if (!policy.annual.enabled) {
        throw new HttpsError("failed-precondition", "팀 정책에서 연납이 비활성화되어 있습니다.");
      }
      const fixedAnnualMonths = 12;
      const fixedAnnualDiscountMonths = 2;
      if (months !== fixedAnnualMonths) {
        throw new HttpsError(
          "invalid-argument",
          `연납은 ${fixedAnnualMonths}개월만 허용됩니다.`
        );
      }
      const effectivePolicy = {
        ...policy,
        annual: {
          ...policy.annual,
          months: fixedAnnualMonths,
          discountMonths: fixedAnnualDiscountMonths,
        },
      };

      const wantsManualOverride = discountTypeRaw === "MANUAL" || isOverride;
      const canManualOverride = effectivePolicy.annual.allowManualOverride !== false;
      const discountMonths = resolveAnnualPrepaidDiscountMonths({
        policy: effectivePolicy,
        contractMonths: months,
        requestedRaw: Math.max(0, Math.min(fixedAnnualDiscountMonths, discountMonthsRaw)),
        nowMs: Date.now(),
        forceAllowOutsideEarlyBird: wantsManualOverride && canManualOverride,
      });
      const discountType =
        discountMonths <= 0
          ? "NONE"
          : wantsManualOverride && canManualOverride
            ? "MANUAL"
            : "EARLY_BIRD";

      const discountApplied = discountMonths > 0;
      const finalAmount = Math.floor(refMonthly * (months - discountMonths));
      const originalAmount = discountApplied ? Math.floor(refMonthly * months) : finalAmount;

      if (!Number.isFinite(finalAmount) || finalAmount <= 0) {
        throw new HttpsError("invalid-argument", "계산된 연납 금액이 올바르지 않습니다.");
      }

      const policySnapshot = buildFeePaymentPolicySnapshot(effectivePolicy, refMonthly, discountMonths);

      const base = Math.floor(finalAmount / months);
      const remainder = finalAmount - base * months;
      const paidAtIso = paidAtTs.toDate().toISOString();
      const startMarker = startFeeId || startMonth;
      const sourceBulkPaymentId = buildAnnualBulkPaymentId(
        teamId,
        targetUid,
        startMarker,
        months,
        finalAmount,
        paidAtIso
      );

      let created = 0;
      let skipped = 0;
      let totalAllocated = 0;
      let skippedAllocated = 0;
      const createdFeeIds: string[] = [];
      const skippedFeeIds: string[] = [];
      const batch = db.batch();

      for (let i = 0; i < targetFees.length; i += 1) {
        const feeDoc = targetFees[i];
        const feeId = feeDoc.id;
        const allocatedAmount = i === targetFees.length - 1 ? base + remainder : base;
        const paymentRef = db.doc(`teams/${teamId}/payments/${buildTeamFeePaymentDocId(feeId, targetUid)}`);
        const paymentSnap = await paymentRef.get();
        const prev = paymentSnap.exists ? paymentSnap.data() || {} : {};
        if (prev.status === "paid") {
          skipped += 1;
          skippedAllocated += allocatedAmount;
          skippedFeeIds.push(feeId);
          continue;
        }

        const prevStatusNorm = String(prev.status ?? "").trim().toLowerCase();
        if (prevStatusNorm === "pending") {
          const prevOrderId = typeof prev.orderId === "string" ? prev.orderId.trim() : "";
          const onlineCheckoutInFlight =
            prevOrderId.length > 0 && !prevOrderId.startsWith("manual_fee_");
          if (onlineCheckoutInFlight) {
            throw new HttpsError(
              "failed-precondition",
              "해당 멤버에 온라인 회비 결제가 진행 중인 회차가 있습니다. 완료 또는 실패 처리 후 연납 등록을 진행해 주세요."
            );
          }
        }
        if (prevStatusNorm === "partial") {
          throw new HttpsError(
            "failed-precondition",
            "부분납부가 진행 중인 회차가 있습니다. 정리 후 연납 등록을 진행해 주세요."
          );
        }

        const payload: Record<string, unknown> = {
          teamId,
          feeId,
          userId: targetUid,
          memberId: targetUid,
          ...(targetMemberName
            ? { memberName: targetMemberName }
            : { memberName: admin.firestore.FieldValue.delete() }),
          amount: allocatedAmount,
          amountDue: allocatedAmount,
          amountPaid: allocatedAmount,
          status: "paid",
          source: "annual",
          /** 첫 회차만 bulk+cashBook 대상, 이후 회차는 분해 행(cashBook 미기록) */
          sourceType: i === 0 ? "annual_prepaid" : "annual_prepaid_split",
          sourceBulkPaymentId,
          annualBatchId: sourceBulkPaymentId,
          appliedAt: admin.firestore.FieldValue.serverTimestamp(),
          allocatedFromAmount: finalAmount,
          originalAmount,
          finalAmount,
          discountMonths,
          discountApplied,
          policySnapshot,
          annualPayment: {
            baseAmount: originalAmount,
            finalAmount,
            discount: {
              type: discountType,
              discountMonths,
              appliedBy: actorUid,
              isOverride: discountType === "MANUAL",
              reason: discountType === "MANUAL" ? overrideReasonRaw || "관리자 수동 할인" : null,
            },
            overrideLog:
              discountType === "MANUAL"
                ? {
                    appliedAt: admin.firestore.FieldValue.serverTimestamp(),
                    appliedBy: actorUid,
                    reason: overrideReasonRaw || "관리자 수동 할인",
                  }
                : null,
          },
          allocationOrder: i + 1,
          method: "annual_prepaid",
          paidAt: paidAtTs,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          createdAt: prev.createdAt
            ? safeExistingPaymentCreatedAt(prev.createdAt)
            : admin.firestore.FieldValue.serverTimestamp(),
          manualRecordedByUid: actorUid,
          manualRecordedAt: admin.firestore.FieldValue.serverTimestamp(),
          paymentKey: admin.firestore.FieldValue.delete(),
          failCode: admin.firestore.FieldValue.delete(),
          failReason: admin.firestore.FieldValue.delete(),
          failedAt: admin.firestore.FieldValue.delete(),
        };
        assertNoUndefinedFirestoreFields("annualPayment", payload, { teamId, feeId, targetUid, actorUid });
        batch.set(paymentRef, payload as DocumentData, { merge: true });

        created += 1;
        totalAllocated += allocatedAmount;
        createdFeeIds.push(feeId);
      }

      if (created > 0) {
        const membersCol = db.collection("teams").doc(teamId).collection("members");
        const memberDocRefs = new Map<string, FirebaseFirestore.DocumentReference>();
        const byDirectId = membersCol.doc(targetUid);
        const byDirectIdSnap = await byDirectId.get();
        if (byDirectIdSnap.exists) {
          const st = String(byDirectIdSnap.data()?.status ?? "active").trim().toLowerCase();
          if (st === "active") memberDocRefs.set(byDirectId.path, byDirectId);
        }
        const byUserIdSnap = await membersCol.where("userId", "==", targetUid).limit(10).get();
        for (const d of byUserIdSnap.docs) {
          const st = String(d.data()?.status ?? "active").trim().toLowerCase();
          if (st !== "active") continue;
          memberDocRefs.set(d.ref.path, d.ref);
        }
        const fallbackMemberSnap = await getActiveTeamMemberDocSnap(teamId, targetUid);
        if (fallbackMemberSnap?.exists) {
          memberDocRefs.set(fallbackMemberSnap.ref.path, fallbackMemberSnap.ref);
        }
        if (memberDocRefs.size === 0) {
          memberDocRefs.set(byDirectId.path, byDirectId);
        }
        const yearlyPatch: DocumentData = {
          duesType: "yearly",
          yearlyPaidAt: paidAtTs,
          annualPaid: true,
          annualBatchId: sourceBulkPaymentId,
          annualAmount: finalAmount,
          annualBaseAmount: originalAmount,
          annualDiscountAmount: originalAmount - finalAmount,
          annualFinalAmount: finalAmount,
          annualDiscountMonths: discountMonths,
          annualDiscountType: discountType,
          annualDiscountLabel: discountMonths > 0 ? `${discountMonths}개월 할인` : "할인 없음",
          annualOverride: discountType === "MANUAL",
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        for (const memberRef of memberDocRefs.values()) {
          batch.set(memberRef, yearlyPatch, { merge: true });
        }
        batch.set(db.doc(`teams/${teamId}`), teamDocumentActivityPatch() as DocumentData, { merge: true });
        await batch.commit();
      }

      logger.info("[registerAnnualPrepaidPayment] completed", {
        teamId,
        targetUid,
        actorUid,
        months,
        finalAmount,
        originalAmount,
        discountMonths,
        discountApplied,
        created,
        skipped,
        totalAllocated,
        skippedAllocated,
        sourceBulkPaymentId,
      });

      return {
        success: true as const,
        sourceBulkPaymentId,
        created,
        skipped,
        totalAllocated,
        skippedAllocated,
        remainderAppliedToLast: remainder,
        createdFeeIds,
        skippedFeeIds,
      };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      logger.error("[registerAnnualPrepaidPayment] unexpected", {
        teamId,
        targetUid,
        actorUid,
        startFeeId,
        startMonth,
        months,
        finalAmount: finalAmountFromClient,
        totalAmountLegacy,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw new HttpsError(
        "internal",
        "연납 처리 중 서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요."
      );
    }
  }
);

export const cancelAnnualPrepaidPayment = onCall(
  { region: "asia-northeast3", cors: true, timeoutSeconds: 90 },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    const actorUid = request.auth.uid;
    const teamId = String(request.data?.teamId || "").trim();
    const memberId = String(request.data?.memberId || "").trim();
    const annualBatchIdInput = String(request.data?.annualBatchId || "").trim();
    if (!teamId || !memberId) {
      throw new HttpsError("invalid-argument", "teamId, memberId가 필요합니다.");
    }
    assertSafeFirestorePathSegment("teamId", teamId);
    assertSafeFirestorePathSegment("memberId", memberId);
    await assertHubTeamStaffForManualFee(teamId, actorUid);

    const membersCol = db.collection("teams").doc(teamId).collection("members");
    let memberRef = membersCol.doc(memberId);
    let memberSnap = await memberRef.get();
    if (!memberSnap.exists) {
      const byUserIdSnap = await membersCol.where("userId", "==", memberId).limit(1).get();
      if (!byUserIdSnap.empty) {
        memberSnap = byUserIdSnap.docs[0];
        memberRef = memberSnap.ref;
      }
    }
    if (!memberSnap.exists) throw new HttpsError("not-found", "멤버를 찾을 수 없습니다.");
    const member = memberSnap.data() || {};
    const annualBatchId =
      annualBatchIdInput || (typeof member.annualBatchId === "string" ? member.annualBatchId.trim() : "");
    if (!annualBatchId) {
      throw new HttpsError("failed-precondition", "연납 취소에 필요한 annualBatchId가 없습니다.");
    }
    logger.info("[cancelAnnualPrepaidPayment] rollback batch", {
      teamId,
      actorUid,
      requestMemberId: memberId,
      resolvedMemberDocId: memberRef.id,
      annualBatchId,
    });

    const paymentsByAnnualBatchSnap = await db
      .collection("teams")
      .doc(teamId)
      .collection("payments")
      .where("annualBatchId", "==", annualBatchId)
      .get();
    const paymentsBySourceBulkSnap = await db
      .collection("teams")
      .doc(teamId)
      .collection("payments")
      .where("sourceBulkPaymentId", "==", annualBatchId)
      .get();
    const mergedPaymentsMap = new Map<string, FirebaseFirestore.QueryDocumentSnapshot>();
    for (const d of paymentsByAnnualBatchSnap.docs) mergedPaymentsMap.set(d.id, d);
    for (const d of paymentsBySourceBulkSnap.docs) mergedPaymentsMap.set(d.id, d);
    const paymentDocs = Array.from(mergedPaymentsMap.values());
    logger.info("[cancelAnnualPrepaidPayment] payments found", {
      teamId,
      annualBatchId,
      byAnnualBatchId: paymentsByAnnualBatchSnap.size,
      bySourceBulkPaymentId: paymentsBySourceBulkSnap.size,
      mergedCount: paymentDocs.length,
    });

    const batch = db.batch();
    let cancelledCount = 0;
    let skippedCount = 0;
    for (const paymentDoc of paymentDocs) {
      const data = paymentDoc.data() || {};
      const sourceType = String(data.sourceType || "").trim();
      const source = String(data.source || "").trim();
      const isAnnualSource =
        sourceType === "annual_prepaid" || sourceType === "annual_prepaid_split" || source === "annual";
      if (!isAnnualSource) {
        skippedCount += 1;
        continue;
      }
      batch.update(paymentDoc.ref, {
        status: "cancelled",
        cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
        cancelledReason: "annual_rollback",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      cancelledCount += 1;
    }
    if (cancelledCount === 0 && paymentDocs.length > 0) {
      throw new HttpsError("failed-precondition", "연납 롤백 대상 결제를 찾지 못했습니다.");
    }

    const memberDocRefs = new Map<string, FirebaseFirestore.DocumentReference>();
    memberDocRefs.set(memberRef.path, memberRef);
    const resolvedUserId = String((memberSnap.data() as Record<string, unknown>)?.userId || "").trim();
    if (resolvedUserId) {
      const byUserIdSnap = await membersCol.where("userId", "==", resolvedUserId).limit(10).get();
      for (const d of byUserIdSnap.docs) {
        const st = String(d.data()?.status ?? "active").trim().toLowerCase();
        if (st !== "active") continue;
        memberDocRefs.set(d.ref.path, d.ref);
      }
    }
    const monthlyPatch: DocumentData = {
      duesType: "monthly",
      feePlan: "monthly",
      annualPaid: false,
      annualAmount: null,
      annualBaseAmount: null,
      annualDiscountAmount: null,
      annualFinalAmount: null,
      annualDiscountMonths: null,
      annualDiscountType: null,
      annualDiscountLabel: null,
      annualOverride: false,
      annualBatchId: null,
      yearlyPaidAt: null,
      annualPaidAt: null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    for (const ref of memberDocRefs.values()) {
      batch.update(ref, monthlyPatch);
    }

    batch.set(db.doc(`teams/${teamId}`), teamDocumentActivityPatch() as DocumentData, { merge: true });
    await batch.commit();

    /** 연납 bulk 1건으로 들어간 현금출납부 수입(`onFeePaidCashBook`) — payments만 취소하면 잔액이 남으므로 동일 키로 역반영 */
    let cashBookVoided = false;
    try {
      const sourceRefId = `annual_prepaid:${teamId}:${annualBatchId}`;
      const v = await voidCashBookEntryIfExistsBySourceRef({
        teamId,
        sourceRefId,
        voidedByUid: actorUid,
        voidReason: "연납 취소",
      });
      cashBookVoided = v.voided;
    } catch (e) {
      logger.error("[cancelAnnualPrepaidPayment] cashBook_void_failed", {
        teamId,
        annualBatchId,
        message: e instanceof Error ? e.message : String(e),
      });
    }

    return { success: true, annualBatchId, cancelledCount, skippedCount, cashBookVoided };
  }
);
