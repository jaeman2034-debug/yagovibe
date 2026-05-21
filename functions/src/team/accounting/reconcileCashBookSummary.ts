/**
 * teams/{teamId}/cashBook 실합계와 cashBookSummary/default.balance 정합 (전 팀 스케줄)
 */
import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions";
import { reconcileCashBookSummaryForTeam } from "./cashBookReconcileCore";

if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();

export const reconcileCashBookSummary = onSchedule(
  {
    schedule: "15 */6 * * *",
    timeZone: "Asia/Seoul",
    region: "asia-northeast3",
    timeoutSeconds: 540,
    memory: "512MiB",
  },
  async () => {
    const teamsSnap = await db.collection("teams").get();
    let teamsChecked = 0;
    let teamsAdjusted = 0;
    let teamsErrors = 0;

    for (const teamDoc of teamsSnap.docs) {
      const teamId = teamDoc.id;
      teamsChecked += 1;
      try {
        const result = await reconcileCashBookSummaryForTeam(teamId, "scheduled");
        if (!result.summaryWritten) continue;

        teamsAdjusted += 1;
        if (result.delta !== 0) {
          logger.warn("[reconcileCashBookSummary] balance corrected", {
            teamId,
            stored: result.stored,
            ledger: result.ledger,
            delta: result.delta,
            txCount: result.txCount,
          });
        }
      } catch (e) {
        teamsErrors += 1;
        logger.error("[reconcileCashBookSummary] team failed", { teamId, error: String(e) });
      }
    }

    logger.info("[reconcileCashBookSummary] done", {
      teamsChecked,
      teamsAdjusted,
      teamsErrors,
    });
  }
);
