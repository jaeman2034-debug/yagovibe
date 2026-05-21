import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";

type TxDoc = {
  amount?: number;
  remainingAmount?: number;
  incomeStatus?: string;
  category?: string;
  type?: string;
  leagueId?: string;
  competitionId?: string;
  teamId?: string;
  sourceId?: string;
  paymentLink?: string;
  paymentOrderId?: string;
  paymentLinkCreatedAt?: string;
  paidAmount?: number;
  refundAmount?: number;
  occurredAt?: string | null;
  paidAt?: string | null;
};

function toInt(v: unknown): number {
  const n = typeof v === "number" ? Math.floor(v) : Number.NaN;
  return Number.isFinite(n) ? n : 0;
}

function resolveRemaining(tx: TxDoc): number {
  const explicit = toInt(tx.remainingAmount);
  if (explicit !== 0) return explicit;
  const amount = Math.max(0, toInt(tx.amount));
  const paidAmount = Math.max(0, toInt(tx.paidAmount));
  const refundAmount = Math.max(0, toInt(tx.refundAmount));
  const netPaid = paidAmount - refundAmount;
  return amount - netPaid;
}

function normalizeDocId(v: string): string {
  return v.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 120);
}

function computeIncomeStatus(amount: number, paidAmount: number, refundAmount: number): {
  incomeStatus: "expected" | "partial" | "paid" | "overpaid";
  remainingAmount: number;
  netPaid: number;
} {
  const safeAmount = Math.max(0, toInt(amount));
  const safePaid = Math.max(0, toInt(paidAmount));
  const safeRefund = Math.max(0, toInt(refundAmount));
  const netPaid = safePaid - safeRefund;
  if (netPaid <= 0) {
    return { incomeStatus: "expected", remainingAmount: safeAmount, netPaid };
  }
  if (netPaid < safeAmount) {
    return { incomeStatus: "partial", remainingAmount: safeAmount - netPaid, netPaid };
  }
  if (netPaid === safeAmount) {
    return { incomeStatus: "paid", remainingAmount: 0, netPaid };
  }
  return { incomeStatus: "overpaid", remainingAmount: safeAmount - netPaid, netPaid };
}

async function createTossPaymentLink(args: {
  amount: number;
  orderId: string;
  orderName: string;
  successUrl: string;
  failUrl: string;
  metadata: Record<string, unknown>;
}): Promise<string> {
  const secretKey = String(process.env.TOSS_SECRET_KEY || "").trim();
  if (!secretKey) throw new Error("TOSS_SECRET_KEY is not configured");
  const auth = Buffer.from(`${secretKey}:`).toString("base64");
  const resp = await fetch("https://api.tosspayments.com/v1/payment-links", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${auth}`,
    },
    body: JSON.stringify({
      amount: args.amount,
      orderId: args.orderId,
      orderName: args.orderName,
      successUrl: args.successUrl,
      failUrl: args.failUrl,
      metadata: args.metadata,
    }),
  });
  if (!resp.ok) {
    const txt = await resp.text().catch(() => "");
    throw new Error(`toss payment-link failed: ${resp.status} ${txt.slice(0, 300)}`);
  }
  const data = (await resp.json()) as Record<string, unknown>;
  const url = typeof data.url === "string" ? data.url.trim() : "";
  if (!url) throw new Error("toss payment-link response has no url");
  return url;
}

async function ensureCompetitionFeePaymentLink(args: {
  fedId: string;
  txId: string;
  forceNew?: boolean;
}): Promise<{ paymentLink: string; orderId: string; amount: number }> {
  const db = getFirestore();
  const txRef = db.doc(`federations/${args.fedId}/transactions/${args.txId}`);
  const txSnap = await txRef.get();
  if (!txSnap.exists) throw new Error("expected transaction not found");
  const tx = (txSnap.data() || {}) as TxDoc;
  if (tx.type !== "income" || tx.category !== "competition_fee") {
    throw new Error("target transaction is not competition_fee income");
  }
  if (tx.incomeStatus === "paid" || tx.incomeStatus === "overpaid") throw new Error("already paid transaction");

  const prevLink = typeof tx.paymentLink === "string" ? tx.paymentLink.trim() : "";
  const prevOrderId = typeof tx.paymentOrderId === "string" ? tx.paymentOrderId.trim() : "";
  const amount = resolveRemaining(tx);
  if (amount <= 0) throw new Error("remaining amount is zero");

  if (!args.forceNew && prevLink && prevOrderId) {
    return { paymentLink: prevLink, orderId: prevOrderId, amount };
  }

  const appBase = String(process.env.APP_BASE_URL || "").trim();
  if (!appBase) throw new Error("APP_BASE_URL is not configured");

  const teamId = String(tx.teamId || "").trim();
  const competitionId = String(tx.competitionId || tx.leagueId || "").trim();
  const sourceId = String(tx.sourceId || "").trim();
  const orderId = `competition_${args.fedId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const successUrl = `${appBase}/payment/success?orderId=${encodeURIComponent(orderId)}`;
  const failUrl = `${appBase}/payment/fail?orderId=${encodeURIComponent(orderId)}`;
  const paymentLink = await createTossPaymentLink({
    amount,
    orderId,
    orderName: `${teamId || "팀"} 참가비`,
    successUrl,
    failUrl,
    metadata: {
      federationId: args.fedId,
      txId: args.txId,
      teamId,
      competitionId,
      applicationId: sourceId,
    },
  });

  const orderRef = db.doc(`payment_orders/${orderId}`);
  await db.runTransaction(async (t) => {
    t.set(
      txRef,
      {
        paymentProvider: "toss",
        paymentLink,
        paymentOrderId: orderId,
        paymentLinkCreatedAt: new Date().toISOString(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    t.set(orderRef, {
      orderId,
      provider: "toss",
      federationId: args.fedId,
      txId: args.txId,
      teamId: teamId || null,
      competitionId: competitionId || null,
      applicationId: sourceId || null,
      amount,
      status: "created",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });

  return { paymentLink, orderId, amount };
}

export async function handleCreateCompetitionFeePaymentLink(req: {
  auth?: { uid?: string };
  data?: { federationId?: string; txId?: string; forceNew?: boolean };
}) {
  const uid = req.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
  const fedId = String(req.data?.federationId || "").trim();
  const txId = String(req.data?.txId || "").trim();
  if (!fedId || !txId) throw new HttpsError("invalid-argument", "federationId/txId가 필요합니다.");

  const db = getFirestore();
  const userSnap = await db.doc(`users/${uid}`).get();
  const role = String((userSnap.data() || {}).role || "").toUpperCase();
  if (role !== "ADMIN") {
    const fedSnap = await db.doc(`federations/${fedId}`).get();
    const fd = (fedSnap.data() || {}) as Record<string, unknown>;
    const managerIds = new Set(
      [fd.ownerUid, ...(Array.isArray(fd.adminUids) ? (fd.adminUids as unknown[]) : [])]
        .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
        .map((v) => v.trim())
    );
    if (!managerIds.has(uid)) throw new HttpsError("permission-denied", "권한이 없습니다.");
  }

  try {
    const out = await ensureCompetitionFeePaymentLink({
      fedId,
      txId,
      forceNew: req.data?.forceNew === true,
    });
    return { ok: true, ...out };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new HttpsError("failed-precondition", msg);
  }
}

export async function buildCompetitionFeePaymentLinkForTx(args: {
  fedId: string;
  txId: string;
}): Promise<string | null> {
  try {
    const out = await ensureCompetitionFeePaymentLink({ fedId: args.fedId, txId: args.txId });
    return out.paymentLink;
  } catch {
    return null;
  }
}

export async function handleTossCompetitionWebhook(req: any, res: any): Promise<void> {
  try {
    const expectedToken = String(process.env.TOSS_WEBHOOK_TOKEN || "").trim();
    const gotToken = String(req.get("x-yago-webhook-token") || "").trim();
    if (expectedToken && gotToken !== expectedToken) {
      res.status(401).json({ ok: false, error: "invalid webhook token" });
      return;
    }

    const body = (req.body || {}) as Record<string, unknown>;
    const orderId = String(body.orderId || "").trim();
    const paymentKey = String(body.paymentKey || "").trim();
    const status = String(body.status || "").toUpperCase();
    const paidAmountRaw = toInt(body.totalAmount);
    const failedCode = String(body.code || "").trim();
    const failedMessage = String(body.message || "").trim();
    const canceledAmountRaw = Math.max(0, toInt(body.totalCancelAmount));
    if (!orderId) {
      res.status(400).json({ ok: false, error: "missing orderId" });
      return;
    }

    const db = getFirestore();
    const orderRef = db.doc(`payment_orders/${orderId}`);
    const orderSnap = await orderRef.get();
    if (!orderSnap.exists) {
      await db.collection("payment_attempts").add({
        provider: "toss",
        orderId,
        paymentKey: paymentKey || null,
        status: status || "UNKNOWN",
        code: failedCode || null,
        message: failedMessage || null,
        payload: body,
        createdAt: FieldValue.serverTimestamp(),
      });
      res.status(404).json({ ok: false, error: "order not found" });
      return;
    }
    const od = (orderSnap.data() || {}) as Record<string, unknown>;
    const fedId = String(od.federationId || "").trim();
    const txId = String(od.txId || "").trim();
    const orderAmount = toInt(od.amount);
    if (!fedId || !txId) {
      res.status(400).json({ ok: false, error: "invalid order mapping" });
      return;
    }

    const eventId = normalizeDocId(
      `${orderId}_${status}_${paymentKey || "no_key"}_${paidAmountRaw}_${canceledAmountRaw}`
    );
    const eventRef = db.doc(`payment_webhook_events/${eventId}`);
    const eventSnap = await eventRef.get();
    if (eventSnap.exists) {
      res.status(200).json({ ok: true, duplicate: true });
      return;
    }
    await eventRef.set({
      eventId,
      orderId,
      paymentKey: paymentKey || null,
      status: status || "UNKNOWN",
      paidAmount: paidAmountRaw,
      canceledAmount: canceledAmountRaw,
      payload: body,
      createdAt: FieldValue.serverTimestamp(),
    });

    if (status === "FAILED" || status === "ABORTED" || status === "EXPIRED") {
      await db.collection(`federations/${fedId}/payment_attempts`).add({
        provider: "toss",
        orderId,
        paymentKey: paymentKey || null,
        txId,
        status,
        code: failedCode || null,
        message: failedMessage || null,
        payload: body,
        createdAt: FieldValue.serverTimestamp(),
      });
      await orderRef.set(
        {
          status: "failed",
          webhookStatus: status,
          failureCode: failedCode || null,
          failureMessage: failedMessage || null,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      res.status(200).json({ ok: true, failed: true });
      return;
    }

    if (status !== "DONE" && status !== "PAID" && status !== "CANCELED" && status !== "PARTIAL_CANCELED") {
      await orderRef.set(
        {
          status: "ignored",
          webhookStatus: status || "UNKNOWN",
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      res.status(200).json({ ok: true, ignored: true });
      return;
    }

    const txRef = db.doc(`federations/${fedId}/transactions/${txId}`);
    const txSnap = await txRef.get();
    if (!txSnap.exists) {
      res.status(404).json({ ok: false, error: "expected tx not found" });
      return;
    }
    const tx = (txSnap.data() || {}) as TxDoc;
    if (status !== "CANCELED" && status !== "PARTIAL_CANCELED" && String(tx.incomeStatus || "") === "paid") {
      await orderRef.set(
        {
          status: "already_paid",
          paymentKey: paymentKey || null,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      res.status(200).json({ ok: true, alreadyPaid: true });
      return;
    }

    const competitionId = String(tx.competitionId || tx.leagueId || "").trim();
    const teamId = String(tx.teamId || "").trim();
    const entryId = competitionId && teamId ? `${competitionId}__${teamId}` : "";
    if (!competitionId || !teamId || !entryId) {
      res.status(400).json({ ok: false, error: "missing team/competition mapping" });
      return;
    }

    if (status === "DONE" || status === "PAID") {
      const remaining = resolveRemaining(tx);
      const paidAmount = paidAmountRaw > 0 ? paidAmountRaw : orderAmount;
      if (paidAmount <= 0 || remaining === 0) {
        res.status(400).json({ ok: false, error: "invalid amount" });
        return;
      }
      const paymentId = `auto_${normalizeDocId(orderId)}_${normalizeDocId(paymentKey || "no_key")}`;
      const paymentRef = db.doc(`federations/${fedId}/competitionFeePayments/${paymentId}`);
      const paymentSnap = await paymentRef.get();
      if (!paymentSnap.exists) {
        await paymentRef.set({
          amount: paidAmount,
          entryId,
          competitionId,
          teamId,
          paidAt: new Date().toISOString(),
          memo: "자동 결제 링크(Toss) webhook 반영",
          createdByUid: "system:toss_webhook",
          sourceType: "payment_link",
          sourceId: orderId,
          orderId,
          paymentKey: paymentKey || null,
          provider: "toss",
          createdAt: FieldValue.serverTimestamp(),
        });
      }

      await orderRef.set(
        {
          status: "paid",
          paidAmount,
          paidAt: new Date().toISOString(),
          paymentKey: paymentKey || null,
          webhookStatus: status,
          paymentDocId: paymentId,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      await db.collection("admin_logs").add({
        type: "COMPETITION_FEE_PAYMENT_WEBHOOK",
        mode: "webhook",
        triggeredBy: "system",
        federationId: fedId,
        dryRun: false,
        result: {
          orderId,
          txId,
          paymentDocId: paymentId,
          paidAmount,
          status: "paid",
        },
        createdAt: FieldValue.serverTimestamp(),
      });
      res.status(200).json({ ok: true, paid: true, paymentId });
      return;
    }

    // CANCELED / PARTIAL_CANCELED: 환불 트랜잭션 생성 + expected 상태 재계산
    const refundAmount = canceledAmountRaw;
    if (refundAmount <= 0) {
      res.status(400).json({ ok: false, error: "invalid refund amount" });
      return;
    }
    const refundTxId = `competitionRefund_${normalizeDocId(orderId)}_${refundAmount}`;
    const refundTxRef = db.doc(`federations/${fedId}/transactions/${refundTxId}`);
    const grossPaid = Math.max(0, toInt(tx.paidAmount));
    const prevRefund = Math.max(0, toInt(tx.refundAmount));
    const nextRefund = Math.max(prevRefund, refundAmount);
    const stat = computeIncomeStatus(Math.max(0, toInt(tx.amount)), grossPaid, nextRefund);

    await db.runTransaction(async (t) => {
      const rSnap = await t.get(refundTxRef);
      if (!rSnap.exists) {
        t.set(refundTxRef, {
          type: "refund",
          domain: "competition",
          ledgerDomain: "general",
          category: "competition_fee_refund",
          amount: -refundAmount,
          occurredAt: new Date().toISOString(),
          relatedRef: { kind: "payment_order", id: orderId },
          sourceType: "payment_refund",
          sourceId: orderId,
          relatedPaymentId: String(od.paymentDocId || "").trim() || null,
          paymentKey: paymentKey || null,
          provider: "toss",
          teamId,
          leagueId: competitionId,
          competitionId,
          createdByUid: "system:toss_webhook",
          createdAt: FieldValue.serverTimestamp(),
        });
      }
      t.set(
        txRef,
        {
          refundAmount: nextRefund,
          remainingAmount: stat.remainingAmount,
          incomeStatus: stat.incomeStatus,
          ...(stat.incomeStatus === "expected" ? { occurredAt: null, paidAt: null } : {}),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    });

    await orderRef.set(
      {
        status: "refunded",
        refundedAmount: refundAmount,
        webhookStatus: status,
        paymentKey: paymentKey || null,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    await db.collection("admin_logs").add({
      type: "COMPETITION_FEE_PAYMENT_WEBHOOK",
      mode: "webhook",
      triggeredBy: "system",
      federationId: fedId,
      dryRun: false,
      result: {
        orderId,
        txId,
        refundedAmount: refundAmount,
        status: "refunded",
      },
      createdAt: FieldValue.serverTimestamp(),
    });

    res.status(200).json({ ok: true, refunded: true, refundTxId });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    res.status(500).json({ ok: false, error: msg });
  }
}

