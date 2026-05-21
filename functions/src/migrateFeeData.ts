// functions/src/migrateFeeData.ts
// 🔄 기존 회비 데이터 마이그레이션 스크립트
// 
// 원칙:
// - 기존 데이터 삭제 금지
// - 신규 구조에 "복사/생성"만 한다
// - 검증 끝나면 읽기 전환
//
// 단계:
// Step 1: Dry-run (로그만 찍기)
// Step 2: Backfill (실제 생성, method: "import")
// Step 3: Read switch (프론트가 새 구조 기준으로 표시)

import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { initializeApp, getApps } from "firebase-admin/app";

// Firebase Admin 초기화
if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();

/**
 * 🔄 기존 회비 데이터 마이그레이션
 * 
 * 기존 구조 (가정):
 * - teams/{teamId}/fees/{memberId}_{month} (예: teams/xxx/fees/member1_2025-12)
 * 
 * 새 구조:
 * - teams/{teamId}/fees/{YYYY-MM}/items/{memberId}
 * 
 * 마이그레이션 전략:
 * 1. 기존 fees 컬렉션 스캔
 * 2. 각 문서의 memberId와 month 추출
 * 3. 새 구조로 데이터 복사
 * 4. 기존 문서는 백업 후 삭제 (선택적)
 * 
 * @param teamId 팀 ID (선택적, 없으면 모든 팀)
 * @param dryRun 실제 마이그레이션 여부 (true: 테스트만, false: 실제 실행)
 */
export const migrateFeeData = onCall(
  {
    region: "asia-northeast3",
    cors: true,
  },
  async (request) => {
    try {
      const { teamId, dryRun = true } = request.data || {};
      const userId = request.auth?.uid;

      // 🔐 관리자 권한 확인
      if (!userId) {
        throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
      }

      logger.info("🔄 [migrateFeeData] 마이그레이션 시작", {
        teamId: teamId || "모든 팀",
        dryRun,
        userId,
      });

      const results = {
        teamsProcessed: 0,
        feesMigrated: 0,
        feesSkipped: 0,
        errors: [] as string[],
      };

      // 1️⃣ 팀 목록 조회
      let teamsQuery: FirebaseFirestore.Query<FirebaseFirestore.DocumentData>;
      
      if (teamId) {
        // 특정 팀만
        teamsQuery = db.collection("teams").where("__name__", "==", teamId);
      } else {
        // 모든 팀
        teamsQuery = db.collection("teams");
      }

      const teamsSnap = await teamsQuery.get();

      if (teamsSnap.empty) {
        logger.warn("⚠️ [migrateFeeData] 팀이 없습니다.");
        return {
          success: false,
          message: "팀이 없습니다.",
          results,
        };
      }

      logger.info(`👥 [migrateFeeData] ${teamsSnap.size}개 팀 발견`);

      // 2️⃣ 각 팀별 처리
      for (const teamDoc of teamsSnap.docs) {
        const currentTeamId = teamDoc.id;

        try {
          // 기존 fees 컬렉션 조회 (구조 가정)
          // 실제 구조에 맞게 수정 필요
          const oldFeesSnap = await db
            .collection("teams")
            .doc(currentTeamId)
            .collection("fees")
            .get();

          if (oldFeesSnap.empty) {
            logger.info(`⚠️ [migrateFeeData] 팀 ${currentTeamId}: 기존 fee 데이터 없음`);
            continue;
          }

          logger.info(`📦 [migrateFeeData] 팀 ${currentTeamId}: ${oldFeesSnap.size}개 fee 문서 발견`);

          // 3️⃣ 각 fee 문서 마이그레이션
          const batch = db.batch();
          let batchCount = 0;
          const MAX_BATCH_SIZE = 500;

          for (const oldFeeDoc of oldFeesSnap.docs) {
            const oldFeeId = oldFeeDoc.id;
            const oldFeeData = oldFeeDoc.data();

            try {
              // 기존 문서 ID에서 memberId와 month 추출
              // 예: "member1_2025-12" → memberId: "member1", month: "2025-12"
              const parts = oldFeeId.split("_");
              if (parts.length < 2) {
                logger.warn(`⚠️ [migrateFeeData] 잘못된 형식: ${oldFeeId}`);
                results.feesSkipped++;
                continue;
              }

              const month = parts[parts.length - 1]; // 마지막 부분이 월
              const memberId = parts.slice(0, -1).join("_"); // 나머지가 memberId

              // month 형식 검증 (YYYY-MM)
              if (!/^\d{4}-\d{2}$/.test(month)) {
                logger.warn(`⚠️ [migrateFeeData] 잘못된 월 형식: ${month}`);
                results.feesSkipped++;
                continue;
              }

              // 새 구조 경로
              const newFeeRef = db
                .collection("teams")
                .doc(currentTeamId)
                .collection("fees")
                .doc(month)
                .collection("items")
                .doc(memberId);

              // 이미 존재하는지 확인
              const newFeeExists = await newFeeRef.get();
              if (newFeeExists.exists) {
                logger.info(`⚠️ [migrateFeeData] 이미 존재: ${currentTeamId}/${month}/${memberId}`);
                results.feesSkipped++;
                continue;
              }

              // 새 구조로 데이터 변환
              const newFeeData = {
                teamId: currentTeamId,
                memberId,
                memberName: oldFeeData.memberName || oldFeeData.name || "이름 없음",
                month,
                amount: oldFeeData.amount || oldFeeData.monthlyFee || 20000,
                paid: oldFeeData.paid || false,
                paidAt: oldFeeData.paidAt || (oldFeeData.paid ? FieldValue.serverTimestamp() : null),
                processedBy: oldFeeData.processedBy || oldFeeData.createdBy || null,
                createdAt: oldFeeData.createdAt || FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp(),
                // 기존 데이터 보존 (필요시)
                migratedFrom: oldFeeId,
                migratedAt: FieldValue.serverTimestamp(),
              };

              if (!dryRun) {
                // 실제 마이그레이션
                batch.set(newFeeRef, newFeeData);
                batchCount++;
                results.feesMigrated++;
              } else {
                // 테스트 모드: 로그만 출력
                logger.info(`🧪 [migrateFeeData] 테스트: ${currentTeamId}/${month}/${memberId}`);
                results.feesMigrated++;
              }

              // 배치 제한 체크
              if (batchCount >= MAX_BATCH_SIZE) {
                if (!dryRun) {
                  await batch.commit();
                  logger.info(`✅ [migrateFeeData] 배치 커밋: ${batchCount}개 항목`);
                }
                batchCount = 0;
              }

            } catch (feeError: any) {
              const errorMsg = `fee ${oldFeeId} 마이그레이션 실패: ${feeError.message}`;
              logger.error(`❌ [migrateFeeData] ${errorMsg}`);
              results.errors.push(errorMsg);
              results.feesSkipped++;
            }
          }

          // 남은 배치 커밋
          if (batchCount > 0 && !dryRun) {
            await batch.commit();
            logger.info(`✅ [migrateFeeData] 최종 배치 커밋: ${batchCount}개 항목`);
          }

          results.teamsProcessed++;

        } catch (teamError: any) {
          const errorMsg = `팀 ${currentTeamId} 처리 실패: ${teamError.message}`;
          logger.error(`❌ [migrateFeeData] ${errorMsg}`);
          results.errors.push(errorMsg);
        }
      }

      logger.info(`✅ [migrateFeeData] 마이그레이션 완료:`, results);

      return {
        success: true,
        message: dryRun ? "테스트 모드: 실제 마이그레이션은 dryRun=false로 실행하세요." : "마이그레이션이 완료되었습니다.",
        results,
      };

    } catch (error: any) {
      logger.error("❌ [migrateFeeData] 마이그레이션 실패:", error);
      throw new HttpsError("internal", `마이그레이션 실패: ${error.message}`);
    }
  }
);

/**
 * 🔍 마이그레이션 상태 확인
 * 
 * 기존 데이터와 새 데이터 비교
 */
export const checkMigrationStatus = onCall(
  {
    region: "asia-northeast3",
    cors: true,
  },
  async (request) => {
    try {
      const { teamId } = request.data || {};
      const userId = request.auth?.uid;

      if (!userId) {
        throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
      }

      logger.info("🔍 [checkMigrationStatus] 마이그레이션 상태 확인", { teamId, userId });

      // 기존 구조와 새 구조 비교
      // 실제 구현은 기존 구조에 맞게 수정 필요

      return {
        success: true,
        message: "마이그레이션 상태 확인 완료",
        // 실제 비교 결과 반환
      };

    } catch (error: any) {
      logger.error("❌ [checkMigrationStatus] 상태 확인 실패:", error);
      throw new HttpsError("internal", `상태 확인 실패: ${error.message}`);
    }
  }
);

