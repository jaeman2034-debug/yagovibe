import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions";
import { isPastSeoulEndOfDueDay } from "./seoulDateUtils";

if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();

/**
 * 오픈 회비별 연체(미납) 인원 수를 fee 문서에 스냅샷.
 * D-1 알림(09:00) 직후 갱신되도록 09:10 실행.
 */
export const feeOverdueSnapshotScheduler = onSchedule(
  {
    schedule: "10 9 * * *",
    timeZone: "Asia/Seoul",
    region: "asia-northeast3",
    timeoutSeconds: 540,
    memory: "512MiB",
  },
  async () => {
    const nowMs = Date.now();
    let feesUpdated = 0;

    const teamsSnap = await db.collection("teams").get();

    for (const teamDoc of teamsSnap.docs) {
      const teamId = teamDoc.id;

      let feesSnap;
      try {
        feesSnap = await db.collection("teams").doc(teamId).collection("fees").where("status", "==", "open").get();
      } catch (e) {
        logger.error("[feeOverdueSnapshotScheduler] fees 조회 실패", { teamId, error: String(e) });
        continue;
      }

      for (const feeDoc of feesSnap.docs) {
        const fee = feeDoc.data() as Record<string, unknown>;
        const rawDue = fee.dueDate;
        const dueTs =
          rawDue instanceof Timestamp
            ? rawDue
            : rawDue && typeof (rawDue as { toMillis?: () => number }).toMillis === "function"
              ? (rawDue as Timestamp)
              : null;

        if (!dueTs) {
          await feeDoc.ref.set(
            {
              overdueMemberCount: 0,
              overdueUpdatedAt: FieldValue.serverTimestamp(),
            },
            { merge: true }
          );
          feesUpdated++;
          continue;
        }

        if (!isPastSeoulEndOfDueDay(dueTs, nowMs)) {
          await feeDoc.ref.set(
            {
              overdueMemberCount: 0,
              overdueUpdatedAt: FieldValue.serverTimestamp(),
            },
            { merge: true }
          );
          feesUpdated++;
          continue;
        }

        const [membersSnap, paymentsSnap] = await Promise.all([
          db.collection("teams").doc(teamId).collection("members").where("status", "==", "active").get(),
          db.collection("teams").doc(teamId).collection("payments").where("feeId", "==", feeDoc.id).get(),
        ]);

        const paidMap = new Map<string, string>();
        paymentsSnap.docs.forEach((doc) => {
          const data = doc.data() as Record<string, unknown>;
          const st = typeof data.status === "string" ? data.status : "";
          const uid = typeof data.userId === "string" && data.userId ? data.userId : "";
          if (uid) paidMap.set(uid, st);
        });

        let overdueMemberCount = 0;
        membersSnap.docs.forEach((memberDoc) => {
          const uid = memberDoc.id;
          const status = paidMap.get(uid);
          if (status !== "paid") overdueMemberCount += 1;
        });

        await feeDoc.ref.set(
          {
            overdueMemberCount,
            overdueUpdatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
        feesUpdated++;
      }
    }

    logger.info("[feeOverdueSnapshotScheduler] 완료", { feesUpdated });
  }
);
