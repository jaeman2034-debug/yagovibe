/**
 * 🔥 activityLogs → activities 마이그레이션 로컬 실행 스크립트
 * 
 * 실행 방법:
 * cd functions
 * npx ts-node scripts/migrateActivityLogs.ts
 */

import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as path from "path";
import * as fs from "fs";

// Firebase Admin 초기화 (serviceAccountKey.json 사용)
if (getApps().length === 0) {
  const serviceAccountPath = path.join(__dirname, "..", "serviceAccountKey.json");
  
  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));
    initializeApp({
      credential: cert(serviceAccount),
      projectId: serviceAccount.project_id, // 🔥 프로젝트 ID 명시
    });
    console.log(`✅ Firebase Admin 초기화 완료 (프로젝트: ${serviceAccount.project_id})`);
  } else {
    // 프로덕션 환경에서는 기본 인증 사용
    initializeApp();
    console.log("✅ Firebase Admin 초기화 완료 (기본 인증 사용)");
  }
}

const db = getFirestore();

// type 매핑: activityLogs.type → activities.type
const typeMap: Record<string, string> = {
  market: "market_created",
  team: "team_created",
  event: "team_event",
  recruit: "recruit_created",
  match: "match_created",
  equipment: "equipment_created",
};

// refType 매핑
const refTypeMap: Record<string, string> = {
  market: "market",
  team: "teams",
  event: "events",
  recruit: "recruit",
  match: "market",
  equipment: "market",
};

async function migrateActivityLogs() {
  console.log("🔥 [Migration] activityLogs → activities 마이그레이션 시작...\n");

  try {
    // 1. activityLogs 전체 조회
    const activityLogsRef = db.collection("activityLogs");
    const activityLogsSnap = await activityLogsRef.get();

    console.log(`📊 [Migration] activityLogs 총 문서 수: ${activityLogsSnap.size}`);

    if (activityLogsSnap.empty) {
      console.log("✅ [Migration] 마이그레이션할 데이터가 없습니다.");
      return;
    }

    let migrated = 0;
    let skipped = 0;
    let errorCount = 0;
    const batch = db.batch();
    const BATCH_SIZE = 500; // Firestore 배치 제한
    let batchCount = 0;

    // 2. 각 activityLog를 activity로 변환
    for (const logDoc of activityLogsSnap.docs) {
      const logData = logDoc.data();
      const activityId = logDoc.id; // 동일 id 사용

      // 🔥 중복 확인: activities에 이미 존재하는지 체크
      const existingActivityRef = db.doc(`activities/${activityId}`);
      const existingSnap = await existingActivityRef.get();

      if (existingSnap.exists) {
        skipped++;
        continue;
      }

      try {
        // type 매핑
        const activityType = typeMap[logData.type] || "market_created";

        // refType 매핑
        const refType = refTypeMap[logData.type] || "market";

        // 🔥 activity 데이터 생성 (지시문 필드 매핑 정확히 따름)
        // ⚠️ Firestore는 undefined 값을 허용하지 않으므로 필터링 필요
        const activityData: any = {
          // 필수 필드 (v1 스키마)
          type: activityType,
          refType: refType,
          refId: logData.refId || logData.sourceId || activityId,
          authorId: logData.authorId || logData.userId || "",
          title: logData.title || "",
          visibility: logData.visibility ?? "public", // 🔥 visibility 없으면 "public" 기본값
          likeCount: 0,
          commentCount: 0,
          createdAt: logData.createdAt,
        };

        // 선택 필드 (undefined가 아닌 경우만 추가)
        if (logData.summary) {
          activityData.summary = logData.summary;
        }
        if (logData.thumbnailUrl || logData.thumbnail) {
          activityData.thumbnailUrl = logData.thumbnailUrl || logData.thumbnail;
        }
        if (logData.teamId) {
          activityData.teamId = logData.teamId;
        }
        if (logData.sport) {
          activityData.sport = logData.sport;
        }
        if (logData.category) {
          activityData.category = logData.category;
        }

        // 배치에 추가
        batch.set(existingActivityRef, activityData);
        migrated++;
        batchCount++;

        // 배치 제한 도달 시 커밋
        if (batchCount >= BATCH_SIZE) {
          await batch.commit();
          console.log(`✅ [Migration] 배치 커밋 완료: ${batchCount}개 문서`);
          batchCount = 0;
        }
      } catch (error: any) {
        console.error(`❌ [Migration] 문서 변환 중 에러 발생:`, {
          activityId,
          error: error.message,
        });
        errorCount++;
      }
    }

    // 마지막 배치 커밋
    if (batchCount > 0) {
      await batch.commit();
      console.log(`✅ [Migration] 마지막 배치 커밋 완료: ${batchCount}개 문서`);
    }

    // 3. activities 총 문서 수 확인
    const activitiesSnap = await db.collection("activities").get();
    const totalActivities = activitiesSnap.size;

    console.log("\n" + "=".repeat(50));
    console.log("✅ [Migration] 마이그레이션 완료!");
    console.log("=".repeat(50));
    console.log(`📊 activityLogs 총 문서 수: ${activityLogsSnap.size}`);
    console.log(`✅ 마이그레이션된 문서 수: ${migrated}`);
    console.log(`⏭️  스킵된 문서 수 (이미 존재): ${skipped}`);
    console.log(`❌ 에러 발생 문서 수: ${errorCount}`);
    console.log(`🔥 activities 총 문서 수: ${totalActivities}`);
    console.log("=".repeat(50));

    if (migrated + skipped === activityLogsSnap.size) {
      console.log("\n✅ 모든 activityLogs 문서가 성공적으로 마이그레이션되었습니다!");
    } else {
      console.log(`\n⚠️  일부 문서가 마이그레이션되지 않았습니다. (에러: ${errorCount}개)`);
    }
  } catch (error: any) {
    console.error("❌ [Migration] 마이그레이션 실패:", error);
    process.exit(1);
  }
}

// 실행
migrateActivityLogs()
  .then(() => {
    console.log("\n✅ 스크립트 실행 완료");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ 스크립트 실행 실패:", error);
    process.exit(1);
  });
