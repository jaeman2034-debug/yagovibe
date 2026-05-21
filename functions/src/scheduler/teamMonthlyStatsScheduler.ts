import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions";
import { isPastSeoulEndOfDueDay, seoulYyyyMm } from "./seoulDateUtils";

if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();

type PaymentRow = {
  status: string;
  source?: string;
  amount?: number;
};

function asTimestamp(raw: unknown): Timestamp | null {
  if (raw instanceof Timestamp) return raw;
  if (raw && typeof (raw as { toMillis?: () => number }).toMillis === "function") {
    return raw as Timestamp;
  }
  return null;
}

/**
 * 서울 달력 기준 해당 월(YYYYMM)에 마감일이 있는 회비만 집계.
 * 매일 새벽 갱신해 이번 달 KPI를 최신 상태로 유지.
 */
export const teamMonthlyStatsScheduler = onSchedule(
  {
    schedule: "5 3 * * *",
    timeZone: "Asia/Seoul",
    region: "asia-northeast3",
    timeoutSeconds: 540,
    memory: "512MiB",
  },
  async () => {
    const nowMs = Date.now();
    const yyyymm = seoulYyyyMm(nowMs);

    const teamsSnap = await db.collection("teams").get();
    let teamsWritten = 0;

    for (const teamDoc of teamsSnap.docs) {
      const teamId = teamDoc.id;

      let membersSnap;
      let feesSnap;
      try {
        [membersSnap, feesSnap] = await Promise.all([
          db.collection("teams").doc(teamId).collection("members").where("status", "==", "active").get(),
          db.collection("teams").doc(teamId).collection("fees").get(),
        ]);
      } catch (e) {
        logger.error("[teamMonthlyStatsScheduler] 팀 하위 조회 실패", { teamId, error: String(e) });
        continue;
      }

      const totalMembers = membersSnap.size;
      let totalFeesInMonth = 0;
      let totalSlots = 0;
      let paidSlots = 0;
      let unpaidSlots = 0;
      let overdueSlots = 0;
      let autopaySuccessCount = 0;
      let autopayFailCount = 0;
      let revenue = 0;

      for (const feeDoc of feesSnap.docs) {
        const fee = feeDoc.data() as Record<string, unknown>;
        const dueTs = asTimestamp(fee.dueDate);
        if (!dueTs) continue;
        if (seoulYyyyMm(dueTs.toMillis()) !== yyyymm) continue;

        totalFeesInMonth += 1;

        let paymentsSnap;
        try {
          paymentsSnap = await db
            .collection("teams")
            .doc(teamId)
            .collection("payments")
            .where("feeId", "==", feeDoc.id)
            .get();
        } catch (e) {
          logger.warn("[teamMonthlyStatsScheduler] payments 조회 실패", { teamId, feeId: feeDoc.id, error: String(e) });
          continue;
        }

        const payByUid = new Map<string, PaymentRow>();
        paymentsSnap.docs.forEach((d) => {
          const data = d.data() as Record<string, unknown>;
          const uid = typeof data.userId === "string" && data.userId ? data.userId : "";
          if (!uid) return;
          payByUid.set(uid, {
            status: typeof data.status === "string" ? data.status : "",
            source: data.source === "autopay" ? "autopay" : data.source === "manual" ? "manual" : undefined,
            amount: typeof data.amount === "number" && Number.isFinite(data.amount) ? data.amount : undefined,
          });
        });

        const feeAmount = Number(fee.amount || 0);
        const pastDue = isPastSeoulEndOfDueDay(dueTs, nowMs);

        for (const memberDoc of membersSnap.docs) {
          const uid = memberDoc.id;
          const p = payByUid.get(uid);
          const st = p?.status || "";
          const source = p?.source;

          if (source === "autopay" && st === "paid") autopaySuccessCount += 1;
          if (source === "autopay" && st === "failed") autopayFailCount += 1;

          totalSlots += 1;
          if (st === "paid") {
            paidSlots += 1;
            const amt = typeof p?.amount === "number" && Number.isFinite(p.amount) && p.amount > 0 ? p.amount : feeAmount;
            revenue += amt;
          } else if (pastDue) {
            overdueSlots += 1;
          } else {
            unpaidSlots += 1;
          }
        }
      }

      const paymentRate = totalSlots > 0 ? Math.round((paidSlots / totalSlots) * 100) : 0;
      const overdueRate = totalSlots > 0 ? Math.round((overdueSlots / totalSlots) * 100) : 0;
      const apDen = autopaySuccessCount + autopayFailCount;
      const autopaySuccessRate = apDen > 0 ? Math.round((autopaySuccessCount / apDen) * 100) : 0;

      try {
        await db
          .collection("teams")
          .doc(teamId)
          .collection("statsMonthly")
          .doc(yyyymm)
          .set(
            {
              month: yyyymm,
              totalFees: totalFeesInMonth,
              totalMembers,
              paidCount: paidSlots,
              unpaidCount: unpaidSlots,
              overdueCount: overdueSlots,
              totalSlots,
              autopaySuccessCount,
              autopayFailCount,
              revenue,
              paymentRate,
              autopaySuccessRate,
              overdueRate,
              updatedAt: FieldValue.serverTimestamp(),
            },
            { merge: true }
          );
        teamsWritten += 1;
      } catch (e) {
        logger.error("[teamMonthlyStatsScheduler] 쓰기 실패", { teamId, yyyymm, error: String(e) });
      }
    }

    logger.info("[teamMonthlyStatsScheduler] 완료", { yyyymm, teamsWritten, teamDocs: teamsSnap.size });
  }
);
