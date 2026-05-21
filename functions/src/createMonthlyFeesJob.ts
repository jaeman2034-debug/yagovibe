// functions/src/createMonthlyFeesJob.ts
// 📅 월별 회비 자동 생성 스케줄 함수 (운영용)
//
// 매월 1일 오전 00:10 (서울 시간) 자동 실행
// 모든 팀의 enableNewFeeSystem=true인 팀만 처리

import { onSchedule } from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import { getFirestore } from "firebase-admin/firestore";
import { initializeApp, getApps } from "firebase-admin/app";
import { ym, ensureMonthlyFee, createMonthlyFeeMembers } from "./feeSystemCore";

// Firebase Admin 초기화
if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();

/**
 * 📅 월별 회비 자동 생성 스케줄 함수
 */
export const createMonthlyFeesJob = onSchedule(
  {
    schedule: "10 0 1 * *", // 매월 1일 오전 00:10 (Cron 표현식)
    timeZone: "Asia/Seoul",
    region: "asia-northeast3",
  },
  async () => {
    logger.info("📅 [createMonthlyFeesJob] 월별 회비 자동 생성 시작", { structuredData: true });

    try {
      const month = ym(new Date());
      logger.info(`📅 [createMonthlyFeesJob] 생성 대상 월: ${month}`);

      const teamsSnap = await db.collection("teams").get();
      logger.info(`👥 [createMonthlyFeesJob] 총 ${teamsSnap.size}개 팀 발견`);

      if (teamsSnap.empty) {
        logger.warn("⚠️ [createMonthlyFeesJob] 팀이 없습니다.");
        return;
      }

      let totalProcessed = 0;
      let totalCreated = 0;
      let totalSkipped = 0;

      for (const t of teamsSnap.docs) {
        const teamId = t.id;
        const team = t.data();

        try {
          // 신규 시스템 ON인 팀만
          if (team.enableNewFeeSystem === false) {
            totalSkipped++;
            continue;
          }

          // 월별 헤더 생성
          await ensureMonthlyFee(teamId, month);

          // 회원별 fee 문서 생성
          await createMonthlyFeeMembers(teamId, month);

          totalProcessed++;
          totalCreated++;

          logger.info(`✅ [createMonthlyFeesJob] 팀 ${teamId} 처리 완료`);

        } catch (teamError: any) {
          logger.error(`❌ [createMonthlyFeesJob] 팀 ${teamId} 처리 실패:`, teamError);
          // 개별 팀 실패해도 계속 진행
        }
      }

      logger.info(`✅ [createMonthlyFeesJob] 완료:`);
      logger.info(`   - 처리된 팀: ${totalProcessed}개`);
      logger.info(`   - 생성된 fee: ${totalCreated}개`);
      logger.info(`   - 스킵된 팀: ${totalSkipped}개`);

    } catch (error: any) {
      logger.error("❌ [createMonthlyFeesJob] 월별 회비 자동 생성 실패:", error);
      throw error;
    }
  }
);

