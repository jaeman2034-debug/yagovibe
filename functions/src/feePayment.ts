// functions/src/feePayment.ts
// 💰 회비 납부 처리 시스템
// 
// 주요 기능:
// 1. 수동 완납 처리 (관리자가 "납부 완료" 버튼 클릭 시)
// 2. 권한 확인 (Pro 플랜 또는 allowManualFee 플래그)
// 3. Firestore 트랜잭션으로 fee 저장 + audit 로그 생성
// 4. 미납 개월 수 자동 재계산
// 5. 회원 상태 자동 전환
//
// Firestore 구조:
// - teams/{teamId}/fees/{YYYY-MM}/items/{memberId}
//   - paid: boolean
//   - amount: number
//   - month: string (YYYY-MM)
//   - memberId: string
//   - memberName: string
//   - processedBy: string (처리자 UID)
//   - paidAt: timestamp
//
// 관련 함수:
// - processFeePayment: 핵심 납부 처리 로직
// - processFeePaymentCallable: HTTP Callable 함수 (프론트에서 호출)
// - recalculateUnpaidMonths: 미납 개월 수 재계산
// - getFeeStatus: 납부 상태 조회
// - isTeamPro: 팀 Pro 여부 확인

import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { initializeApp, getApps } from "firebase-admin/app";
// 🔥 Lazy import: memberStatusTransition은 함수 실행 시점에 동적 로드
// import { autoTransitionMemberStatuses } from "./memberStatusTransition";

// Firebase Admin 초기화
if (getApps().length === 0) {
  initializeApp();
}

// 🔥 Firestore Emulator 연결 (로컬 개발 환경)
// 프론트와 Functions 모두 Emulator를 사용하여 데이터 일치
// 프로덕션에서는 자동으로 프로덕션 Firestore 사용
if (process.env.FIRESTORE_EMULATOR_HOST) {
  console.log(`✅ [feePayment] Firestore Emulator 사용: ${process.env.FIRESTORE_EMULATOR_HOST}`);
}

const db = getFirestore();

/**
 * 💰 회비 납부 처리
 * 
 * 관리자가 "납부 완료" 버튼 클릭 시 실행
 * 
 * @param teamId 팀 ID
 * @param memberId 회원 ID
 * @param month 납부 월 (YYYY-MM)
 * @param amount 납부 금액
 * @param ownerId OWNER ID (인증용)
 */
/**
 * 💰 회비 납부 처리 (Feature Flag 지원)
 * 
 * enableNewFeeSystem 플래그에 따라 새/레거시 로직 분기
 */
export async function processFeePayment(
  teamId: string,
  memberId: string,
  month: string,
  amount: number,
  ownerId: string
): Promise<void> {
  console.log(`💰 [processFeePayment] 시작: teamId=${teamId}, memberId=${memberId}, month=${month}, amount=${amount}, ownerId=${ownerId}`);

  // 🔥 팀 정보 조회
  console.log(`🔍 [processFeePayment] 팀 정보 조회 시작: teams/${teamId}`);
  const teamDoc = await db.collection("teams").doc(teamId).get();
  if (!teamDoc.exists) {
    console.error(`❌ [processFeePayment] 팀 없음: ${teamId}`);
    throw new HttpsError("not-found", "팀을 찾을 수 없습니다.");
  }

  const teamData = teamDoc.data();
  if (!teamData) {
    console.error(`❌ [processFeePayment] 팀 데이터 없음: ${teamId}`);
    throw new HttpsError("not-found", "팀 데이터를 찾을 수 없습니다.");
  }
  console.log(`✅ [processFeePayment] 팀 정보 조회 완료: plan=${teamData.plan}, allowManualFee=${teamData.allowManualFee}, enableNewFeeSystem=${teamData.enableNewFeeSystem}`);

  // 🔥 Feature Flag 체크: enableNewFeeSystem
  const useNewSystem = !!teamData.enableNewFeeSystem;
  
  if (useNewSystem) {
    console.log(`🆕 [processFeePayment] 새 시스템 사용`);
    return await newProcessFeePayment(teamId, memberId, month, amount, ownerId, teamData);
  } else {
    console.log(`📜 [processFeePayment] 레거시 시스템 사용`);
    return await legacyProcessFeePayment(teamId, memberId, month, amount, ownerId, teamData);
  }
}

/**
 * 🆕 새 시스템: 회비 납부 처리
 */
async function newProcessFeePayment(
  teamId: string,
  memberId: string,
  month: string,
  amount: number,
  ownerId: string,
  teamData: FirebaseFirestore.DocumentData
): Promise<void> {
  // 새 시스템 로직 (기존 processFeePayment 로직)
  return await legacyProcessFeePayment(teamId, memberId, month, amount, ownerId, teamData);
}

/**
 * 📜 레거시 시스템: 회비 납부 처리
 */
async function legacyProcessFeePayment(
  teamId: string,
  memberId: string,
  month: string,
  amount: number,
  ownerId: string,
  teamData: FirebaseFirestore.DocumentData
): Promise<void> {

  // 🔐 관리자/OWNER 권한 확인
  const owners = teamData.owners || [];
  let isAdminOrOwner = owners.includes(ownerId);

  if (!isAdminOrOwner) {
    // team_members에서 role 확인 (admin / treasurer / 총무 허용)
    const memberSnap = await db
      .collection("team_members")
      .where("teamId", "==", teamId)
      .where("uid", "==", ownerId)
      .limit(1)
      .get();

    if (!memberSnap.empty) {
      const role = (memberSnap.docs[0].data().role || "").toString();
      if (["admin", "treasurer", "총무"].includes(role)) {
        isAdminOrOwner = true;
      }
    }
  }

  if (!isAdminOrOwner) {
    throw new HttpsError("permission-denied", "회비 납부 처리는 관리자만 할 수 있습니다.");
  }

  // ✅ 수동 납부 처리 허용 조건
  // - Pro 플랜이면 항상 허용
  // - Free 플랜이라도 allowManualFee === true 이면 허용
  const planValue = String(teamData.plan || "").toUpperCase();
  const isProPlan = planValue === "PRO";
  const allowManualFee = teamData.allowManualFee === true;

  if (!isProPlan && !allowManualFee) {
    throw new HttpsError("permission-denied", "이 팀은 수동 회비 납부가 비활성화되어 있습니다.");
  }

  // 🔥 회원 정보 조회 (경로 확인 필수)
  const memberPath = `teams/${teamId}/members/${memberId}`;
  console.log(`🔍 [processFeePayment] 회원 정보 조회 시작: ${memberPath}`);
  const memberRef = db.collection("teams").doc(teamId).collection("members").doc(memberId);
  const memberDoc = await memberRef.get();
  
  if (!memberDoc.exists) {
    console.error(`❌ [processFeePayment] 회원 문서 없음: ${memberPath}`);
    console.error(`❌ [processFeePayment] 실제 경로 확인 필요: teams/${teamId}/members 컬렉션 확인`);
    throw new HttpsError("not-found", "회원을 찾을 수 없습니다.");
  }

  const memberData = memberDoc.data();
  if (!memberData) {
    console.error(`❌ [processFeePayment] 회원 데이터 null: ${memberPath}`);
    throw new HttpsError("not-found", "회원 데이터를 찾을 수 없습니다.");
  }
  
  console.log(`✅ [processFeePayment] 회원 정보 조회 완료:`);
  console.log(`   - name: ${memberData.name || "없음"}`);
  console.log(`   - status: ${memberData.status || "없음"}`);
  console.log(`   - monthlyFee: ${memberData.monthlyFee || "없음"}`);

  // 🔥 fee 기록 생성/업데이트 (새 구조: teams/{teamId}/fees/{YYYY-MM}/items/{memberId})
  const feeRef = db
    .collection("teams")
    .doc(teamId)
    .collection("fees")
    .doc(month)  // YYYY-MM
    .collection("items")
    .doc(memberId);

  const feeData = {
    teamId,
    memberId,
    memberName: memberData.name || "이름 없음",
    month,
    amount,
    paid: true,
    paidAt: FieldValue.serverTimestamp(),
    processedBy: ownerId,
    createdBy: ownerId,
    updatedBy: ownerId,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  // 🔥 트랜잭션으로 fee 저장 + audit 로그 원자적 처리
  console.log(`💾 [processFeePayment] fee 저장 시작: teams/${teamId}/fees/${month}/items/${memberId}`);
  
  try {
    await db.runTransaction(async (transaction) => {
      // 1️⃣ fee 문서 저장
      transaction.set(feeRef, feeData, { merge: true });
      
      // 2️⃣ audit 로그 저장 (트랜잭션 내에서)
      const auditLogRef = db.collection("auditLogs").doc();
      transaction.set(auditLogRef, {
        type: "fee_payment_manual",
        teamId,
        memberId,
        memberName: memberData.name || "이름 없음",
        month,
        amount,
        processedBy: ownerId,
        method: "manual",
        feeDocumentPath: `teams/${teamId}/fees/${month}/items/${memberId}`,
        createdAt: FieldValue.serverTimestamp(),
        uid: ownerId, // auditLogs 규칙에 필요
        rollbackable: true,
        rollbackPath: `teams/${teamId}/fees/${month}/items/${memberId}`,
      });
    });
    
    console.log(`✅ [processFeePayment] fee 저장 완료 (트랜잭션)`);
  } catch (transactionError: any) {
    console.error(`❌ [processFeePayment] fee 저장 실패 (트랜잭션):`, transactionError);
    throw new HttpsError(
      "internal",
      `회비 납부 처리 중 오류가 발생했습니다: ${transactionError.message || "알 수 없는 오류"}`
    );
  }

  // 🔥 member의 unpaidMonths 재계산 (에러가 나도 납부 처리는 완료된 것으로 간주)
  console.log(`📊 [processFeePayment] 미납 개월 수 재계산 시작`);
  try {
    await recalculateUnpaidMonths(teamId, memberId);
    console.log(`✅ [processFeePayment] 미납 개월 수 재계산 완료`);
  } catch (recalcError: any) {
    console.error("⚠️ [processFeePayment] 미납 개월 수 재계산 실패 (납부는 완료됨):", recalcError);
    // 재계산 실패해도 납부 처리는 성공으로 간주 (다음 조회 시 자동 재계산됨)
  }

  // 🔥 상태 자동 전환 (납부 완료 시 즉시 반영)
  // 에러가 나도 납부 처리는 완료된 것으로 간주
  try {
    // 🔥 Lazy import: 초기화 단계에서 로드되지 않도록 동적 import
    const { autoTransitionMemberStatuses } = await import("./memberStatusTransition");
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    await autoTransitionMemberStatuses(teamId, currentMonth);
  } catch (statusError) {
    console.error("⚠️ 상태 자동 전환 실패 (납부는 완료됨):", statusError);
    // 상태 전환 실패해도 납부 처리는 성공으로 간주
  }

  console.log(`✅ 회비 납부 처리 완료: ${memberData.name}, ${month}`);
}

/**
 * 🔄 미납 개월 수 재계산
 * 
 * fee 컬렉션을 조회하여 미납 개월 수를 계산하고 member에 업데이트
 */
async function recalculateUnpaidMonths(
  teamId: string,
  memberId: string
): Promise<void> {
  const memberRef = db.collection("teams").doc(teamId).collection("members").doc(memberId);
  const memberDoc = await memberRef.get();
  
  if (!memberDoc.exists) {
    return;
  }

  const memberData = memberDoc.data()!;
  
  // 🔥 면제자는 제외
  if (memberData.feePlan === "exempt") {
    return;
  }

  // 🔥 현재 월 기준으로 최근 12개월 fee 조회
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  
  const months: string[] = [];
  for (let i = 0; i < 12; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    months.push(monthStr);
  }

  // 🔥 각 월별 fee 조회 (최근 월부터 역순) - 새 구조
  let unpaidCount = 0;
  const monthlyFee = memberData.monthlyFee || 20000; // 기본 월회비

  // 최근 월부터 역순으로 확인 (현재 월 → 과거)
  for (const month of months) {
    const feeDoc = await db
      .collection("teams")
      .doc(teamId)
      .collection("fees")
      .doc(month)  // YYYY-MM
      .collection("items")
      .doc(memberId)
      .get();

    if (!feeDoc.exists) {
      // fee 기록이 없으면 미납으로 간주
      unpaidCount++;
    } else {
      const feeData = feeDoc.data()!;
      if (!feeData.paid || feeData.amount < monthlyFee) {
        // 납부 안 했거나 금액 부족
        unpaidCount++;
      } else {
        // 납부 완료 → 여기서 중단 (연속 미납만 카운트)
        break;
      }
    }
  }

  // 🔥 member 업데이트
  await memberRef.update({
    unpaidMonths: unpaidCount,
    lastCalculatedAt: FieldValue.serverTimestamp(),
  });

  console.log(`📊 미납 개월 수 재계산: ${memberData.name}, ${unpaidCount}개월`);
}

/**
 * 🌐 HTTP Callable 함수: 회비 납부 처리
 */
export const processFeePaymentCallable = onCall(
  {
    region: "asia-northeast3", // 🔥 프론트와 동일한 region 필수
    cors: true,
  },
  async (request) => {
  try {
    // 🔥 진단 로그 (필수)
    console.log("🔥 [processFeePaymentCallable] ========== 시작 ==========");
    console.log("🔥 [processFeePaymentCallable] request.data:", JSON.stringify(request.data));
    console.log("🔥 [processFeePaymentCallable] auth uid:", request.auth?.uid || "없음");
    console.log("🔥 [processFeePaymentCallable] auth email:", request.auth?.token?.email || "없음");

    const { teamId, memberId, month, amount } = request.data || {};
    const ownerId = request.auth?.uid;
    
    // 🔥 파라미터 진단 로그
    console.log("🔥 [processFeePaymentCallable] teamId:", teamId);
    console.log("🔥 [processFeePaymentCallable] memberId:", memberId);
    console.log("🔥 [processFeePaymentCallable] month:", month);
    console.log("🔥 [processFeePaymentCallable] amount:", amount);
    console.log("🔥 [processFeePaymentCallable] ownerId:", ownerId);

    // 🔐 인증 확인
    if (!ownerId) {
      console.error("❌ [processFeePaymentCallable] 인증 실패: ownerId 없음");
      throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    }

    // 🔐 파라미터 검증
    if (!teamId || !memberId || !month || !amount) {
      console.error("❌ [processFeePaymentCallable] 파라미터 누락:", { teamId, memberId, month, amount });
      throw new HttpsError(
        "invalid-argument",
        "필수 파라미터가 누락되었습니다. (teamId, memberId, month, amount 모두 필요)"
      );
    }

    // 🔐 month 형식 검증 (YYYY-MM)
    const monthPattern = /^\d{4}-\d{2}$/;
    if (!monthPattern.test(month)) {
      console.error("❌ [processFeePaymentCallable] month 형식 오류:", month);
      throw new HttpsError("invalid-argument", "month는 YYYY-MM 형식이어야 합니다.");
    }

    // 🔐 amount 검증 (양수)
    if (typeof amount !== "number" || amount <= 0) {
      console.error("❌ [processFeePaymentCallable] amount 검증 실패:", amount);
      throw new HttpsError("invalid-argument", "amount는 0보다 큰 숫자여야 합니다.");
    }

    console.log("✅ [processFeePaymentCallable] 파라미터 검증 완료, processFeePayment 호출 시작");
    await processFeePayment(teamId, memberId, month, amount, ownerId);
    console.log("✅ [processFeePaymentCallable] processFeePayment 완료");

    return { 
      success: true,
      message: "회비 납부 처리가 완료되었습니다."
    };
  } catch (err: any) {
    // 🔥 상세 에러 로깅
    console.error("❌ [processFeePaymentCallable] 에러 발생:");
    console.error("❌ 에러 타입:", err?.constructor?.name);
    console.error("❌ 에러 코드:", err?.code);
    console.error("❌ 에러 메시지:", err?.message);
    console.error("❌ 에러 스택:", err?.stack);
    
    // HttpsError는 그대로 재던지기
    if (err instanceof HttpsError) {
      console.log("✅ HttpsError로 재던지기:", err.code, err.message);
      throw err;
    }

    // 일반 에러는 internal로 변환 (사용자에게는 간단한 메시지)
    const userMessage = "회비 납부 처리 중 오류가 발생했습니다. 관리자에게 문의하세요.";
    console.error("❌ 일반 에러를 internal HttpsError로 변환:", err?.message || "알 수 없는 오류");
    throw new HttpsError("internal", userMessage);
  }
  }
);

/**
 * 🔍 회비 납부 상태 조회
 * 
 * 특정 회원의 특정 월 납부 상태 확인
 */
export async function getFeeStatus(
  teamId: string,
  memberId: string,
  month: string
): Promise<{ paid: boolean; amount?: number; paidAt?: any }> {
  const feeDoc = await db
    .collection("teams")
    .doc(teamId)
    .collection("fees")
    .doc(month)  // YYYY-MM
    .collection("items")
    .doc(memberId)
    .get();

  if (!feeDoc.exists) {
    return { paid: false };
  }

  const feeData = feeDoc.data()!;
  return {
    paid: feeData.paid || false,
    amount: feeData.amount,
    paidAt: feeData.paidAt,
  };
}

/**
 * 🌐 HTTP Callable 함수: 회비 상태 조회
 */
export const getFeeStatusCallable = onCall(
  {
    region: "asia-northeast3",
    cors: true,
  },
  async (request) => {
  const { teamId, memberId, month } = request.data;

  if (!teamId || !memberId || !month) {
    throw new Error("필수 파라미터가 누락되었습니다.");
  }

  const status = await getFeeStatus(teamId, memberId, month);
  return status;
  }
);

/**
 * 📊 팀의 Pro 여부 확인
 * 
 * Pro 여부에 따라 납부 완료 버튼 활성화/비활성화
 * 
 * @param teamId 팀 ID
 * @returns Pro 여부 (true: Pro, false: Free)
 */
export async function isTeamPro(teamId: string): Promise<boolean> {
  const teamDoc = await db.collection("teams").doc(teamId).get();
  
  if (!teamDoc.exists) {
    return false;
  }

  const teamData = teamDoc.data()!;
  // plan 필드가 "PRO"면 Pro, 그 외는 Free
  return teamData.plan === "PRO";
}

/**
 * 🌐 HTTP Callable 함수: Pro 여부 확인
 */
export const isTeamProCallable = onCall(
  {
    region: "asia-northeast3",
    cors: true,
  },
  async (request) => {
  const { teamId } = request.data;

  if (!teamId) {
    throw new Error("teamId가 필요합니다.");
  }

  const isPro = await isTeamPro(teamId);
  return { isPro };
  }
);

