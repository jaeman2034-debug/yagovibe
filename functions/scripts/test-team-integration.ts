/**
 * 🔥 팀 도메인 통합 테스트 스크립트
 * 
 * 사용법:
 * cd functions
 * npm run test:integration
 */

import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

// Firebase Admin 초기화
if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();
const auth = getAuth();

/**
 * 테스트 1: 팀 생성 검증
 */
async function testTeamCreation(teamId: string, ownerUid: string) {
  console.log("\n🧪 테스트 1: 팀 생성 검증");
  console.log("=".repeat(50));
  
  try {
    // teams/{teamId} 확인
    const teamDoc = await db.doc(`teams/${teamId}`).get();
    
    if (!teamDoc.exists) {
      console.error("❌ 팀 문서가 존재하지 않습니다.");
      return false;
    }
    
    const teamData = teamDoc.data()!;
    
    const checks = {
      memberCount: teamData.memberCount === 1,
      membership: teamData.membership === "non-member",
      regionCode: !!teamData.regionCode,
      status: teamData.status === "active",
    };
    
    console.log("팀 문서 검증:", {
      memberCount: teamData.memberCount,        // 예상: 1
      membership: teamData.membership,         // 예상: "non-member"
      regionCode: teamData.regionCode,        // 예상: "SEOUL_NOWON" 등
      status: teamData.status,                 // 예상: "active"
    });
    
    // members 서브컬렉션 확인
    const memberDoc = await db.doc(`teams/${teamId}/members/${ownerUid}`).get();
    
    if (!memberDoc.exists) {
      console.error("❌ 멤버 문서가 존재하지 않습니다.");
      return false;
    }
    
    const memberData = memberDoc.data()!;
    
    console.log("멤버 문서 검증:", {
      role: memberData.role,                   // 예상: "owner"
      status: memberData.status,               // 예상: "active"
      userId: memberData.userId,               // 예상: ownerUid
    });
    
    const allPassed = Object.values(checks).every(v => v) && memberData.role === "owner";
    
    if (allPassed) {
      console.log("✅ 테스트 1 통과");
    } else {
      console.error("❌ 테스트 1 실패");
    }
    
    return allPassed;
  } catch (error: any) {
    console.error("❌ 테스트 1 에러:", error.message);
    return false;
  }
}

/**
 * 테스트 2: team_members 인덱스 확인
 */
async function testTeamMembersIndex(teamId: string, userId: string) {
  console.log("\n🧪 테스트 2: team_members 인덱스 확인");
  console.log("=".repeat(50));
  
  try {
    const indexDocId = `${userId}_${teamId}`;
    const indexDoc = await db.doc(`team_members/${indexDocId}`).get();
    
    if (!indexDoc.exists) {
      console.error("❌ team_members 인덱스가 존재하지 않습니다.");
      return false;
    }
    
    const indexData = indexDoc.data()!;
    
    const checks = {
      teamId: indexData.teamId === teamId,
      userId: indexData.userId === userId,
      role: indexData.role === "owner",
      status: indexData.status === "active",
    };
    
    console.log("인덱스 문서 검증:", {
      teamId: indexData.teamId,               // 예상: teamId와 일치
      userId: indexData.userId,               // 예상: userId와 일치
      role: indexData.role,                   // 예상: "owner"
      status: indexData.status,                // 예상: "active"
    });
    
    const allPassed = Object.values(checks).every(v => v);
    
    if (allPassed) {
      console.log("✅ 테스트 2 통과");
    } else {
      console.error("❌ 테스트 2 실패");
    }
    
    return allPassed;
  } catch (error: any) {
    console.error("❌ 테스트 2 에러:", error.message);
    return false;
  }
}

/**
 * 테스트 3: 팀원 추가 검증
 */
async function testAddMember(teamId: string, newMemberUid: string) {
  console.log("\n🧪 테스트 3: 팀원 추가 검증");
  console.log("=".repeat(50));
  
  try {
    // 이전 memberCount 확인
    const teamDocBefore = await db.doc(`teams/${teamId}`).get();
    const memberCountBefore = teamDocBefore.data()?.memberCount || 0;
    
    console.log("이전 memberCount:", memberCountBefore);
    
    // 멤버 추가 (실제로는 UI에서 추가하거나 별도 스크립트로)
    // 여기서는 검증만 수행
    
    // 잠시 대기 (Cloud Function 트리거 대기)
    console.log("⏳ Cloud Function 트리거 대기 중... (3초)");
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 인덱스 확인
    const indexDocId = `${newMemberUid}_${teamId}`;
    const indexDoc = await db.doc(`team_members/${indexDocId}`).get();
    
    if (!indexDoc.exists) {
      console.error("❌ team_members 인덱스가 생성되지 않았습니다.");
      return false;
    }
    
    // memberCount 확인
    const teamDocAfter = await db.doc(`teams/${teamId}`).get();
    const memberCountAfter = teamDocAfter.data()?.memberCount || 0;
    
    console.log("추가 후 검증:", {
      인덱스_생성: indexDoc.exists,           // 예상: true
      이전_memberCount: memberCountBefore,
      현재_memberCount: memberCountAfter,      // 예상: memberCountBefore + 1
      증가_확인: memberCountAfter === memberCountBefore + 1,
    });
    
    const allPassed = indexDoc.exists && memberCountAfter === memberCountBefore + 1;
    
    if (allPassed) {
      console.log("✅ 테스트 3 통과");
    } else {
      console.error("❌ 테스트 3 실패");
    }
    
    return allPassed;
  } catch (error: any) {
    console.error("❌ 테스트 3 에러:", error.message);
    return false;
  }
}

/**
 * 테스트 4: 팀원 삭제 검증
 */
async function testDeleteMember(teamId: string, memberUid: string) {
  console.log("\n🧪 테스트 4: 팀원 삭제 검증");
  console.log("=".repeat(50));
  
  try {
    // 이전 memberCount 확인
    const teamDocBefore = await db.doc(`teams/${teamId}`).get();
    const memberCountBefore = teamDocBefore.data()?.memberCount || 0;
    
    console.log("이전 memberCount:", memberCountBefore);
    
    // 잠시 대기 (Cloud Function 트리거 대기)
    console.log("⏳ Cloud Function 트리거 대기 중... (3초)");
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 인덱스 삭제 확인
    const indexDocId = `${memberUid}_${teamId}`;
    const indexDoc = await db.doc(`team_members/${indexDocId}`).get();
    
    // memberCount 확인
    const teamDocAfter = await db.doc(`teams/${teamId}`).get();
    const memberCountAfter = teamDocAfter.data()?.memberCount || 0;
    
    console.log("삭제 후 검증:", {
      인덱스_삭제: !indexDoc.exists,          // 예상: true
      이전_memberCount: memberCountBefore,
      현재_memberCount: memberCountAfter,      // 예상: memberCountBefore - 1
      감소_확인: memberCountAfter === Math.max(0, memberCountBefore - 1),
      음수_방지: memberCountAfter >= 0,       // 예상: true
    });
    
    const allPassed = !indexDoc.exists && 
                      memberCountAfter === Math.max(0, memberCountBefore - 1) &&
                      memberCountAfter >= 0;
    
    if (allPassed) {
      console.log("✅ 테스트 4 통과");
    } else {
      console.error("❌ 테스트 4 실패");
    }
    
    return allPassed;
  } catch (error: any) {
    console.error("❌ 테스트 4 에러:", error.message);
    return false;
  }
}

/**
 * 테스트 5: Role 변경 검증
 */
async function testRoleChange(teamId: string, memberUid: string) {
  console.log("\n🧪 테스트 5: Role 변경 검증");
  console.log("=".repeat(50));
  
  try {
    // 원본 role 확인
    const memberDoc = await db.doc(`teams/${teamId}/members/${memberUid}`).get();
    const memberRole = memberDoc.data()?.role;
    
    // 인덱스 role 확인
    const indexDocId = `${memberUid}_${teamId}`;
    const indexDoc = await db.doc(`team_members/${indexDocId}`).get();
    const indexRole = indexDoc.data()?.role;
    
    console.log("Role 동기화 검증:", {
      memberRole,                             // 예상: "admin" 등
      indexRole,                              // 예상: memberRole과 일치
      동기화됨: memberRole === indexRole,     // 예상: true
    });
    
    const allPassed = memberRole === indexRole;
    
    if (allPassed) {
      console.log("✅ 테스트 5 통과");
    } else {
      console.error("❌ 테스트 5 실패 - Role 불일치");
    }
    
    return allPassed;
  } catch (error: any) {
    console.error("❌ 테스트 5 에러:", error.message);
    return false;
  }
}

/**
 * 메인 테스트 실행
 */
async function runIntegrationTests() {
  console.log("🔥 Phase 1-5 통합 테스트 시작");
  console.log("=".repeat(50));
  
  // 테스트용 팀 ID와 사용자 ID (실제 값으로 교체 필요)
  const TEST_TEAM_ID = process.env.TEST_TEAM_ID || "";
  const TEST_OWNER_UID = process.env.TEST_OWNER_UID || "";
  const TEST_MEMBER_UID = process.env.TEST_MEMBER_UID || "";
  
  if (!TEST_TEAM_ID || !TEST_OWNER_UID) {
    console.error("❌ 환경 변수 설정 필요:");
    console.error("   TEST_TEAM_ID=팀ID");
    console.error("   TEST_OWNER_UID=소유자UID");
    console.error("   TEST_MEMBER_UID=멤버UID (선택)");
    console.error("\n사용 예:");
    console.error("   $env:TEST_TEAM_ID=\"team123\"; $env:TEST_OWNER_UID=\"user456\"; npm run test:integration");
    return;
  }
  
  const results = {
    test1: false,
    test2: false,
    test3: false,
    test4: false,
    test5: false,
  };
  
  // 테스트 실행
  results.test1 = await testTeamCreation(TEST_TEAM_ID, TEST_OWNER_UID);
  results.test2 = await testTeamMembersIndex(TEST_TEAM_ID, TEST_OWNER_UID);
  
  if (TEST_MEMBER_UID) {
    results.test3 = await testAddMember(TEST_TEAM_ID, TEST_MEMBER_UID);
    results.test4 = await testDeleteMember(TEST_TEAM_ID, TEST_MEMBER_UID);
    results.test5 = await testRoleChange(TEST_TEAM_ID, TEST_MEMBER_UID);
  } else {
    console.log("\n⚠️ TEST_MEMBER_UID가 설정되지 않아 테스트 3-5를 건너뜁니다.");
  }
  
  // 결과 요약
  console.log("\n" + "=".repeat(50));
  console.log("📊 테스트 결과 요약");
  console.log("=".repeat(50));
  
  const passedCount = Object.values(results).filter(v => v).length;
  const totalCount = Object.keys(results).length;
  
  console.log(`통과: ${passedCount}/${totalCount}`);
  console.log("\n상세 결과:");
  console.log(`  테스트 1 (팀 생성): ${results.test1 ? "✅" : "❌"}`);
  console.log(`  테스트 2 (인덱스): ${results.test2 ? "✅" : "❌"}`);
  console.log(`  테스트 3 (멤버 추가): ${results.test3 ? "✅" : "❌"}`);
  console.log(`  테스트 4 (멤버 삭제): ${results.test4 ? "✅" : "❌"}`);
  console.log(`  테스트 5 (Role 변경): ${results.test5 ? "✅" : "❌"}`);
  
  if (passedCount === totalCount) {
    console.log("\n🎉 모든 테스트 통과!");
    console.log("✅ Step 1 완료 - 운영 안정화 완료");
  } else {
    console.log("\n⚠️ 일부 테스트 실패 - 수정 필요");
  }
}

// 스크립트 실행
if (require.main === module) {
  runIntegrationTests().catch(console.error);
}

export { runIntegrationTests };
