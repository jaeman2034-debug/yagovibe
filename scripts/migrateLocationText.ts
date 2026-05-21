/**
 * 🔥 기존 상품 행정동(locationText) 마이그레이션 스크립트
 * 
 * 목적: 기존 상품의 lat/lng → 행정동 locationText 자동 채움
 * 
 * 조건:
 * - latitude && longitude 있음
 * - locationText 없음 (또는 빈 값)
 * 
 * 실행 방법:
 * 1. Firebase Admin 권한 설정
 *    export GOOGLE_APPLICATION_CREDENTIALS=serviceAccount.json
 *    (또는 Windows: $env:GOOGLE_APPLICATION_CREDENTIALS="serviceAccount.json")
 * 
 * 2. 실행
 *    npx tsx scripts/migrateLocationText.ts
 * 
 * 3. 결과 확인
 *    콘솔에 "✅ productId → 서울특별시 중구 신당동" 형식으로 출력
 */

import * as admin from "firebase-admin";
import fetch from "node-fetch";

// Firebase Admin 초기화
if (!admin.apps.length) {
  try {
    // 방법 1: 환경 변수에서 service account 경로 가져오기
    const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    
    if (serviceAccountPath) {
      const serviceAccount = require(serviceAccountPath);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } else {
      // 방법 2: 기본 경로에서 찾기 (functions/serviceAccountKey.json)
      try {
        const serviceAccount = require("../functions/serviceAccountKey.json");
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
      } catch {
        // 방법 3: 기본 초기화 (애플리케이션 기본 자격 증명 사용)
        admin.initializeApp();
      }
    }
  } catch (error: any) {
    console.error("❌ Firebase Admin 초기화 실패:", error);
    console.error("💡 해결 방법:");
    console.error("   1. GOOGLE_APPLICATION_CREDENTIALS 환경 변수를 설정하세요.");
    console.error("   2. 또는 functions/serviceAccountKey.json 파일을 확인하세요.");
    process.exit(1);
  }
}

const db = admin.firestore();

// 🔥 Geocoding Cloud Function URL
const GEOCODE_FN =
  "https://asia-northeast3-yago-vibe-spt.cloudfunctions.net/geocodeLocation";

/**
 * 🔥 마이그레이션 실행
 */
async function migrate() {
  console.log("🚀 마이그레이션 시작...\n");

  try {
    // 🔥 조건: latitude && longitude 있음, locationText 없음
    const snapshot = await db
      .collection("marketProducts")
      .where("latitude", "!=", null)
      .where("longitude", "!=", null)
      .get();

    console.log(`📊 총 ${snapshot.size}개 상품 발견 (좌표 있음)\n`);

    let updated = 0;
    let skipped = 0;
    let failed = 0;

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const docId = doc.id;

      // 🔥 이미 locationText가 있으면 스킵
      if (data.locationText && data.locationText.trim() !== "") {
        skipped++;
        continue;
      }

      // 🔥 좌표 유효성 검증
      const lat = Number(data.latitude);
      const lng = Number(data.longitude);

      if (
        Number.isNaN(lat) ||
        Number.isNaN(lng) ||
        !Number.isFinite(lat) ||
        !Number.isFinite(lng) ||
        lat < -90 ||
        lat > 90 ||
        lng < -180 ||
        lng > 180
      ) {
        console.warn(`⚠️  ${docId} → 유효하지 않은 좌표 (${lat}, ${lng})`);
        failed++;
        continue;
      }

      try {
        // 🔥 Cloud Function 호출
        const geocodeUrl = `${GEOCODE_FN}?latitude=${lat}&longitude=${lng}`;
        const response = await fetch(geocodeUrl);

        if (!response.ok) {
          console.warn(`❌ ${docId} → HTTP ${response.status} ${response.statusText}`);
          failed++;
          continue;
        }

        const json: any = await response.json();

        if (!json.success || !json.locationText) {
          console.warn(`❌ ${docId} → Geocoding 실패:`, json.error || "알 수 없는 오류");
          failed++;
          continue;
        }

        // 🔥 Firestore 업데이트
        await doc.ref.update({
          locationText: json.locationText,
          address: json.locationText, // 호환성 유지
          addressShort: json.addressShort || null,
          region1: json.region1 || null,
          region2: json.region2 || null,
          region3: json.region3 || null,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        updated++;
        console.log(`✅ ${docId} → ${json.locationText}`);

        // 🔥 API Rate Limit 방지 (100ms 대기)
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error: any) {
        console.error(`❌ ${docId} → 오류:`, error.message || error);
        failed++;
      }
    }

    // 🔥 결과 요약
    console.log("\n" + "=".repeat(50));
    console.log("🎉 마이그레이션 완료!");
    console.log("=".repeat(50));
    console.log(`✅ 업데이트: ${updated}개`);
    console.log(`⏭️  스킵: ${skipped}개 (이미 locationText 있음)`);
    console.log(`❌ 실패: ${failed}개`);
    console.log(`📊 총 처리: ${snapshot.size}개`);
    console.log("=".repeat(50));
  } catch (error: any) {
    console.error("❌ 마이그레이션 중 오류 발생:", error);
    throw error;
  }
}

// 🔥 실행
migrate()
  .then(() => {
    console.log("\n✅ 스크립트 완료");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ 스크립트 실패:", error);
    process.exit(1);
  });

