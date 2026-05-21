import { onSchedule } from "firebase-functions/v2/scheduler";
import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";

/** 매일 새벽: 전날(서울 기준) 로그를 모든 협회에 대해 집계 — impl 은 런타임 동적 import (배포 로드 경량화) */
export const scheduledAggregateFederationAiStats = onSchedule(
  {
    schedule: "15 4 * * *",
    timeZone: "Asia/Seoul",
    region: "asia-northeast3",
  },
  async () => {
    const { aggregateFederationAiStatsForDate, seoulYesterdayDateString } = await import(
      "./aggregateFederationAiStats.impl"
    );
    const yesterday = seoulYesterdayDateString();
    const db = getFirestore();
    const refs = await db.collection("federations").listDocuments();
    let ok = 0;
    let fail = 0;
    for (const ref of refs) {
      try {
        await aggregateFederationAiStatsForDate(ref.id, yesterday);
        ok++;
      } catch (e) {
        fail++;
        logger.warn("[scheduledAggregateFederationAiStats] skip", { id: ref.id, err: String(e) });
      }
    }
    logger.info("[scheduledAggregateFederationAiStats] done", {
      yesterday,
      ok,
      fail,
      total: refs.length,
    });
  }
);
