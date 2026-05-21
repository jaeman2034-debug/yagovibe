// scripts/migrate-team-members.ts
// 🔄 team_members → teams/{teamId}/members/{uid} 백필 (SoT 누락 복구)
//
// 실행 예 (프로젝트 루트, GOOGLE_APPLICATION_CREDENTIALS 또는 gcloud 로그인):
//   npx ts-node scripts/migrate-team-members.ts --dry-run
//   npx ts-node scripts/migrate-team-members.ts --team=VojZWvNb0m1kzOBDlrsn --dry-run
//   npx ts-node scripts/migrate-team-members.ts --team=VojZWvNb0m1kzOBDlrsn

import * as admin from "firebase-admin";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

// Firebase Admin 초기화
if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = getFirestore();

function parseArgs() {
  const argv = process.argv.slice(2);
  const dryRun = argv.includes("--dry-run");
  let teamIdFilter: string | undefined;
  for (const a of argv) {
    if (a.startsWith("--team=")) {
      const v = a.slice("--team=".length).trim();
      if (v) teamIdFilter = v;
    }
  }
  return { dryRun, teamIdFilter };
}

/**
 * team_members 루트 컬렉션 → teams/{teamId}/members/{uid} 서브컬렉션 마이그레이션
 */
async function migrateTeamMembers() {
  const { dryRun, teamIdFilter } = parseArgs();
  console.log("🔄 [Migration] team_members → teams/{teamId}/members/{uid} 마이그레이션 시작");
  if (dryRun) console.log("🧪 [Migration] --dry-run (쓰기 없음)");
  if (teamIdFilter) console.log(`🎯 [Migration] 팀 한정: ${teamIdFilter}`);

  try {
    // 1) team_members 루트 컬렉션에서 모든 문서 조회
    const teamMembersRef = db.collection("team_members");
    const teamMembersSnapshot = await teamMembersRef.get();
    
    console.log(`📊 [Migration] team_members 문서 수: ${teamMembersSnapshot.size}`);
    
    if (teamMembersSnapshot.empty) {
      console.log("✅ [Migration] 마이그레이션할 문서가 없습니다.");
      return;
    }
    
    let successCount = 0;
    let wouldCreateCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    
    // 2) 각 문서를 teams/{teamId}/members/{uid}로 복사
    for (const memberDoc of teamMembersSnapshot.docs) {
      const memberData = memberDoc.data();
      const uid = String(memberData.uid || memberData.userId || "").trim();
      let teamId = String(memberData.teamId || memberData.team_id || "").trim();
      const role = memberData.role;

      /** 문서 ID: `${teamId}_${uid}`(joinTeam) 또는 `${uid}_${teamId}`(온보딩/구버전) */
      if (!teamId && uid && memberDoc.id.includes("_")) {
        const id = memberDoc.id;
        if (id.startsWith(`${uid}_`)) teamId = id.slice(uid.length + 1);
        else if (id.endsWith(`_${uid}`)) teamId = id.slice(0, id.length - uid.length - 1);
      }

      if (teamIdFilter && teamId !== teamIdFilter) {
        skipCount++;
        continue;
      }

      // 필수 필드 확인
      if (!uid || !teamId) {
        console.warn(`⚠️ [Migration] 필수 필드 누락, 스킵:`, {
          docId: memberDoc.id,
          uid,
          teamId
        });
        skipCount++;
        continue;
      }
      
      // 팀 문서 존재 확인
      const teamDocRef = db.doc(`teams/${teamId}`);
      const teamDocSnap = await teamDocRef.get();
      
      if (!teamDocSnap.exists) {
        console.warn(`⚠️ [Migration] 팀 문서 없음, 스킵:`, {
          docId: memberDoc.id,
          teamId,
          uid
        });
        skipCount++;
        continue;
      }
      
      try {
        // teams/{teamId}/members/{uid} 문서 생성
        const targetMemberRef = db.doc(`teams/${teamId}/members/${uid}`);
        const targetMemberSnap = await targetMemberRef.get();
        
        if (targetMemberSnap.exists) {
          console.log(`⏭️ [Migration] 이미 존재, 스킵: teams/${teamId}/members/${uid}`);
          skipCount++;
          continue;
        }
        
        // 마이그레이션 데이터 준비
        const migrationData: any = {
          role: role || "member",
          joinedAt: memberData.joinedAt || Timestamp.now(),
          migratedFrom: "team_members",
          migratedAt: Timestamp.now(),
        };
        
        // 기존 필드 복사 (role, joinedAt 제외)
        Object.keys(memberData).forEach(key => {
          if (key !== "uid" && key !== "teamId" && key !== "role" && key !== "joinedAt") {
            migrationData[key] = memberData[key];
          }
        });
        migrationData.uid = uid;
        migrationData.userId = uid;

        if (dryRun) {
          console.log(`🧪 [dry-run] 생성 예정: teams/${teamId}/members/${uid}`);
          successCount++;
          continue;
        }

        // 문서 생성
        await targetMemberRef.set(migrationData);
        
        successCount++;
        console.log(`✅ [Migration] 성공: teams/${teamId}/members/${uid}`, {
          role: migrationData.role,
          docId: memberDoc.id
        });
      } catch (error: any) {
        errorCount++;
        console.error(`❌ [Migration] 실패: teams/${teamId}/members/${uid}`, {
          error: error.message,
          docId: memberDoc.id
        });
      }
    }
    
    // 3) 마이그레이션 결과 요약
    console.log("=".repeat(80));
    console.log("📊 [Migration] 마이그레이션 완료");
    console.log(`   ✅ 성공: ${successCount}건`);
    if (dryRun) console.log(`   🧪 dry-run 생성 예정: ${wouldCreateCount}건`);
    console.log(`   ⏭️ 스킵: ${skipCount}건`);
    console.log(`   ❌ 실패: ${errorCount}건`);
    console.log(`   📝 총 처리: ${teamMembersSnapshot.size}건`);
    console.log("=".repeat(80));
    
    if (successCount > 0) {
      console.log("💡 [Migration] 다음 단계:");
      console.log("   1. Firestore 콘솔에서 teams/{teamId}/members/{uid} 문서 확인");
      console.log("   2. 정상 작동 확인 후 team_members 컬렉션 삭제 (선택)");
    }
  } catch (error: any) {
    console.error("❌ [Migration] 마이그레이션 실패:", error);
    throw error;
  }
}

// 스크립트 실행
if (require.main === module) {
  migrateTeamMembers()
    .then(() => {
      console.log("✅ [Migration] 마이그레이션 완료");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ [Migration] 마이그레이션 실패:", error);
      process.exit(1);
    });
}

export { migrateTeamMembers };

