/**
 * `subscriptions` 스냅샷으로 일 단위 빌링 KPI → `billing_metrics_daily/{YYYY-MM-DD}` (서울일)
 *
 * **스키마 계약:** `date` 필드는 항상 `string` (`YYYY-MM-DD`)만 사용한다.
 * 문서 ID·`orderBy("date")`·클라이언트 파싱이 이를 전제로 한다. Timestamp와 혼용 금지.
 */
import * as admin from "firebase-admin";
import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp, FieldValue, FieldPath } from "firebase-admin/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions";
import { SUBSCRIPTION_EVENT_TYPES } from "./subscriptionEvents";

if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();
const REGION = "asia-northeast3";

const PAGE = 500;

function seoulYmd(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
}

/** `YYYY-MM-DD`(서울) 당일 [00:00, 24:00) KST — `subscription_events.occurredAt` 범위 질의용 */
function seoulDayBoundsForYmd(ymd: string): { start: Timestamp; end: Timestamp } {
  const start = new Date(`${ymd}T00:00:00+09:00`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return {
    start: Timestamp.fromMillis(start.getTime()),
    end: Timestamp.fromMillis(end.getTime()),
  };
}

function normalizeMonthlyAmount(amount: number, interval: string): number {
  if (!Number.isFinite(amount) || amount < 0) return 0;
  const intv = String(interval || "month").toLowerCase();
  if (intv === "year") return amount / 12;
  return amount;
}

function toMillis(t: unknown): number | null {
  if (t && typeof t === "object" && "toMillis" in t) {
    return (t as Timestamp).toMillis();
  }
  return null;
}

/**
 * 매일 02:00 KST — 당일 문서(서울)에 MRR·활성 수·최근 30일 신규/해지(근사) 집계
 */
export const billingMetricsDaily = onSchedule(
  {
    schedule: "0 2 * * *",
    timeZone: "Asia/Seoul",
    region: REGION,
    timeoutSeconds: 540,
    memory: "512MiB",
  },
  async () => {
    const now = Date.now();
    const thirtyD = now - 30 * 24 * 60 * 60 * 1000;
    const id = seoulYmd(new Date());

    let mrr = 0;
    let activeCount = 0;
    let newCount = 0;
    let churnCount = 0;

    let last: admin.firestore.QueryDocumentSnapshot | null = null;

    for (;;) {
      let q: admin.firestore.Query = db
        .collection("subscriptions")
        .orderBy(FieldPath.documentId())
        .limit(PAGE);
      if (last) {
        q = q.startAfter(last);
      }
      const snap = await q.get();
      if (snap.empty) break;

      for (const doc of snap.docs) {
        const d = doc.data() as Record<string, unknown>;
        const st = String(d.status || "").toLowerCase();
        const price = typeof d.price === "number" ? d.price : 0;
        const interval = String(d.billingInterval || "month");

        if (st === "active") {
          mrr += normalizeMonthlyAmount(price, interval);
          activeCount += 1;
        }

        const created = toMillis(d.stripeCreatedAt) ?? toMillis(d.createdAt) ?? toMillis(d.updatedAt);
        if (created != null && created >= thirtyD && (st === "active" || st === "trialing")) {
          newCount += 1;
        }
        if (st === "canceled") {
          const upd = toMillis(d.updatedAt);
          if (upd != null && upd >= thirtyD) {
            churnCount += 1;
          }
        }
      }

      last = snap.docs[snap.docs.length - 1] ?? null;
      if (snap.size < PAGE) break;
    }

    let churnEventsDay = 0;
    try {
      const { start, end } = seoulDayBoundsForYmd(id);
      const cSnap = await db
        .collection("subscription_events")
        .where("type", "==", SUBSCRIPTION_EVENT_TYPES.CANCELED)
        .where("occurredAt", ">=", start)
        .where("occurredAt", "<", end)
        .count()
        .get();
      churnEventsDay = cSnap.data().count;
    } catch (e) {
      logger.warn("billingMetricsDaily: churnEventsDay query skipped", {
        id,
        message: e instanceof Error ? e.message : String(e),
      });
    }

    await db.doc(`billing_metrics_daily/${id}`).set(
      {
        date: id,
        mrr,
        activeCount,
        newCount,
        churnCount,
        churnEventsDay,
        windowDays: 30,
        computedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    logger.info("billingMetricsDaily: wrote", { id, mrr, activeCount, newCount, churnCount, churnEventsDay });
  }
);
