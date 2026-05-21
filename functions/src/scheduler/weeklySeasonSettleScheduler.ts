/**
 * 매주 월요일 00:05(KST) 직전 종료된 ISO 주간 시즌 자동 정산
 *
 * 월요일 00:05는 이미 새 주가 시작된 뒤이므로, 「하루 전」시각으로 seasonId 를 계산합니다.
 */
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions";
import { getCurrentWeeklySeasonId } from "../game/xpTimeKeys";
import { runWeeklySeasonSettlement } from "../game/settleWeeklySeasonCore";

if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();

function resolveJustEndedWeeklySeasonId(triggerMs: number): string {
  return getCurrentWeeklySeasonId(new Date(triggerMs - 24 * 60 * 60 * 1000));
}

export const weeklySeasonSettleScheduler = onSchedule(
  {
    schedule: "5 0 * * 1",
    timeZone: "Asia/Seoul",
    region: "asia-northeast3",
    timeoutSeconds: 540,
    memory: "512MiB",
  },
  async (event) => {
    const triggerMs = event.scheduleTime
      ? new Date(event.scheduleTime).getTime()
      : Date.now();
    const previousSeasonId = resolveJustEndedWeeklySeasonId(triggerMs);

    logger.info("weeklySeasonSettleScheduler tick", { previousSeasonId, scheduleTime: event.scheduleTime });

    try {
      const out = await runWeeklySeasonSettlement(db, previousSeasonId, {
        now: new Date(triggerMs),
        forceBeforeEnd: false,
      });
      logger.info("weeklySeasonSettleScheduler done", { previousSeasonId, out });
    } catch (e: unknown) {
      if (e instanceof HttpsError) {
        if (e.code === "internal") {
          logger.error("weeklySeasonSettleScheduler internal (will retry)", {
            seasonId: previousSeasonId,
            message: e.message,
          });
          throw e;
        }
        logger.warn("weeklySeasonSettleScheduler skip", {
          seasonId: previousSeasonId,
          code: e.code,
          message: e.message,
        });
        return;
      }
      logger.error("weeklySeasonSettleScheduler fatal", { previousSeasonId, e });
      throw e;
    }
  }
);
