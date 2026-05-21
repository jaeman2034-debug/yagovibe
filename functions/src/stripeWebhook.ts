// functions/src/stripeWebhook.ts
// 🔥 Stripe Webhook 처리 (구독 생성/갱신/해지)

import { onRequest } from "firebase-functions/v2/https";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import * as admin from "firebase-admin";
import { logger } from "firebase-functions";
import Stripe from "stripe";
import { writeAuditLog } from "./utils/auditLog";

// Initialize Firebase Admin only once
if (admin.apps.length === 0) {
  admin.initializeApp();
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2023-10-16",
});
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET as string;

/**
 * Stripe Webhook 엔드포인트
 */
export const stripeWebhook = onRequest(
  {
    region: "asia-northeast3",
    cors: true,
  },
  async (req, res) => {
    const sig = req.headers["stripe-signature"];

    if (!sig) {
      logger.warn("⚠️ [stripeWebhook] Missing signature");
      res.status(400).send("Missing signature");
      return;
    }

    let event: Stripe.Event;

    try {
      // Webhook 서명 검증
      event = stripe.webhooks.constructEvent(
        req.rawBody,
        sig as string,
        WEBHOOK_SECRET
      );
    } catch (err: any) {
      logger.error(`❌ [stripeWebhook] Signature verification failed:`, err.message);
      res.status(400).send(`Webhook Error: ${err.message}`);
      return;
    }

    const db = getFirestore();

    try {
      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object as Stripe.Checkout.Session;
          const teamId = session.metadata?.teamId;
          
          if (!teamId) {
            logger.warn("⚠️ [stripeWebhook] checkout.session.completed: teamId 없음");
            break;
          }

          // 🔥 subscription 모드일 때는 subscription.created에서 처리
          // 하지만 즉시 반영을 위해 여기서도 처리 (중복 방지는 subscription.created에서)
          if (session.mode === "subscription") {
            logger.info(`✅ [stripeWebhook] Checkout completed (subscription mode) for team=${teamId}`);
            // subscription.created에서 처리하므로 여기서는 로깅만
            break;
          }

          // one-time payment의 경우 여기서 처리
          logger.info(`✅ [stripeWebhook] Checkout completed (one-time) for team=${teamId}`);
          break;
        }

        case "customer.subscription.created":
        case "customer.subscription.updated": {
          const sub = event.data.object as Stripe.Subscription;
          const teamId = (sub.metadata as any)?.teamId;
          
          if (!teamId) {
            logger.warn(`⚠️ [stripeWebhook] ${event.type}: teamId 없음`);
            break;
          }

          const status = sub.status as
            | "active"
            | "canceled"
            | "past_due"
            | "incomplete"
            | "trialing";

          // 🔥 트랜잭션으로 원자성 보장
          await db.runTransaction(async (transaction) => {
            // 팀 문서 읽기
            const teamRef = db.doc(`teams/${teamId}`);
            const teamSnap = await transaction.get(teamRef);
            
            if (!teamSnap.exists) {
              throw new Error(`Team ${teamId} not found`);
            }

            const teamData = teamSnap.data()!;
            const oldPlan = (teamData.plan as string) || "free";
            const newPlan = status === "active" || status === "trialing" ? "pro" : "free";

            // 구독 정보 업데이트
            const subRef = db.doc(`teams/${teamId}/subscription/current`);
            transaction.set(
              subRef,
              {
                plan: newPlan,
                status,
                stripeCustomerId: sub.customer as string,
                stripeSubscriptionId: sub.id,
                currentPeriodEnd: admin.firestore.Timestamp.fromMillis(
                  sub.current_period_end * 1000
                ),
                updatedAt: FieldValue.serverTimestamp(),
              },
              { merge: true }
            );

            // 팀 문서 plan 동기화 (플랜이 실제로 변경된 경우만)
            if (oldPlan !== newPlan) {
              transaction.update(teamRef, {
                plan: newPlan,
              });

              // 🔥 AuditLog 기록 (플랜 변경) - 트랜잭션 외부에서 (실패해도 플랜 변경은 성공)
              const adminUid = (sub.metadata as any)?.adminUid || teamData.ownerUid;
              if (adminUid) {
                // 트랜잭션 완료 후 AuditLog 기록
                writeAuditLog({
                  teamId,
                  action: "PLAN_CHANGED",
                  actorUid: adminUid,
                  actorRole: "admin",
                  meta: {
                    oldPlan,
                    newPlan,
                    stripeEvent: event.type,
                    subscriptionId: sub.id,
                  },
                }).catch((err) => {
                  logger.error("❌ [stripeWebhook] AuditLog 기록 실패 (플랜 변경은 성공):", err);
                });
              }
            }
          });

          logger.info(
            `✅ [stripeWebhook] Subscription ${event.type} team=${teamId} status=${status}`
          );
          break;
        }

        case "customer.subscription.deleted": {
          const sub = event.data.object as Stripe.Subscription;
          const teamId = (sub.metadata as any)?.teamId;
          
          if (!teamId) {
            logger.warn("⚠️ [stripeWebhook] subscription.deleted: teamId 없음");
            break;
          }

          // 🔥 트랜잭션으로 원자성 보장
          await db.runTransaction(async (transaction) => {
            // 팀 문서 읽기
            const teamRef = db.doc(`teams/${teamId}`);
            const teamSnap = await transaction.get(teamRef);
            
            if (!teamSnap.exists) {
              throw new Error(`Team ${teamId} not found`);
            }

            const teamData = teamSnap.data()!;
            const oldPlan = (teamData.plan as string) || "free";

            // 구독 해지 처리
            const subRef = db.doc(`teams/${teamId}/subscription/current`);
            transaction.set(
              subRef,
              {
                plan: "free",
                status: "canceled",
                stripeSubscriptionId: sub.id,
                updatedAt: FieldValue.serverTimestamp(),
              },
              { merge: true }
            );

            // 팀 문서 plan 동기화 (free가 아닌 경우만)
            if (oldPlan !== "free") {
              transaction.update(teamRef, { plan: "free" });

              // 🔥 AuditLog 기록 (플랜 변경: pro → free) - 트랜잭션 외부에서
              const adminUid = teamData.ownerUid;
              if (adminUid) {
                writeAuditLog({
                  teamId,
                  action: "PLAN_CHANGED",
                  actorUid: adminUid,
                  actorRole: "admin",
                  meta: {
                    oldPlan,
                    newPlan: "free",
                    stripeEvent: "subscription.deleted",
                    subscriptionId: sub.id,
                  },
                }).catch((err) => {
                  logger.error("❌ [stripeWebhook] AuditLog 기록 실패 (플랜 변경은 성공):", err);
                });
              }
            }
          });

          logger.info(`⚠️ [stripeWebhook] Subscription canceled team=${teamId}`);
          break;
        }

        case "invoice.payment_failed": {
          const invoice = event.data.object as Stripe.Invoice;
          const customerId = invoice.customer as string;

          // customerId로 teamId 찾기
          const teamsRef = db.collection("teams");
          const teamsSnap = await teamsRef
            .where("subscription.current.stripeCustomerId", "==", customerId)
            .limit(1)
            .get();

          if (teamsSnap.empty) {
            logger.warn(`⚠️ [stripeWebhook] invoice.payment_failed: 팀을 찾을 수 없음`);
            break;
          }

          const teamId = teamsSnap.docs[0].id;
          const subRef = db.doc(`teams/${teamId}/subscription/current`);
          await subRef.set(
            {
              status: "past_due",
              updatedAt: FieldValue.serverTimestamp(),
            },
            { merge: true }
          );

          logger.warn(`⚠️ [stripeWebhook] Payment failed team=${teamId}`);
          break;
        }

        default:
          logger.info(`ℹ️ [stripeWebhook] Unhandled event type: ${event.type}`);
      }

      res.json({ received: true });
    } catch (err: any) {
      logger.error(`❌ [stripeWebhook] Handler error:`, err);
      res.status(500).send("Webhook handler error");
    }
  }
);

