/**
 * 🔥 updateTournamentPhaseCallable 서버 안정성 테스트
 * 
 * 실행 방법:
 * 1. Firebase Functions 배포 완료 후
 * 2. npm run test 또는 직접 실행
 */

import * as admin from "firebase-admin";
import { getFunctions, httpsCallable } from "firebase/functions";
import { initializeApp } from "firebase/app";

// Firebase 초기화 (테스트용)
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * 🔥 테스트 설정
 */
interface TestConfig {
  associationId: string;
  tournamentId: string;
  adminUidA: string; // 관리자 A
  adminUidB: string; // 관리자 B
  nonAdminUid: string; // 비관리자
}

/**
 * 🔥 Callable 함수 직접 호출 (Admin SDK)
 */
async function callUpdateTournamentPhase(
  uid: string,
  associationId: string,
  tournamentId: string,
  phase: string,
  requestId?: string
): Promise<any> {
  // 실제 Callable 함수를 직접 호출하는 대신, 함수 구현을 직접 호출
  // 또는 HTTP 요청으로 호출
  
  // 여기서는 테스트용으로 함수 구현을 직접 import하여 호출
  const { updateTournamentPhaseCallableImpl } = await import("../src/tournament/updateTournamentPhase");
  
  const mockRequest = {
    auth: { uid },
    data: {
      associationId,
      tournamentId,
      phase,
      requestId,
    },
  };
  
  return await updateTournamentPhaseCallableImpl(mockRequest as any);
}

/**
 * 🔥 1. 동시 클릭 테스트 (관리자 A/B)
 */
export async function testConcurrentClick(config: TestConfig): Promise<boolean> {
  console.log("🧪 [1] 동시 클릭 테스트 시작...");
  
  const requestIdA = `test-concurrent-${Date.now()}-A`;
  const requestIdB = `test-concurrent-${Date.now()}-B`;
  
  // 동시 호출
  const [resultA, resultB] = await Promise.all([
    callUpdateTournamentPhase(
      config.adminUidA,
      config.associationId,
      config.tournamentId,
      "ROSTER_LOCKED",
      requestIdA
    ),
    callUpdateTournamentPhase(
      config.adminUidB,
      config.associationId,
      config.tournamentId,
      "ROSTER_LOCKED",
      requestIdB
    ),
  ]);
  
  // 결과 검증
  const tournamentRef = db.doc(
    `associations/${config.associationId}/tournaments/${config.tournamentId}`
  );
  const tournamentSnap = await tournamentRef.get();
  const tournamentData = tournamentSnap.data()!;
  
  const phaseEventsRef = tournamentRef.collection("phaseEvents");
  const phaseEventsSnap = await phaseEventsRef.orderBy("createdAt", "desc").limit(2).get();
  
  const checks = {
    phaseVersion: tournamentData.phaseVersion === 1, // 1회만 증가
    phaseEventsCount: phaseEventsSnap.size === 1, // 1건만 생성
    oneSuccess: (resultA.alreadyInState === false) || (resultB.alreadyInState === false),
    oneAlreadyInState: (resultA.alreadyInState === true) || (resultB.alreadyInState === true),
  };
  
  const passed = Object.values(checks).every(v => v === true);
  
  console.log("✅ [1] 동시 클릭 테스트 결과:", {
    passed,
    checks,
    phaseVersion: tournamentData.phaseVersion,
    phaseEventsCount: phaseEventsSnap.size,
  });
  
  return passed;
}

/**
 * 🔥 2. 연타 테스트 (같은 클라이언트)
 */
export async function testRapidClick(config: TestConfig): Promise<boolean> {
  console.log("🧪 [2] 연타 테스트 시작...");
  
  const requestIds = Array.from({ length: 5 }, (_, i) => 
    `test-rapid-${Date.now()}-${i}`
  );
  
  // 100ms 간격으로 5회 호출
  const results = await Promise.all(
    requestIds.map((requestId, index) => 
      new Promise(resolve => {
        setTimeout(async () => {
          try {
            const result = await callUpdateTournamentPhase(
              config.adminUidA,
              config.associationId,
              config.tournamentId,
              "ROSTER_LOCKED",
              requestId
            );
            resolve({ success: true, result, index });
          } catch (error: any) {
            resolve({ success: false, error: error.message, index });
          }
        }, index * 100);
      })
    )
  );
  
  // 결과 검증
  const tournamentRef = db.doc(
    `associations/${config.associationId}/tournaments/${config.tournamentId}`
  );
  const tournamentSnap = await tournamentRef.get();
  const tournamentData = tournamentSnap.data()!;
  
  const phaseEventsRef = tournamentRef.collection("phaseEvents");
  const phaseEventsSnap = await phaseEventsRef.orderBy("createdAt", "desc").limit(5).get();
  
  const successCount = results.filter((r: any) => r.success && !r.result?.alreadyInState).length;
  const alreadyInStateCount = results.filter((r: any) => r.result?.alreadyInState === true).length;
  
  const checks = {
    phaseVersion: tournamentData.phaseVersion === 1, // 1회만 증가
    phaseEventsCount: phaseEventsSnap.size === 1, // 1건만 생성
    oneSuccess: successCount === 1,
    restAlreadyInState: alreadyInStateCount === 4,
    noServerErrors: results.every((r: any) => r.success || r.error?.includes("INVALID_TRANSITION") || r.error?.includes("alreadyInState")),
  };
  
  const passed = Object.values(checks).every(v => v === true);
  
  console.log("✅ [2] 연타 테스트 결과:", {
    passed,
    checks,
    phaseVersion: tournamentData.phaseVersion,
    phaseEventsCount: phaseEventsSnap.size,
  });
  
  return passed;
}

/**
 * 🔥 3. 재시도 테스트 (네트워크 불안정)
 */
export async function testRetry(config: TestConfig): Promise<boolean> {
  console.log("🧪 [3] 재시도 테스트 시작...");
  
  const requestId = `test-retry-${Date.now()}`;
  
  // 첫 번째 요청
  const result1 = await callUpdateTournamentPhase(
    config.adminUidA,
    config.associationId,
    config.tournamentId,
    "ROSTER_LOCKED",
    requestId
  );
  
  // 같은 requestId로 재요청
  const result2 = await callUpdateTournamentPhase(
    config.adminUidA,
    config.associationId,
    config.tournamentId,
    "ROSTER_LOCKED",
    requestId
  );
  
  // 결과 검증
  const tournamentRef = db.doc(
    `associations/${config.associationId}/tournaments/${config.tournamentId}`
  );
  const tournamentSnap = await tournamentRef.get();
  const tournamentData = tournamentSnap.data()!;
  
  const phaseEventsRef = tournamentRef.collection("phaseEvents");
  const phaseEventsSnap = await phaseEventsRef
    .where("requestId", "==", requestId)
    .get();
  
  const checks = {
    replay: result2.replay === true || JSON.stringify(result1) === JSON.stringify(result2),
    phaseEventsCount: phaseEventsSnap.size === 1, // 1건만 생성
    phaseVersion: tournamentData.phaseVersion === 1, // 추가 변경 없음
  };
  
  const passed = Object.values(checks).every(v => v === true);
  
  console.log("✅ [3] 재시도 테스트 결과:", {
    passed,
    checks,
    result1: result1.replay,
    result2: result2.replay,
  });
  
  return passed;
}

/**
 * 🔥 4. 조건 위반 테스트 (승인 팀 0)
 */
export async function testNoApprovedTeams(config: TestConfig): Promise<boolean> {
  console.log("🧪 [4] 조건 위반 테스트 (승인 팀 0) 시작...");
  
  // 승인 팀을 모두 거절 (테스트용)
  const teamsRef = db.collection(
    `associations/${config.associationId}/tournaments/${config.tournamentId}/teams`
  );
  const approvedTeamsSnap = await teamsRef.where("status", "==", "APPROVED").get();
  
  const batch = db.batch();
  approvedTeamsSnap.docs.forEach(doc => {
    batch.update(doc.ref, { status: "REJECTED" });
  });
  await batch.commit();
  
  // Stats 동기화
  const statsRef = db.doc(
    `associations/${config.associationId}/tournaments/${config.tournamentId}/stats/teams`
  );
  await statsRef.set({ approvedCount: 0 }, { merge: true });
  
  // 잠금 시도
  let error: any = null;
  try {
    await callUpdateTournamentPhase(
      config.adminUidA,
      config.associationId,
      config.tournamentId,
      "ROSTER_LOCKED",
      `test-no-approved-${Date.now()}`
    );
  } catch (e: any) {
    error = e;
  }
  
  const checks = {
    errorThrown: error !== null,
    errorCode: error?.code === "NO_APPROVED_TEAMS" || error?.details?.code === "NO_APPROVED_TEAMS",
    nextActionHint: error?.details?.nextActionHint?.includes("승인") || error?.message?.includes("승인"),
  };
  
  const passed = Object.values(checks).every(v => v === true);
  
  console.log("✅ [4] 조건 위반 테스트 결과:", {
    passed,
    checks,
    errorCode: error?.code || error?.details?.code,
  });
  
  return passed;
}

/**
 * 🔥 5. 권한 테스트
 */
export async function testPermissionDenied(config: TestConfig): Promise<boolean> {
  console.log("🧪 [5] 권한 테스트 시작...");
  
  let error: any = null;
  try {
    await callUpdateTournamentPhase(
      config.nonAdminUid,
      config.associationId,
      config.tournamentId,
      "ROSTER_LOCKED",
      `test-permission-${Date.now()}`
    );
  } catch (e: any) {
    error = e;
  }
  
  const checks = {
    errorThrown: error !== null,
    errorCode: error?.code === "PERMISSION_DENIED" || error?.details?.code === "PERMISSION_DENIED",
  };
  
  const passed = Object.values(checks).every(v => v === true);
  
  console.log("✅ [5] 권한 테스트 결과:", {
    passed,
    checks,
    errorCode: error?.code || error?.details?.code,
  });
  
  return passed;
}

/**
 * 🔥 6. 경합 스트레스 테스트
 */
export async function testConcurrencyStress(config: TestConfig): Promise<boolean> {
  console.log("🧪 [6] 경합 스트레스 테스트 시작...");
  
  const requestIds = Array.from({ length: 20 }, (_, i) => 
    `test-stress-${Date.now()}-${i}`
  );
  
  // 동시에 20개 요청
  const results = await Promise.all(
    requestIds.map(async (requestId) => {
      try {
        const result = await callUpdateTournamentPhase(
          config.adminUidA,
          config.associationId,
          config.tournamentId,
          "ROSTER_LOCKED",
          requestId
        );
        return { success: true, result };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    })
  );
  
  // 결과 검증
  const tournamentRef = db.doc(
    `associations/${config.associationId}/tournaments/${config.tournamentId}`
  );
  const tournamentSnap = await tournamentRef.get();
  const tournamentData = tournamentSnap.data()!;
  
  const phaseEventsRef = tournamentRef.collection("phaseEvents");
  const phaseEventsSnap = await phaseEventsRef.orderBy("createdAt", "desc").limit(20).get();
  
  const checks = {
    phaseVersion: tournamentData.phaseVersion === 1, // 1회만 증가
    phaseEventsCount: phaseEventsSnap.size === 1, // 1건만 생성
    noServerErrors: results.every(r => r.success || r.error?.includes("INVALID_TRANSITION") || r.error?.includes("alreadyInState")),
  };
  
  const passed = Object.values(checks).every(v => v === true);
  
  console.log("✅ [6] 경합 스트레스 테스트 결과:", {
    passed,
    checks,
    phaseVersion: tournamentData.phaseVersion,
    phaseEventsCount: phaseEventsSnap.size,
  });
  
  return passed;
}

/**
 * 🔥 전체 테스트 실행
 */
export async function runAllTests(config: TestConfig): Promise<{
  passed: boolean;
  results: Record<string, boolean>;
}> {
  console.log("🚀 전체 테스트 시작...\n");
  
  const results: Record<string, boolean> = {};
  
  // Phase를 ROSTER_OPEN으로 초기화
  const tournamentRef = db.doc(
    `associations/${config.associationId}/tournaments/${config.tournamentId}`
  );
  await tournamentRef.update({ tournamentPhase: "ROSTER_OPEN" });
  
  results.concurrent = await testConcurrentClick(config);
  results.rapid = await testRapidClick(config);
  results.retry = await testRetry(config);
  results.noApprovedTeams = await testNoApprovedTeams(config);
  results.permission = await testPermissionDenied(config);
  results.stress = await testConcurrencyStress(config);
  
  const allPassed = Object.values(results).every(v => v === true);
  
  console.log("\n🎯 전체 테스트 결과:", {
    passed: allPassed,
    results,
  });
  
  return { passed: allPassed, results };
}
