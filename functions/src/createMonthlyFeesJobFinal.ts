// functions/src/createMonthlyFeesJobFinal.ts
// 📅 월별 회비 자동 생성 스케줄 함수 (최종 완성본)
//
// 매월 1일 오전 00:10 (서울 시간) 자동 실행
// enableNewFeeSystem=true인 팀만 처리

import { onSchedule } from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import { getFirestore } from "firebase-admin/firestore";
import { initializeApp, getApps } from "firebase-admin/app";
import { ym, ensureMonthlyFee, createMonthlyFeeMembers } from "./feeSystemCoreFinal";

// Firebase Admin 초기화
if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();

/**
 * 📅 월별 회비 자동 생성 스케줄 함수 (운영 자동화)
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
      let totalSkipped = 0;
      let totalErrors = 0;

      for (const t of teamsSnap.docs) {
        const teamId = t.id;
        const team = t.data();

        try {
          // enableNewFeeSystem=true인 팀만 처리
          if (team.enableNewFeeSystem !== true) {
            totalSkipped++;
            continue;
          }

          // 월별 헤더 생성
          await ensureMonthlyFee(teamId, month);

          // 회원별 fee 문서 생성
          await createMonthlyFeeMembers(teamId, month);

          totalProcessed++;
          logger.info(`✅ [createMonthlyFeesJob] 팀 ${teamId} 처리 완료`);

        } catch (teamError: any) {
          totalErrors++;
          logger.error(`❌ [createMonthlyFeesJob] 팀 ${teamId} 처리 실패:`, teamError);
          // 개별 팀 실패해도 계속 진행
        }
      }

      logger.info(`✅ [createMonthlyFeesJob] 완료:`);
      logger.info(`   - 처리된 팀: ${totalProcessed}개`);
      logger.info(`   - 스킵된 팀: ${totalSkipped}개`);
      logger.info(`   - 에러: ${totalErrors}개`);

    } catch (error: any) {
      logger.error("❌ [createMonthlyFeesJob] 월별 회비 자동 생성 실패:", error);
      throw error;
    }
  }
);

/**
 * 🔧 Lazy-create Callable (누락 방지)
 */
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { ensureMonthInitialized } from "./feeSystemCoreFinal";

export const ensureMonthlyFeeCallable = onCall(
  {
    region: "asia-northeast3",
    cors: true,
  },
  async (req) => {
    const { teamId, month } = req.data ?? {};
    const uid = req.auth?.uid;

    if (!uid) {
      throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    }

    if (!teamId || !month) {
      throw new HttpsError("invalid-argument", "teamId와 month가 필요합니다.");
    }

    // month 형식 검증 (YYYY-MM)
    if (!/^\d{4}-\d{2}$/.test(month)) {
      throw new HttpsError("invalid-argument", "month는 YYYY-MM 형식이어야 합니다.");
    }

    // 팀 정보 조회
    const teamRef = db.doc(`teams/${teamId}`);
    const teamSnap = await teamRef.get();

    if (!teamSnap.exists) {
      throw new HttpsError("not-found", "팀을 찾을 수 없습니다.");
    }

    const team = teamSnap.data()!;

    // enableNewFeeSystem 플래그 확인
    if (team.enableNewFeeSystem !== true) {
      return {
        success: false,
        message: "새 회비 시스템이 비활성화되어 있습니다.",
        created: false,
      };
    }

    // 월별 회비 생성 (lazy-create)
    await ensureMonthInitialized(teamId, month);

    return {
      success: true,
      message: "월별 회비 생성 완료",
      created: true,
    };
  }
);

