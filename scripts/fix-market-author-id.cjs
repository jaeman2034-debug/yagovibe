/**
 * 🔥 Market 컬렉션 authorId 일괄 수정 스크립트
 * 
 * 사용법:
 * node scripts/fix-market-author-id.cjs <새로운UID>
 * 
 * 예시:
 * node scripts/fix-market-author-id.cjs 6ie7FcdHPvaYc2DxXMZeZ1Vw1xw1
 * 
 * ⚠️ 주의: 이 스크립트는 serviceAccountKey.json이 필요합니다.
 */

const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");

// serviceAccountKey.json 경로 확인 (functions 폴더 또는 루트)
const serviceAccountPath = 
  fs.existsSync(path.join(__dirname, "..", "functions", "serviceAccountKey.json"))
    ? path.join(__dirname, "..", "functions", "serviceAccountKey.json")
    : path.join(__dirname, "..", "serviceAccountKey.json");

let serviceAccount;
try {
  serviceAccount = require(serviceAccountPath);
} catch (error) {
  console.error("❌ serviceAccountKey.json을 찾을 수 없습니다.");
  console.error("💡 Firebase Console → Project Settings → Service Accounts → Generate New Private Key");
  console.error("💡 경로 확인:", serviceAccountPath);
  process.exit(1);
}

// Firebase Admin 초기화
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

async function fixMarketAuthorId(newUid) {
  try {
    console.log("🔍 [fix-market-author-id] authorId가 'dummy-user-3'인 문서 검색 중...");
    
    // authorId가 "dummy-user-3"인 문서 찾기
    const marketRef = db.collection("market");
    const snapshot = await marketRef.where("authorId", "==", "dummy-user-3").get();
    
    if (snapshot.empty) {
      console.log("✅ 수정할 문서가 없습니다.");
      process.exit(0);
    }
    
    console.log(`📝 발견된 문서 수: ${snapshot.size}개`);
    
    // 각 문서 업데이트
    const batch = db.batch();
    let count = 0;
    
    snapshot.forEach((doc) => {
      const docRef = db.collection("market").doc(doc.id);
      batch.update(docRef, {
        authorId: newUid,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      count++;
      console.log(`  - ${doc.id}: authorId 업데이트 예정`);
    });
    
    // 배치 커밋
    await batch.commit();
    
    console.log(`\n✅ ${count}개 문서의 authorId가 성공적으로 업데이트되었습니다!`);
    console.log(`   새로운 authorId: ${newUid}`);
    console.log(`\n💡 이제 해당 게시글에서 작성자 모드가 활성화됩니다.`);
    
    process.exit(0);
  } catch (error) {
    console.error("❌ 오류 발생:", error);
    process.exit(1);
  }
}

// 명령줄 인자 확인
const newUid = process.argv[2];

if (!newUid) {
  console.error("❌ 사용법: node scripts/fix-market-author-id.cjs <새로운UID>");
  console.error("예시: node scripts/fix-market-author-id.cjs 6ie7FcdHPvaYc2DxXMZeZ1Vw1xw1");
  process.exit(1);
}

// UID 형식 검증 (간단한 체크)
if (newUid.length < 20) {
  console.warn("⚠️ 경고: UID가 너무 짧습니다. 올바른 UID인지 확인하세요.");
}

fixMarketAuthorId(newUid);
