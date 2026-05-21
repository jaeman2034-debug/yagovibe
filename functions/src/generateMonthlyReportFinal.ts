// functions/src/generateMonthlyReportFinal.ts
// 📊 월간 운영 리포트 자동 생성 (최종 완성본)
//
// 목적:
// - 회장/총무가 월 1회 숫자만 보고 판단
// - 분쟁 시 "데이터로 종료"
// - PDF / CSV / 대시보드 동일 원천 데이터
//
// Firestore 구조:
// teams/{teamId}/monthlyReports/{YYYY-MM}

import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import { initializeApp, getApps } from "firebase-admin/app";
import { ym, prevYm } from "./feeSystemCoreFinal";
import { requireAdmin } from "./utils/requireAdmin";
import {
  assertTeamEntitledForMonthlyFeeReportPremium,
  PLAN_NOT_ENTITLED_MONTHLY_REPORT,
  teamEntitledForMonthlyFeeReportPremium,
} from "./lib/teamPlan";

// Firebase Admin 초기화 (지연 초기화)
function getDb() {
  if (getApps().length === 0) {
    initializeApp();
  }
  return getFirestore();
}

/**
 * 📊 월간 리포트 데이터 구조
 */
export interface MonthlyReport {
  month: string; // "2025-12"
  memberStats: {
    total: number;
    active: number;
    paused: number;
    deleted: number;
  };
  feeStats: {
    baseAmount: number;
    targetCount: number;
    paidCount: number;
    unpaidCount: number;
    expectedAmount: number;
    paidAmount: number;
    unpaidAmount: number;
  };
  alerts: Array<{
    type: string;
    count: number;
    memberIds?: string[];
  }>;
  generatedAt: any; // serverTimestamp
  generatedBy: string; // "SYSTEM" | uid
}

/**
 * 📊 알림 타입 정의
 */
export const ALERT_TYPES = {
  UNPAID_2_MONTHS: "UNPAID_2_MONTHS", // 2개월 연속 미납
  PAUSED_OVER_3_MONTHS: "PAUSED_OVER_3_MONTHS", // 3개월 이상 휴원
  ANNUAL_FEE_UNPAID: "ANNUAL_FEE_UNPAID", // 연회비 미납
} as const;

/**
 * 🔍 알림 수집 함수
 */
async function collectAlerts(
  teamId: string,
  month: string,
  feeStats: MonthlyReport["feeStats"]
): Promise<MonthlyReport["alerts"]> {
  const alerts: MonthlyReport["alerts"] = [];
  const db = getDb();
  const teamRef = db.doc(`teams/${teamId}`);
  const prevMonth = prevYm(month);

  // 1️⃣ 2개월 연속 미납 체크
  const unpaid2Months: string[] = [];
  const currentPaymentsSnap = await teamRef
    .collection("fees")
    .doc(month)
    .collection("payments")
    .where("status", "!=", "paid")
    .get();

  for (const paymentDoc of currentPaymentsSnap.docs) {
    const memberId = paymentDoc.id;
    const prevPaymentRef = teamRef
      .collection("fees")
      .doc(prevMonth)
      .collection("payments")
      .doc(memberId);
    const prevPaymentSnap = await prevPaymentRef.get();

    if (prevPaymentSnap.exists) {
      const prevStatus = prevPaymentSnap.data()?.status || "unpaid";
      if (prevStatus !== "paid") {
        unpaid2Months.push(memberId);
      }
    }
  }

  if (unpaid2Months.length > 0) {
    alerts.push({
      type: ALERT_TYPES.UNPAID_2_MONTHS,
      count: unpaid2Months.length,
      memberIds: unpaid2Months,
    });
  }

  // 2️⃣ 장기 휴원 체크 (3개월 이상)
  const pausedOver3Months: string[] = [];
  const membersSnap = await teamRef
    .collection("members")
    .where("status", "==", "paused")
    .get();

  for (const memberDoc of membersSnap.docs) {
    const memberData = memberDoc.data();
    const pausedAt = memberData.pausedAt?.toDate();
    
    if (pausedAt) {
      const monthsPaused = Math.floor(
        (new Date().getTime() - pausedAt.getTime()) / (1000 * 60 * 60 * 24 * 30)
      );
      
      if (monthsPaused >= 3) {
        pausedOver3Months.push(memberDoc.id);
      }
    }
  }

  if (pausedOver3Months.length > 0) {
    alerts.push({
      type: ALERT_TYPES.PAUSED_OVER_3_MONTHS,
      count: pausedOver3Months.length,
      memberIds: pausedOver3Months,
    });
  }

  // 3️⃣ 연회비 미납 체크 (2월 회비 미납)
  if (month.endsWith("-02")) {
    const annualFeeUnpaid: string[] = [];
    const febPaymentsSnap = await teamRef
      .collection("fees")
      .doc(month)
      .collection("payments")
      .where("status", "!=", "paid")
      .get();

    for (const paymentDoc of febPaymentsSnap.docs) {
      annualFeeUnpaid.push(paymentDoc.id);
    }

    if (annualFeeUnpaid.length > 0) {
      alerts.push({
        type: ALERT_TYPES.ANNUAL_FEE_UNPAID,
        count: annualFeeUnpaid.length,
        memberIds: annualFeeUnpaid,
      });
    }
  }

  return alerts;
}

/**
 * 📊 월간 리포트 생성 함수
 */
export async function generateMonthlyReport(
  teamId: string,
  month: string,
  generatedBy: string = "SYSTEM"
): Promise<MonthlyReport> {
  const db = getDb();
  const teamRef = db.doc(`teams/${teamId}`);
  const teamSnap = await teamRef.get();

  if (!teamSnap.exists) {
    throw new Error("TEAM_NOT_FOUND");
  }

  const team = teamSnap.data()!;
  assertTeamEntitledForMonthlyFeeReportPremium(team);

  // enableNewFeeSystem 체크
  if (team.enableNewFeeSystem !== true) {
    throw new Error("NEW_FEE_SYSTEM_NOT_ENABLED");
  }

  // 1️⃣ 회원 통계 수집
  const membersSnap = await teamRef.collection("members").get();
  const memberStats = {
    total: membersSnap.size,
    active: 0,
    paused: 0,
    deleted: 0,
  };

  membersSnap.forEach((doc) => {
    const status = doc.data().status || "active";
    if (status === "active") memberStats.active++;
    else if (status === "paused") memberStats.paused++;
    else if (status === "deleted") memberStats.deleted++;
  });

  // 2️⃣ 회비 통계 수집
  const feeMonthRef = teamRef.collection("fees").doc(month);
  const feeMonthSnap = await feeMonthRef.get();

  if (!feeMonthSnap.exists) {
    throw new Error("FEE_MONTH_NOT_FOUND");
  }

  const feeMonthData = feeMonthSnap.data()!;
  const baseAmount = Number(feeMonthData.baseAmount ?? 20000);

  const paymentsSnap = await feeMonthRef.collection("payments").get();
  let paidCount = 0;
  let unpaidCount = 0;
  let paidAmount = 0;
  let unpaidAmount = 0;

  paymentsSnap.forEach((doc) => {
    const payment = doc.data();
    const status = payment.status || "unpaid";
    const dueAmount = Number(payment.dueAmount ?? payment.amount ?? 0);
    const paid = Number(payment.paidAmount ?? 0);

    if (status === "paid" && paid >= dueAmount) {
      paidCount++;
      paidAmount += paid;
    } else {
      unpaidCount++;
      unpaidAmount += Math.max(0, dueAmount - paid);
    }
  });

  const targetCount = memberStats.active;
  const expectedAmount = baseAmount * targetCount;

  const feeStats = {
    baseAmount,
    targetCount,
    paidCount,
    unpaidCount,
    expectedAmount,
    paidAmount,
    unpaidAmount,
  };

  // 3️⃣ 알림 수집
  const alerts = await collectAlerts(teamId, month, feeStats);

  // 4️⃣ 리포트 문서 생성
  const report: MonthlyReport = {
    month,
    memberStats,
    feeStats,
    alerts,
    generatedAt: FieldValue.serverTimestamp(),
    generatedBy,
  };

  const reportRef = teamRef.collection("monthlyReports").doc(month);
  await reportRef.set(report);

  logger.info(`✅ 월간 리포트 생성 완료: ${teamId}/${month}`, {
    memberStats,
    feeStats,
    alertsCount: alerts.length,
  });

  return report;
}

/**
 * 📅 월간 리포트 자동 생성 스케줄 함수
 */
export const generateMonthlyReportsJob = onSchedule(
  {
    schedule: "5 0 1 * *", // 매월 1일 오전 00:05 (KST)
    timeZone: "Asia/Seoul",
    region: "asia-northeast3",
  },
  async () => {
    logger.info("📊 [generateMonthlyReportsJob] 월간 리포트 자동 생성 시작", {
      structuredData: true,
    });

    try {
      const month = ym(new Date());
      logger.info(`📅 [generateMonthlyReportsJob] 생성 대상 월: ${month}`);

      const db = getDb();
      const teamsSnap = await db.collection("teams").get();
      logger.info(`👥 [generateMonthlyReportsJob] 총 ${teamsSnap.size}개 팀 발견`);

      if (teamsSnap.empty) {
        logger.warn("⚠️ [generateMonthlyReportsJob] 팀이 없습니다.");
        return;
      }

      let totalProcessed = 0;
      let totalSkipped = 0;
      let totalErrors = 0;

      for (const t of teamsSnap.docs) {
        const teamId = t.id;
        const team = t.data();

        try {
          // enableNewFeeSystem=true인 팀만 처리
          if (team.enableNewFeeSystem !== true) {
            totalSkipped++;
            continue;
          }

          await generateMonthlyReport(teamId, month, "SYSTEM");
          totalProcessed++;
          logger.info(`✅ [generateMonthlyReportsJob] 팀 ${teamId} 처리 완료`);

        } catch (teamError: any) {
          if (teamError?.message === PLAN_NOT_ENTITLED_MONTHLY_REPORT) {
            totalSkipped++;
            continue;
          }
          totalErrors++;
          logger.error(
            `❌ [generateMonthlyReportsJob] 팀 ${teamId} 처리 실패:`,
            teamError
          );
          // 개별 팀 실패해도 계속 진행
        }
      }

      logger.info(`✅ [generateMonthlyReportsJob] 완료:`);
      logger.info(`   - 처리된 팀: ${totalProcessed}개`);
      logger.info(`   - 스킵된 팀: ${totalSkipped}개`);
      logger.info(`   - 에러: ${totalErrors}개`);

    } catch (error: any) {
      logger.error("❌ [generateMonthlyReportsJob] 월간 리포트 자동 생성 실패:", error);
      throw error;
    }
  }
);

/**
 * 🔧 수동 생성 Callable 함수
 */
export const generateMonthlyReportCallable = onCall(
  {
    region: "asia-northeast3",
    cors: true,
  },
  async (req) => {
    const { teamId, month } = req.data ?? {};
    const uid = req.auth?.uid;

    if (!uid) {
      throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    }

    if (!teamId || !month) {
      throw new HttpsError("invalid-argument", "teamId와 month가 필요합니다.");
    }

    // month 형식 검증 (YYYY-MM)
    if (!/^\d{4}-\d{2}$/.test(month)) {
      throw new HttpsError("invalid-argument", "month는 YYYY-MM 형식이어야 합니다.");
    }

    // 팀 정보 조회
    const db = getDb();
    const teamRef = db.doc(`teams/${teamId}`);
    const teamSnap = await teamRef.get();

    if (!teamSnap.exists) {
      throw new HttpsError("not-found", "팀을 찾을 수 없습니다.");
    }

    const team = teamSnap.data()!;

    // 🔐 관리자 권한 확인 (공통 가드)
    await requireAdmin(teamId, uid);

    if (!teamEntitledForMonthlyFeeReportPremium(team)) {
      throw new HttpsError(
        "permission-denied",
        "월간 운영 리포트는 Pro 플랜(결제 포함)에서 이용할 수 있습니다."
      );
    }

    // enableNewFeeSystem 플래그 확인
    if (team.enableNewFeeSystem !== true) {
      throw new HttpsError(
        "failed-precondition",
        "새 회비 시스템이 비활성화되어 있습니다."
      );
    }

    // 월간 리포트 생성
    const report = await generateMonthlyReport(teamId, month, uid);

    return {
      success: true,
      message: "월간 리포트 생성 완료",
      report,
    };
  }
);

