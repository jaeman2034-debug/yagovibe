/**
 * 🔥 updateTournamentPhaseCallable 브라우저 콘솔 테스트 스크립트
 * 
 * 사용 방법:
 * 1. 브라우저 DevTools 콘솔 열기
 * 2. 이 스크립트 전체 복사-붙여넣기
 * 3. 테스트 설정 수정 후 실행
 */

// ============================================
// 🔥 테스트 설정 (수정 필요)
// ============================================
const TEST_CONFIG = {
  associationId: "YOUR_ASSOCIATION_ID",
  tournamentId: "YOUR_TOURNAMENT_ID",
  // 승인 팀 ≥ 1 필요
};

// Firebase Functions 가져오기 (프로젝트 설정에 맞게)
// 프로젝트에서 사용하는 방식:
// import { getFunctions, httpsCallable } from "firebase/functions";
// const functions = getFunctions(undefined, "asia-northeast3");

// ============================================
// 🔥 유틸리티 함수
// ============================================

function generateRequestId(prefix = "test") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

async function callUpdatePhase(phase, requestId) {
  // 프로젝트 설정에 맞게 수정 필요
  const { getFunctions, httpsCallable } = await import("firebase/functions");
  const functions = getFunctions(undefined, "asia-northeast3");
  const updatePhase = httpsCallable(functions, "updateTournamentPhaseCallable");
  
  try {
    const result = await updatePhase({
      associationId: TEST_CONFIG.associationId,
      tournamentId: TEST_CONFIG.tournamentId,
      phase,
      requestId,
    });
    return { success: true, data: result.data };
  } catch (error) {
    return { 
      success: false, 
      error: error.code || error.message,
      details: error.details || error.message,
    };
  }
}

async function checkTournamentState() {
  // Firestore에서 직접 확인 (프로젝트 설정에 맞게)
  const { doc, getDoc, collection, query, getDocs, orderBy, limit } = await import("firebase/firestore");
  const { db } = await import("@/lib/firebase"); // 또는 프로젝트의 firebase.ts 경로
  
  const tournamentRef = doc(db, `associations/${TEST_CONFIG.associationId}/tournaments/${TEST_CONFIG.tournamentId}`);
  const tournamentSnap = await getDoc(tournamentRef);
  const tournamentData = tournamentSnap.data();
  
  const phaseEventsRef = collection(db, `associations/${TEST_CONFIG.associationId}/tournaments/${TEST_CONFIG.tournamentId}/phaseEvents`);
  const phaseEventsQuery = query(phaseEventsRef, orderBy("createdAt", "desc"), limit(10));
  const phaseEventsSnap = await getDocs(phaseEventsQuery);
  
  return {
    phase: tournamentData?.tournamentPhase,
    phaseVersion: tournamentData?.phaseVersion || 0,
    lastRequestId: tournamentData?.lastPhaseUpdateRequestId,
    phaseEventsCount: phaseEventsSnap.size,
    latestEvent: phaseEventsSnap.docs[0]?.data(),
  };
}

// ============================================
// 🔥 1. 동시 클릭 테스트
// ============================================
async function test1_ConcurrentClick() {
  console.log("🧪 [1] 동시 클릭 테스트 시작...");
  
  const requestIdA = generateRequestId("concurrent-A");
  const requestIdB = generateRequestId("concurrent-B");
  
  const [resultA, resultB] = await Promise.all([
    callUpdatePhase("ROSTER_LOCKED", requestIdA),
    callUpdatePhase("ROSTER_LOCKED", requestIdB),
  ]);
  
  const state = await checkTournamentState();
  
  const checks = {
    phaseVersion: state.phaseVersion === 1,
    phaseEventsCount: state.phaseEventsCount === 1,
    oneSuccess: resultA.data?.alreadyInState === false || resultB.data?.alreadyInState === false,
    oneAlreadyInState: resultA.data?.alreadyInState === true || resultB.data?.alreadyInState === true,
  };
  
  const passed = Object.values(checks).every(v => v === true);
  
  console.log("✅ [1] 결과:", { passed, checks, state, resultA, resultB });
  return passed;
}

// ============================================
// 🔥 2. 연타 테스트
// ============================================
async function test2_RapidClick() {
  console.log("🧪 [2] 연타 테스트 시작...");
  
  const requestIds = Array.from({ length: 5 }, (_, i) => generateRequestId(`rapid-${i}`));
  
  const results = await Promise.all(
    requestIds.map((requestId, index) => 
      new Promise(resolve => {
        setTimeout(async () => {
          const result = await callUpdatePhase("ROSTER_LOCKED", requestId);
          resolve({ ...result, index });
        }, index * 100);
      })
    )
  );
  
  const state = await checkTournamentState();
  
  const successCount = results.filter(r => r.success && !r.data?.alreadyInState).length;
  const alreadyInStateCount = results.filter(r => r.data?.alreadyInState === true).length;
  
  const checks = {
    phaseVersion: state.phaseVersion === 1,
    phaseEventsCount: state.phaseEventsCount === 1,
    oneSuccess: successCount === 1,
    restAlreadyInState: alreadyInStateCount === 4,
  };
  
  const passed = Object.values(checks).every(v => v === true);
  
  console.log("✅ [2] 결과:", { passed, checks, state, results });
  return passed;
}

// ============================================
// 🔥 3. 재시도 테스트
// ============================================
async function test3_Retry() {
  console.log("🧪 [3] 재시도 테스트 시작...");
  
  const requestId = generateRequestId("retry");
  
  const result1 = await callUpdatePhase("ROSTER_LOCKED", requestId);
  const result2 = await callUpdatePhase("ROSTER_LOCKED", requestId);
  
  const state = await checkTournamentState();
  
  const checks = {
    replay: result2.data?.replay === true || JSON.stringify(result1) === JSON.stringify(result2),
    phaseEventsCount: state.phaseEventsCount === 1,
    phaseVersion: state.phaseVersion === 1,
  };
  
  const passed = Object.values(checks).every(v => v === true);
  
  console.log("✅ [3] 결과:", { passed, checks, state, result1, result2 });
  return passed;
}

// ============================================
// 🔥 4. 조건 위반 테스트 (승인 팀 0)
// ============================================
async function test4_NoApprovedTeams() {
  console.log("🧪 [4] 조건 위반 테스트 (승인 팀 0) 시작...");
  console.warn("⚠️ 이 테스트는 승인 팀을 0으로 만든 후 실행해야 합니다.");
  
  const result = await callUpdatePhase("ROSTER_LOCKED", generateRequestId("no-approved"));
  
  const checks = {
    errorThrown: !result.success,
    errorCode: result.error === "NO_APPROVED_TEAMS" || result.details?.code === "NO_APPROVED_TEAMS",
    nextActionHint: result.details?.nextActionHint?.includes("승인") || result.details?.message?.includes("승인"),
  };
  
  const passed = Object.values(checks).every(v => v === true);
  
  console.log("✅ [4] 결과:", { passed, checks, result });
  return passed;
}

// ============================================
// 🔥 5. 권한 테스트
// ============================================
async function test5_PermissionDenied() {
  console.log("🧪 [5] 권한 테스트 시작...");
  console.warn("⚠️ 이 테스트는 비관리자 계정으로 로그인한 후 실행해야 합니다.");
  
  const result = await callUpdatePhase("ROSTER_LOCKED", generateRequestId("permission"));
  
  const checks = {
    errorThrown: !result.success,
    errorCode: result.error === "PERMISSION_DENIED" || result.details?.code === "PERMISSION_DENIED",
  };
  
  const passed = Object.values(checks).every(v => v === true);
  
  console.log("✅ [5] 결과:", { passed, checks, result });
  return passed;
}

// ============================================
// 🔥 6. 경합 스트레스 테스트
// ============================================
async function test6_ConcurrencyStress() {
  console.log("🧪 [6] 경합 스트레스 테스트 시작...");
  
  const requestIds = Array.from({ length: 20 }, (_, i) => generateRequestId(`stress-${i}`));
  
  const results = await Promise.all(
    requestIds.map(requestId => callUpdatePhase("ROSTER_LOCKED", requestId))
  );
  
  const state = await checkTournamentState();
  
  const checks = {
    phaseVersion: state.phaseVersion === 1,
    phaseEventsCount: state.phaseEventsCount === 1,
    noServerErrors: results.every(r => r.success || r.error?.includes("INVALID_TRANSITION") || r.error?.includes("alreadyInState")),
  };
  
  const passed = Object.values(checks).every(v => v === true);
  
  console.log("✅ [6] 결과:", { passed, checks, state });
  return passed;
}

// ============================================
// 🔥 전체 테스트 실행
// ============================================
async function runAllTests() {
  console.log("🚀 전체 테스트 시작...\n");
  
  // Phase를 ROSTER_OPEN으로 초기화 (필요 시)
  // await callUpdatePhase("ROSTER_OPEN", generateRequestId("init"));
  
  const results = {
    test1: await test1_ConcurrentClick(),
    test2: await test2_RapidClick(),
    test3: await test3_Retry(),
    // test4: await test4_NoApprovedTeams(), // 수동 설정 필요
    // test5: await test5_PermissionDenied(), // 수동 설정 필요
    test6: await test6_ConcurrencyStress(),
  };
  
  const allPassed = Object.values(results).every(v => v === true);
  
  console.log("\n🎯 전체 테스트 결과:", {
    passed: allPassed,
    results,
  });
  
  return { passed: allPassed, results };
}

// ============================================
// 🔥 실행
// ============================================
// 개별 테스트 실행:
// await test1_ConcurrentClick();
// await test2_RapidClick();
// await test3_Retry();
// await test6_ConcurrencyStress();

// 전체 테스트 실행:
// await runAllTests();

console.log("✅ 테스트 스크립트 로드 완료");
console.log("사용법: await runAllTests() 또는 개별 테스트 함수 호출");
