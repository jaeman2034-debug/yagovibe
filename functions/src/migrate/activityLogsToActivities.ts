/**
 * 🔥 activityLogs → activities 마이그레이션 스크립트
 * 
 * 역할:
 * - 기존 activityLogs 데이터를 activities로 복사
 * - 동일 id 사용 (중복 방지)
 * - visibility는 기본 "public"
 * - createdAt 유지
 * 
 * 실행 방법:
 * - HTTP callable function으로 호출
 * - 또는 admin script로 실행
 */

import * as functions from "firebase-functions/v2";
import { getFirestore } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";

const db = getFirestore();
const logger = functions.logger;

/**
 * activityLogs → activities 마이그레이션
 */
export const migrateActivityLogsToActivities = functions.https.onCall(
  async (request) => {
    // 🔥 관리자만 실행 가능
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    }

    const data = request.data as { batchSize?: number; dryRun?: boolean } | null;
    const batchSize = data?.batchSize ?? 100;
    const dryRun = data?.dryRun !== false; // 기본값: true (실제 실행 전 테스트)

    logger.info("🔥 [migrateActivityLogsToActivities] 마이그레이션 시작", {
      batchSize,
      dryRun,
    });

    try {
      // 1. activityLogs 전체 조회
      const activityLogsRef = db.collection("activityLogs");
      const activityLogsSnap = await activityLogsRef
        .orderBy("createdAt", "desc")
        .limit(batchSize)
        .get();

      logger.info("📊 [migrateActivityLogsToActivities] activityLogs 조회 결과", {
        count: activityLogsSnap.size,
      });

      if (activityLogsSnap.empty) {
        return {
          success: true,
          message: "마이그레이션할 데이터가 없습니다.",
          migrated: 0,
          skipped: 0,
        };
      }

      let migrated = 0;
      let skipped = 0;
      const batch = db.batch();

      // 2. 각 activityLog를 activity로 변환
      for (const logDoc of activityLogsSnap.docs) {
        const logData = logDoc.data();
        const activityId = logDoc.id; // 동일 id 사용

        // 🔥 중복 확인: activities에 이미 존재하는지 체크
        const existingActivityRef = db.doc(`activities/${activityId}`);
        const existingSnap = await existingActivityRef.get();

        if (existingSnap.exists) {
          logger.info("⏭️ [migrateActivityLogsToActivities] 이미 존재하는 activity", {
            activityId,
          });
          skipped++;
          continue;
        }

        // 🔥 type 매핑: activityLogs.type → activities.type
        const typeMap: Record<string, string> = {
          market: "market_created",
          team: "team_created",
          event: "team_event",
          recruit: "recruit_created",
          match: "match_created",
          equipment: "equipment_created",
        };

        const activityType = typeMap[logData.type] || "market_created";

        // 🔥 refType 매핑
        const refTypeMap: Record<string, string> = {
          market: "market",
          team: "teams",
          event: "events",
          recruit: "recruit",
          match: "market",
          equipment: "market",
        };

        const refType = refTypeMap[logData.type] || "market";

        // 🔥 activity 데이터 생성 (지시문 필드 매핑 정확히 따름)
        const activityData = {
          // 필수 필드 (v1 스키마)
          type: activityType,
          refType: refType,
          refId: logData.refId || logData.sourceId || activityId,
          authorId: logData.authorId || logData.userId || "",
          title: logData.title || "",
          visibility: "public" as const,
          likeCount: 0,
          commentCount: 0,
          createdAt: logData.createdAt,
          
          // 선택 필드
          summary: logData.summary || undefined,
          thumbnailUrl: logData.thumbnailUrl || logData.thumbnail || undefined,
          teamId: logData.teamId || undefined,
          
          // 호환성 필드 (유지)
          sport: logData.sport || undefined,
          category: logData.category || undefined,
        };

        if (!dryRun) {
          // 실제 생성
          batch.set(existingActivityRef, activityData);
        }

        migrated++;
      }

      if (!dryRun && migrated > 0) {
        await batch.commit();
        logger.info("✅ [migrateActivityLogsToActivities] 마이그레이션 완료", {
          migrated,
          skipped,
        });
      } else {
        logger.info("🧪 [migrateActivityLogsToActivities] Dry run 완료", {
          migrated,
          skipped,
        });
      }

      return {
        success: true,
        message: dryRun
          ? `Dry run 완료: ${migrated}개 마이그레이션 예정, ${skipped}개 스킵`
          : `마이그레이션 완료: ${migrated}개 생성, ${skipped}개 스킵`,
        migrated,
        skipped,
        dryRun,
      };
    } catch (error: any) {
      logger.error("❌ [migrateActivityLogsToActivities] 마이그레이션 실패", error);
      throw new HttpsError(
        "internal",
        `마이그레이션 실패: ${error.message}`
      );
    }
  }
);
