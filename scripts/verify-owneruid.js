/**
 * ownerUid 값 확인 스크립트
 * 
 * 실행 방법:
 * 1. Firestore Emulator 실행 중이어야 함: firebase emulators:start
 * 2. node scripts/verify-owneruid.js
 */

import { createRequire } from "module";
const require = createRequire(import.meta.url);
const admin = require("firebase-admin");

// Firestore Emulator 연결 설정 (포트 8086)
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8086";

// Firebase Admin 초기화 (Emulator)
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: "yago-vibe-spt",
  });
}

const db = admin.firestore();

const ASSOCIATION_ID = "assoc-nowon-football";
const EXPECTED_UID = "qGq5XmuXRBsRZ0qJFE0yqtZY5Hin";

async function verifyOwnerUid() {
  try {
    console.log("🔍 ownerUid 값 확인 시작...\n");

    // 1. Association 문서 확인
    const associationRef = db.doc(`associations/${ASSOCIATION_ID}`);
    const associationDoc = await associationRef.get();
    
    if (!associationDoc.exists) {
      console.error("❌ Association 문서가 존재하지 않음!");
      return;
    }

    const assocData = associationDoc.data();
    const ownerUid = assocData?.ownerUid;
    
    console.log("📋 Association 문서 데이터:");
    console.log("   - id:", assocData?.id);
    console.log("   - name:", assocData?.name);
    console.log("   - status:", assocData?.status);
    console.log("   - ownerUid:", ownerUid);
    console.log("   - ownerUid 타입:", typeof ownerUid);
    console.log("   - ownerUid 길이:", ownerUid?.length);
    console.log("");

    // 2. UID 일치 확인
    console.log("🔍 UID 일치 확인:");
    console.log("   - 예상 UID:", EXPECTED_UID);
    console.log("   - 실제 ownerUid:", ownerUid);
    console.log("   - 일치 여부:", ownerUid === EXPECTED_UID);
    console.log("");

    if (ownerUid === EXPECTED_UID) {
      console.log("✅ ownerUid 값이 정확히 일치합니다!");
    } else {
      console.log("❌ ownerUid 값이 일치하지 않습니다!");
      console.log("   - 차이점:");
      if (!ownerUid) {
        console.log("     → ownerUid가 undefined 또는 null입니다");
      } else if (ownerUid.length !== EXPECTED_UID.length) {
        console.log("     → 길이가 다릅니다");
        console.log("       예상 길이:", EXPECTED_UID.length);
        console.log("       실제 길이:", ownerUid.length);
      } else {
        // 문자별 비교
        for (let i = 0; i < Math.max(ownerUid.length, EXPECTED_UID.length); i++) {
          if (ownerUid[i] !== EXPECTED_UID[i]) {
            console.log(`     → ${i}번째 문자부터 다릅니다`);
            console.log(`       예상: "${EXPECTED_UID.substring(i, i + 10)}..."`);
            console.log(`       실제: "${ownerUid.substring(i, i + 10)}..."`);
            break;
          }
        }
      }
    }

    // 3. Members 문서 확인
    console.log("\n📋 Members 문서 확인:");
    const memberRef = db.doc(`associations/${ASSOCIATION_ID}/members/${EXPECTED_UID}`);
    const memberDoc = await memberRef.get();
    
    if (!memberDoc.exists) {
      console.error("❌ Member 문서가 존재하지 않음!");
      return;
    }

    const memberData = memberDoc.data();
    console.log("   - role:", memberData?.role);
    console.log("   - status:", memberData?.status);
    console.log("   - joinedAt:", memberData?.joinedAt?.toDate?.() || memberData?.joinedAt);
    console.log("");

    // 4. 최종 확인
    console.log("🎯 최종 확인:");
    const isOwnerMatch = ownerUid === EXPECTED_UID;
    const hasAdminRole = memberData?.role === "admin";
    
    console.log("   - ownerUid 일치:", isOwnerMatch ? "✅" : "❌");
    console.log("   - role이 admin:", hasAdminRole ? "✅" : "❌");
    console.log("");

    if (isOwnerMatch && hasAdminRole) {
      console.log("🎉 모든 권한 데이터가 정상입니다!");
      console.log("\n다음 단계:");
      console.log("1. 브라우저에서 대회 등록 페이지 새로고침");
      console.log("2. 콘솔에서 [useIsAssociationOwner] isOwner: true 확인");
      console.log("3. '게시' 토글이 활성화되었는지 확인");
    } else {
      console.log("⚠️  권한 데이터에 문제가 있습니다.");
      if (!isOwnerMatch) {
        console.log("   → ownerUid를 수정해야 합니다");
      }
      if (!hasAdminRole) {
        console.log("   → role을 'admin'으로 수정해야 합니다");
      }
    }

  } catch (error) {
    console.error("❌ 오류 발생:", error);
    console.error("\n확인 사항:");
    console.error("1. Firestore Emulator가 실행 중인지 확인: firebase emulators:start");
    console.error("2. Emulator 포트가 8086인지 확인: firebase.json의 firestore.port 확인");
    process.exit(1);
  }
}

verifyOwnerUid().then(() => {
  console.log("\n✅ 스크립트 실행 완료");
  process.exit(0);
});
