/**
 * 🔥 결제 연동 / 플랜 업그레이드 / 매출 트래킹
 * 
 * Stripe 결제 완료 시 Pro 플랜으로 자동 업그레이드하고 매출을 기록합니다.
 */

import { onRequest } from "firebase-functions/v2/https";
import * as crypto from "crypto";

interface PaymentMetadata {
  associationId?: string;
  plan?: string;
}

interface StripeCheckoutSession {
  id: string;
  customer: string;
  amount_total: number;
  currency: string;
  metadata: PaymentMetadata;
  payment_status: string;
  status: string;
}

interface StripeWebhookEvent {
  id: string;
  type: string;
  data: {
    object: StripeCheckoutSession;
  };
}

/**
 * Stripe Webhook 시그니처 검증
 * 
 * Stripe 시그니처 형식: "t=<timestamp>,v1=<signature>"
 */
function verifyStripeSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  try {
    const elements = signature.split(",");
    let timestamp: string | undefined;
    let signatureHash: string | undefined;

    elements.forEach((element) => {
      if (element.startsWith("t=")) {
        timestamp = element.split("=")[1];
      } else if (element.startsWith("v1=")) {
        signatureHash = element.split("=")[1];
      }
    });

    if (!signatureHash || !timestamp) {
      console.error("[handlePaymentSuccess] 시그니처 형식 오류");
      return false;
    }

    const signedPayload = `${timestamp}.${payload}`;
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(signedPayload, "utf8")
      .digest("hex");

    // 타임스탬프 만료 체크 (5분 이내)
    const eventTime = parseInt(timestamp) * 1000;
    const currentTime = Date.now();
    if (currentTime - eventTime > 5 * 60 * 1000) {
      console.error("[handlePaymentSuccess] 타임스탬프 만료");
      return false;
    }

    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(signatureHash)
    );
  } catch (error) {
    console.error("[handlePaymentSuccess] 시그니처 검증 실패:", error);
    return false;
  }
}

/**
 * Stripe Webhook 핸들러
 * 
 * 결제 완료 시 Pro 플랜으로 업그레이드
 */
export const handlePaymentSuccess = onRequest(
  {
    region: "asia-northeast3",
    cors: true,
    timeoutSeconds: 30,
  },
  async (req, res) => {
    // 🔥 firebaseAdmin.ts에서 초기화된 admin 사용
    const { admin } = await import("../firebaseAdmin");
    const db = admin.firestore();

    try {
      // 1️⃣ Webhook 시그니처 검증
      const signature = req.headers["stripe-signature"] as string;
      const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

      if (!signature || !stripeWebhookSecret) {
        console.error("[handlePaymentSuccess] 시그니처 또는 시크릿 없음");
        res.status(400).json({ error: "Invalid request" });
        return;
      }

      const payload = JSON.stringify(req.body);
      
      if (!verifyStripeSignature(payload, signature, stripeWebhookSecret)) {
        console.error("[handlePaymentSuccess] 시그니처 검증 실패");
        res.status(400).json({ error: "Invalid signature" });
        return;
      }

      // 2️⃣ 이벤트 타입 확인 (위에서 이미 파싱됨)

      if (event.type !== "checkout.session.completed") {
        console.log(`[handlePaymentSuccess] 이벤트 타입 ${event.type} 스킵`);
        res.status(200).json({ received: true });
        return;
      }

      const session = event.data.object;

      // 3️⃣ 결제 유효성 검증
      if (session.payment_status !== "paid" || session.status !== "complete") {
        console.log(`[handlePaymentSuccess] 결제 미완료: ${session.payment_status}`);
        res.status(200).json({ received: true });
        return;
      }

      const associationId = session.metadata?.associationId;
      const plan = session.metadata?.plan || "pro";

      if (!associationId) {
        console.error("[handlePaymentSuccess] associationId 없음");
        res.status(400).json({ error: "associationId missing" });
        return;
      }

      console.log(`[handlePaymentSuccess] 결제 완료 처리 시작`, {
        associationId,
        plan,
        sessionId: session.id,
        amount: session.amount_total,
      });

      // 4️⃣ Firestore 업데이트 (트랜잭션)
      await db.runTransaction(async (tx) => {
        const associationRef = db.doc(`associations/${associationId}`);
        const associationSnap = await tx.get(associationRef);

        if (!associationSnap.exists) {
          throw new Error(`Association ${associationId} not found`);
        }

        const association = associationSnap.data();
        const now = admin.firestore.FieldValue.serverTimestamp();

        // 5️⃣ plan 업데이트
        tx.update(associationRef, {
          plan: plan,
          planStartedAt: now,
          "billing.status": "active",
          "billing.provider": "stripe",
          "billing.customerId": session.customer || null,
        });

        // 6️⃣ payments 문서 생성 (매출 기록)
        const paymentsRef = db.collection(
          `associations/${associationId}/payments`
        ).doc();

        tx.set(paymentsRef, {
          amount: session.amount_total / 100, // Stripe는 cent 단위이므로 100으로 나눔
          currency: session.currency?.toUpperCase() || "KRW",
          plan: plan,
          provider: "stripe",
          status: "paid",
          paidAt: now,
          raw: {
            sessionId: session.id,
            customerId: session.customer,
            eventId: event.id,
          },
        });

        // 7️⃣ 로그 기록
        const logsRef = db.collection(`associations/${associationId}/logs`).doc();
        tx.set(logsRef, {
          type: "payment_success",
          message: "Pro 플랜 결제 완료",
          createdAt: now,
          by: "system",
          payload: {
            amount: session.amount_total / 100,
            paymentId: paymentsRef.id,
            plan: plan,
            sessionId: session.id,
          },
        });

        console.log(`[handlePaymentSuccess] 결제 완료 처리 성공`, {
          associationId,
          paymentId: paymentsRef.id,
          amount: session.amount_total / 100,
        });
      });

      res.status(200).json({ received: true, processed: true });

    } catch (error: any) {
      console.error(`[handlePaymentSuccess] 에러 발생:`, {
        error: error.message,
        stack: error.stack,
      });
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

