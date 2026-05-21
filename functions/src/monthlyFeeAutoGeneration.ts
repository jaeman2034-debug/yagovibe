// functions/src/monthlyFeeAutoGeneration.ts
// 📅 월별 회비 자동 생성 및 이월 로직
// 
// 두 가지 방식 지원:
// 1. 스케줄 함수: 매월 1일 오전 00:10 자동 실행 (정석)
// 2. Lazy-create: 화면 접속 시 없으면 생성 (보완)

import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { initializeApp, getApps } from "firebase-admin/app";
import {
  assertTeamNotBillingRestricted,
  isTeamBillingRestricted,
  teamEntitledForMonthlyFeeReportPremium,
} from "./lib/teamPlan";

// Firebase Admin 초기화
if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();

/**
 * 📅 월별 회비 자동 생성 (스케줄 함수)
 * 
 * 매월 1일 오전 00:10 (서울 시간) 자동 실행
 */
export const generateMonthlyFees = onSchedule(
  {
    schedule: "10 0 1 * *", // 매월 1일 오전 00:10 (Cron 표현식)
    timeZone: "Asia/Seoul",
    region: "asia-northeast3",
  },
  async (event) => {
    logger.info("📅 [generateMonthlyFees] 월별 회비 자동 생성 시작", { structuredData: true });

    try {
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      
      logger.info(`📅 [generateMonthlyFees] 생성 대상 월: ${currentMonth}`);

      // 모든 팀 조회
      const teamsSnap = await db.collection("teams").get();
      logger.info(`👥 [generateMonthlyFees] 총 ${teamsSnap.size}개 팀 발견`);

      if (teamsSnap.empty) {
        logger.warn("⚠️ [generateMonthlyFees] 팀이 없습니다.");
        return;
      }

      let totalProcessed = 0;
      let totalCreated = 0;

      for (const teamDoc of teamsSnap.docs) {
        const teamId = teamDoc.id;
        const teamData = teamDoc.data();

        try {
          // enableNewFeeSystem 플래그 확인
          if (!teamData.enableNewFeeSystem) {
            logger.info(`⏭️ [generateMonthlyFees] 팀 ${teamId}: 새 시스템 비활성화, 스킵`);
            continue;
          }

          const result = await ensureMonthlyFee(teamId, currentMonth, teamData);
          totalProcessed++;
          totalCreated += result.createdCount;

        } catch (teamError: any) {
          logger.error(`❌ [generateMonthlyFees] 팀 ${teamId} 처리 실패:`, teamError);
        }
      }

      logger.info(`✅ [generateMonthlyFees] 완료: ${totalProcessed}개 팀, ${totalCreated}개 fee 생성`);

    } catch (error: any) {
      logger.error("❌ [generateMonthlyFees] 월별 회비 자동 생성 실패:", error);
      throw error;
    }
  }
);

/**
 * 🔧 Lazy-create: 화면 접속 시 월별 회비 생성
 * 
 * HTTP Callable 함수로 프론트에서 호출
 */
export const ensureMonthlyFeeCallable = onCall(
  {
    region: "asia-northeast3",
    cors: true,
  },
  async (request) => {
    try {
      const { teamId, month } = request.data || {};
      const userId = request.auth?.uid;

      if (!userId) {
        throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
      }

      if (!teamId || !month) {
        throw new HttpsError("invalid-argument", "teamId와 month가 필요합니다.");
      }

      // month 형식 검증 (YYYY-MM)
      if (!/^\d{4}-\d{2}$/.test(month)) {
        throw new HttpsError("invalid-argument", "month는 YYYY-MM 형식이어야 합니다.");
      }

      logger.info(`🔧 [ensureMonthlyFeeCallable] Lazy-create: ${teamId}, ${month}`);

      // 팀 정보 조회
      const teamDoc = await db.collection("teams").doc(teamId).get();
      if (!teamDoc.exists) {
        throw new HttpsError("not-found", "팀을 찾을 수 없습니다.");
      }

      const teamData = teamDoc.data()!;

      assertTeamNotBillingRestricted(teamData as Record<string, unknown>);

      // enableNewFeeSystem 플래그 확인
      if (!teamData.enableNewFeeSystem) {
        return {
          success: false,
          message: "새 회비 시스템이 비활성화되어 있습니다.",
          created: false,
        };
      }

      // Paywall 우회 방지: 월 회비 lazy 생성은 Pro+ 유료 구독(또는 trialing)만
      if (!teamEntitledForMonthlyFeeReportPremium(teamData as Record<string, unknown>)) {
        throw new HttpsError(
          "permission-denied",
          "회비 자동 생성은 Pro 플랜(결제 포함)에서 이용할 수 있습니다."
        );
      }

      const result = await ensureMonthlyFee(teamId, month, teamData);

      return {
        success: true,
        message: "월별 회비 생성 완료",
        created: result.created,
        createdCount: result.createdCount,
      };

    } catch (error: any) {
      logger.error("❌ [ensureMonthlyFeeCallable] Lazy-create 실패:", error);
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError("internal", `월별 회비 생성 실패: ${error.message}`);
    }
  }
);

/**
 * ✅ 월별 회비 생성 (핵심 로직)
 * 
 * @param teamId 팀 ID
 * @param month 월 (YYYY-MM)
 * @param teamData 팀 데이터
 * @returns 생성 결과
 */
export async function ensureMonthlyFee(
  teamId: string,
  month: string,
  teamData: FirebaseFirestore.DocumentData
): Promise<{ created: boolean; createdCount: number }> {
  logger.info(`✅ [ensureMonthlyFee] 시작: ${teamId}, ${month}`);

  if (isTeamBillingRestricted(teamData as Record<string, unknown>)) {
    logger.info(`⏭️ [ensureMonthlyFee] billingRestricted 팀 스킵: ${teamId}`);
    return { created: false, createdCount: 0 };
  }

  // 1️⃣ 월별 fee 헤더 확인/생성
  const feeMonthRef = db
    .collection("teams")
    .doc(teamId)
    .collection("fees")
    .doc(month);

  const feeMonthDoc = await feeMonthRef.get();
  const feeMonthExists = feeMonthDoc.exists;

  if (!feeMonthExists) {
    // 월별 헤더 생성
    const baseAmount = teamData.defaultMonthlyFee || 20000;
    await feeMonthRef.set({
      month,
      teamId,
      baseAmount,
      status: "open",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    logger.info(`✅ [ensureMonthlyFee] 월별 헤더 생성: ${teamId}/${month}`);
  }

  // 2️⃣ 활성 회원 조회
  const membersSnap = await db
    .collection("teams")
    .doc(teamId)
    .collection("members")
    .where("status", "==", "active")
    .get();

  if (membersSnap.empty) {
    logger.info(`⚠️ [ensureMonthlyFee] 활성 회원 없음: ${teamId}`);
    return { created: feeMonthExists, createdCount: 0 };
  }

  logger.info(`👥 [ensureMonthlyFee] 활성 회원: ${membersSnap.size}명`);

  // 3️⃣ 이전 월 계산 (이월 처리용)
  const [year, monthNum] = month.split("-").map(Number);
  const prevMonthDate = new Date(year, monthNum - 2, 1); // -2: 현재 월 - 1
  const prevMonth = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, "0")}`;

  // 4️⃣ 각 회원별 fee 항목 생성
  const batch = db.batch();
  let batchCount = 0;
  let createdCount = 0;
  const MAX_BATCH_SIZE = 500;

  const baseAmount = teamData.defaultMonthlyFee || 20000;

  for (const memberDoc of membersSnap.docs) {
    const memberId = memberDoc.id;
    const memberData = memberDoc.data();

    // 면제자는 제외
    if (memberData.feePlan === "exempt") {
      continue;
    }

    // 회원별 fee 항목 경로
    const feeMemberRef = feeMonthRef.collection("members").doc(memberId);

    // 이미 존재하는지 확인
    const feeMemberExists = await feeMemberRef.get();
    if (feeMemberExists.exists) {
      continue; // 이미 존재하면 스킵
    }

    // 이월 금액 계산
    const carryOverResult = await calcCarryOver(teamId, memberId, prevMonth, memberData);
    const carryOverAmount = carryOverResult.carryOverAmount;
    const dueAmount = baseAmount + carryOverAmount;

    // fee 항목 생성
    const feeMemberData = {
      teamId,
      memberId,
      memberName: memberData.name || "이름 없음",
      month,
      dueAmount,
      baseAmount,
      carryOverAmount,
      paidAmount: 0,
      status: "unpaid" as const,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    batch.set(feeMemberRef, feeMemberData);
    batchCount++;
    createdCount++;

    // 배치 제한 체크
    if (batchCount >= MAX_BATCH_SIZE) {
      await batch.commit();
      logger.info(`✅ [ensureMonthlyFee] 배치 커밋: ${batchCount}개 항목`);
      batchCount = 0;
    }
  }

  // 남은 배치 커밋
  if (batchCount > 0) {
    await batch.commit();
    logger.info(`✅ [ensureMonthlyFee] 최종 배치 커밋: ${batchCount}개 항목`);
  }

  logger.info(`✅ [ensureMonthlyFee] 완료: ${createdCount}개 fee 항목 생성`);

  return {
    created: !feeMonthExists || createdCount > 0,
    createdCount,
  };
}

/**
 * 🔄 이월 금액 계산
 * 
 * @param teamId 팀 ID
 * @param memberId 회원 ID
 * @param prevMonth 이전 월 (YYYY-MM)
 * @param memberData 회원 데이터
 * @returns 이월 금액
 */
export async function calcCarryOver(
  teamId: string,
  memberId: string,
  prevMonth: string,
  memberData: FirebaseFirestore.DocumentData
): Promise<{ carryOverAmount: number; prevMonthStatus: string }> {
  logger.info(`🔄 [calcCarryOver] 시작: ${teamId}/${memberId}, 이전 월: ${prevMonth}`);

  // 이전 월 fee 조회
  const prevMonthFeeRef = db
    .collection("teams")
    .doc(teamId)
    .collection("fees")
    .doc(prevMonth)
    .collection("members")
    .doc(memberId);

  const prevMonthFeeDoc = await prevMonthFeeRef.get();

  if (!prevMonthFeeDoc.exists) {
    // 이전 월 fee가 없으면 이월 없음
    logger.info(`⚠️ [calcCarryOver] 이전 월 fee 없음: ${prevMonth}`);
    return { carryOverAmount: 0, prevMonthStatus: "no_fee" };
  }

  const prevMonthFeeData = prevMonthFeeDoc.data()!;
  const status = prevMonthFeeData.status || "unpaid";
  const dueAmount = prevMonthFeeData.dueAmount || 0;
  const paidAmount = prevMonthFeeData.paidAmount || 0;
  const unpaidAmount = dueAmount - paidAmount;

  if (status === "paid" && unpaidAmount <= 0) {
    // 완납 → 이월 없음
    logger.info(`✅ [calcCarryOver] 이전 월 완납: ${prevMonth}`);
    return { carryOverAmount: 0, prevMonthStatus: "paid" };
  }

  // 미납 또는 부분 납부 → 이월
  const carryOverAmount = Math.max(0, unpaidAmount);
  logger.info(`🔄 [calcCarryOver] 이월 금액: ${carryOverAmount}원 (${prevMonth})`);

  return {
    carryOverAmount,
    prevMonthStatus: status,
  };
}

/**
 * 📦 회원별 fee 항목 일괄 생성 (배치 처리)
 * 
 * @param teamId 팀 ID
 * @param month 월 (YYYY-MM)
 * @param memberIds 회원 ID 목록
 */
export async function createFeeMembersBatch(
  teamId: string,
  month: string,
  memberIds: string[]
): Promise<number> {
  logger.info(`📦 [createFeeMembersBatch] 시작: ${teamId}/${month}, ${memberIds.length}명`);

  const feeMonthRef = db
    .collection("teams")
    .doc(teamId)
    .collection("fees")
    .doc(month);

  // 팀 정보 조회
  const teamDoc = await db.collection("teams").doc(teamId).get();
  const teamData = teamDoc.data()!;
  const baseAmount = teamData.defaultMonthlyFee || 20000;

  // 이전 월 계산
  const [year, monthNum] = month.split("-").map(Number);
  const prevMonthDate = new Date(year, monthNum - 2, 1);
  const prevMonth = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, "0")}`;

  const batch = db.batch();
  let batchCount = 0;
  let createdCount = 0;
  const MAX_BATCH_SIZE = 500;

  for (const memberId of memberIds) {
    // 회원 정보 조회
    const memberDoc = await db
      .collection("teams")
      .doc(teamId)
      .collection("members")
      .doc(memberId)
      .get();

    if (!memberDoc.exists) {
      continue;
    }

    const memberData = memberDoc.data()!;

    // 면제자는 제외
    if (memberData.feePlan === "exempt") {
      continue;
    }

    // 이미 존재하는지 확인
    const feeMemberRef = feeMonthRef.collection("members").doc(memberId);
    const feeMemberExists = await feeMemberRef.get();
    if (feeMemberExists.exists) {
      continue;
    }

    // 이월 금액 계산
    const carryOverResult = await calcCarryOver(teamId, memberId, prevMonth, memberData);
    const carryOverAmount = carryOverResult.carryOverAmount;
    const dueAmount = baseAmount + carryOverAmount;

    // fee 항목 생성
    const feeMemberData = {
      teamId,
      memberId,
      memberName: memberData.name || "이름 없음",
      month,
      dueAmount,
      baseAmount,
      carryOverAmount,
      paidAmount: 0,
      status: "unpaid" as const,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    batch.set(feeMemberRef, feeMemberData);
    batchCount++;
    createdCount++;

    // 배치 제한 체크
    if (batchCount >= MAX_BATCH_SIZE) {
      await batch.commit();
      batchCount = 0;
    }
  }

  // 남은 배치 커밋
  if (batchCount > 0) {
    await batch.commit();
  }

  logger.info(`✅ [createFeeMembersBatch] 완료: ${createdCount}개 fee 항목 생성`);

  return createdCount;
}
