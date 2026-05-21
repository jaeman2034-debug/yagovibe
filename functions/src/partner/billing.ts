/**
 * 🔥 파트너 과금 시스템 (프로덕션 배포 패키지)
 * 
 * 역할:
 * - 거래 수수료 (2%)
 * - API 호출 과금
 * - 광고 과금
 */

import { logger } from "firebase-functions/v2";
import { db, FieldValue } from "../firebase";

/**
 * 거래 수수료 계산
 */
export async function chargeTradeFee(
  tradeId: string,
  partnerId: string,
  amount: number
): Promise<void> {
  const feeRate = 0.02; // 2%
  const fee = Math.round(amount * feeRate);

  // 🔥 파트너 수익 증가
  await db.collection("partners").doc(partnerId).update({
    revenue: FieldValue.increment(fee),
  });

  // 🔥 거래 수수료 기록
  await db.collection("partnerFees").add({
    tradeId,
    partnerId,
    amount,
    fee,
    feeRate,
    timestamp: FieldValue.serverTimestamp(),
  });

  logger.info("[chargeTradeFee] 거래 수수료 과금:", {
    tradeId,
    partnerId,
    amount,
    fee,
  });
}

/**
 * 월별 정산 리포트 생성
 */
export async function generateMonthlyReport(
  partnerId: string,
  year: number,
  month: number
): Promise<{
  partnerId: string;
  period: string;
  totalRevenue: number;
  totalTrades: number;
  totalAPICalls: number;
  totalFees: number;
}> {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  // 🔥 거래 수수료 집계
  const feesSnap = await db
    .collection("partnerFees")
    .where("partnerId", "==", partnerId)
    .where("timestamp", ">=", startDate)
    .where("timestamp", "<=", endDate)
    .get();

  const totalFees = feesSnap.docs.reduce(
    (sum, doc) => sum + (doc.data().fee || 0),
    0
  );

  // 🔥 API 호출 집계
  const apiLogsSnap = await db
    .collection("apiLogs")
    .where("partnerId", "==", partnerId)
    .where("timestamp", ">=", startDate)
    .where("timestamp", "<=", endDate)
    .get();

  const totalAPICalls = apiLogsSnap.size;
  const totalAPICost = apiLogsSnap.docs.reduce(
    (sum, doc) => sum + (doc.data().cost || 0),
    0
  );

  // 🔥 파트너 정보 조회
  const partnerSnap = await db.collection("partners").doc(partnerId).get();
  const partner = partnerSnap.data() as any;

  const report = {
    partnerId,
    period: `${year}-${month.toString().padStart(2, "0")}`,
    totalRevenue: partner?.revenue || 0,
    totalTrades: feesSnap.size,
    totalAPICalls,
    totalFees: totalFees - totalAPICost, // 순수익
  };

  // 🔥 리포트 저장
  await db.collection("partnerReports").add({
    ...report,
    createdAt: FieldValue.serverTimestamp(),
  });

  logger.info("[generateMonthlyReport] 월별 리포트 생성:", report);

  return report;
}
