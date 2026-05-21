/**
 * 🔥 KPI 쿼리 함수 세트 (프로덕션 배포 패키지)
 * 
 * 역할:
 * - 9개 핵심 KPI 계산
 * - 실시간 모니터링
 */

import { db, Timestamp } from "../firebase";

/**
 * 등록→거래 전환율 계산
 * 목표: ≥36%
 */
export async function getRegistrationToTradeConversionRate(
  startDate: Date,
  endDate: Date
): Promise<number> {
  const start = Timestamp.fromDate(startDate);
  const end = Timestamp.fromDate(endDate);

  // 등록 완료 수
  const registrations = await db
    .collection("market")
    .where("createdAt", ">=", start)
    .where("createdAt", "<=", end)
    .get();

  const registrationCount = registrations.size;

  // 거래 생성 수
  const trades = await db
    .collection("trades")
    .where("createdAt", ">=", start)
    .where("createdAt", "<=", end)
    .get();

  const tradeCount = trades.size;

  // 전환율 계산
  const conversionRate = registrationCount > 0 
    ? (tradeCount / registrationCount) * 100 
    : 0;

  return parseFloat(conversionRate.toFixed(2));
}

/**
 * 이미지 포함률 계산
 * 목표: ≥98%
 */
export async function getImageInclusionRate(
  startDate: Date,
  endDate: Date
): Promise<number> {
  const start = Timestamp.fromDate(startDate);
  const end = Timestamp.fromDate(endDate);

  const allRegistrations = await db
    .collection("market")
    .where("createdAt", ">=", start)
    .where("createdAt", "<=", end)
    .get();

  const withImages = allRegistrations.docs.filter(
    (doc) => {
      const data = doc.data();
      return data.images && Array.isArray(data.images) && data.images.length > 0;
    }
  );

  const inclusionRate = allRegistrations.size > 0
    ? (withImages.length / allRegistrations.size) * 100
    : 0;

  return parseFloat(inclusionRate.toFixed(2));
}

/**
 * AI 제목 채택률 계산
 * 목표: ≥75%
 */
export async function getAITitleAdoptionRate(
  startDate: Date,
  endDate: Date
): Promise<number> {
  const start = Timestamp.fromDate(startDate);
  const end = Timestamp.fromDate(endDate);

  const allRegistrations = await db
    .collection("market")
    .where("createdAt", ">=", start)
    .where("createdAt", "<=", end)
    .get();

  const withAITitle = allRegistrations.docs.filter(
    (doc) => {
      const data = doc.data();
      return data.aiTitleUsed === true || data.titleSource === "AI";
    }
  );

  const adoptionRate = allRegistrations.size > 0
    ? (withAITitle.length / allRegistrations.size) * 100
    : 0;

  return parseFloat(adoptionRate.toFixed(2));
}

/**
 * DAU/MAU 계산
 * 목표: ≥40%
 */
export async function getDAUMAURatio(): Promise<number> {
  const now = new Date();
  const todayStart = new Date(now.setHours(0, 0, 0, 0));
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const today = Timestamp.fromDate(todayStart);
  const month = Timestamp.fromDate(monthStart);

  // DAU
  const dau = await db
    .collection("userEvents")
    .where("timestamp", ">=", today)
    .select("userId")
    .get();

  const dauCount = new Set(dau.docs.map(d => d.data().userId)).size;

  // MAU
  const mau = await db
    .collection("userEvents")
    .where("timestamp", ">=", month)
    .select("userId")
    .get();

  const mauCount = new Set(mau.docs.map(d => d.data().userId)).size;

  const ratio = mauCount > 0 ? (dauCount / mauCount) * 100 : 0;

  return parseFloat(ratio.toFixed(2));
}

/**
 * 주간 재방문율 계산
 * 목표: ≥3.5회
 */
export async function getWeeklyReturnRate(): Promise<number> {
  const now = new Date();
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const week = Timestamp.fromDate(weekStart);

  const weeklyUsers = await db
    .collection("userEvents")
    .where("timestamp", ">=", week)
    .select("userId")
    .get();

  const userIds = Array.from(new Set(weeklyUsers.docs.map(d => d.data().userId)));

  const visitCounts = userIds.map(async (userId) => {
    const visits = await db
      .collection("userEvents")
      .where("userId", "==", userId)
      .where("timestamp", ">=", week)
      .where("eventType", "==", "APP_OPEN")
      .get();

    return visits.size;
  });

  const counts = await Promise.all(visitCounts);
  const avgVisits = counts.length > 0
    ? counts.reduce((a, b) => a + b, 0) / counts.length
    : 0;

  return parseFloat(avgVisits.toFixed(2));
}

/**
 * 노쇼율 계산
 * 목표: ≤4%
 */
export async function getNoShowRate(
  startDate: Date,
  endDate: Date
): Promise<number> {
  const start = Timestamp.fromDate(startDate);
  const end = Timestamp.fromDate(endDate);

  const allTrades = await db
    .collection("trades")
    .where("createdAt", ">=", start)
    .where("createdAt", "<=", end)
    .where("type", "==", "DIRECT_TRADE")
    .get();

  const noShowTrades = allTrades.docs.filter(
    (doc) => {
      const data = doc.data();
      return data.noShow === true || data.status === "NO_SHOW";
    }
  );

  const noShowRate = allTrades.size > 0
    ? (noShowTrades.length / allTrades.size) * 100
    : 0;

  return parseFloat(noShowRate.toFixed(2));
}

/**
 * ARPU (Average Revenue Per User) 계산
 * 목표: ≥2,000원
 */
export async function getARPU(
  startDate: Date,
  endDate: Date
): Promise<number> {
  const start = Timestamp.fromDate(startDate);
  const end = Timestamp.fromDate(endDate);

  // 거래 수수료
  const trades = await db
    .collection("trades")
    .where("createdAt", ">=", start)
    .where("createdAt", "<=", end)
    .where("status", "==", "CONFIRMED")
    .get();

  const tradeRevenue = trades.docs.reduce((sum, doc) => {
    const data = doc.data();
    return sum + (data.fee || 0);
  }, 0);

  // 광고 수익
  const ads = await db
    .collection("adClicks")
    .where("timestamp", ">=", start)
    .where("timestamp", "<=", end)
    .get();

  const adRevenue = ads.docs.reduce((sum, doc) => {
    const data = doc.data();
    return sum + (data.cpc || 0);
  }, 0);

  const totalRevenue = tradeRevenue + adRevenue;

  // 활성 사용자 수
  const activeUsers = await db
    .collection("userEvents")
    .where("timestamp", ">=", start)
    .where("timestamp", "<=", end)
    .select("userId")
    .get();

  const userCount = new Set(activeUsers.docs.map(d => d.data().userId)).size;

  const arpu = userCount > 0 ? totalRevenue / userCount : 0;

  return parseFloat(arpu.toFixed(2));
}

/**
 * 광고 CTR (Click-Through Rate) 계산
 * 목표: ≥2.5%
 */
export async function getAdCTR(
  startDate: Date,
  endDate: Date
): Promise<number> {
  const start = Timestamp.fromDate(startDate);
  const end = Timestamp.fromDate(endDate);

  const impressions = await db
    .collection("adImpressions")
    .where("timestamp", ">=", start)
    .where("timestamp", "<=", end)
    .get();

  const impressionCount = impressions.size;

  const clicks = await db
    .collection("adClicks")
    .where("timestamp", ">=", start)
    .where("timestamp", "<=", end)
    .get();

  const clickCount = clicks.size;

  const ctr = impressionCount > 0
    ? (clickCount / impressionCount) * 100
    : 0;

  return parseFloat(ctr.toFixed(2));
}

/**
 * 월 매출 계산
 * 목표: ≥2.3억원
 */
export async function getMonthlyRevenue(
  year: number,
  month: number
): Promise<number> {
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0, 23, 59, 59);

  const start = Timestamp.fromDate(monthStart);
  const end = Timestamp.fromDate(monthEnd);

  // 거래 수수료
  const trades = await db
    .collection("trades")
    .where("createdAt", ">=", start)
    .where("createdAt", "<=", end)
    .where("status", "==", "CONFIRMED")
    .get();

  const tradeRevenue = trades.docs.reduce((sum, doc) => {
    const data = doc.data();
    return sum + (data.fee || 0);
  }, 0);

  // 광고 수익
  const ads = await db
    .collection("adClicks")
    .where("timestamp", ">=", start)
    .where("timestamp", "<=", end)
    .get();

  const adRevenue = ads.docs.reduce((sum, doc) => {
    const data = doc.data();
    return sum + (data.cpc || 0);
  }, 0);

  // 보관/검수 수익
  const services = await db
    .collection("services")
    .where("createdAt", ">=", start)
    .where("createdAt", "<=", end)
    .get();

  const serviceRevenue = services.docs.reduce((sum, doc) => {
    const data = doc.data();
    return sum + (data.fee || 0);
  }, 0);

  const totalRevenue = tradeRevenue + adRevenue + serviceRevenue;

  return totalRevenue;
}

/**
 * 모든 KPI 통합 조회
 */
export interface KPIDashboard {
  conversion: {
    registrationToTrade: number;
    imageInclusion: number;
    aiTitleAdoption: number;
  };
  retention: {
    dauMau: number;
    weeklyReturn: number;
    noShow: number;
  };
  revenue: {
    arpu: number;
    adCTR: number;
    monthlyRevenue: number;
  };
  timestamp: any;
}

export async function getAllKPIs(
  weekStart: Date,
  now: Date,
  monthStart: Date
): Promise<KPIDashboard> {
  const [
    conversionRate,
    imageInclusionRate,
    aiTitleAdoptionRate,
    dauMauRatio,
    weeklyReturnRate,
    noShowRate,
    arpu,
    adCTR,
    monthlyRevenue,
  ] = await Promise.all([
    getRegistrationToTradeConversionRate(weekStart, now),
    getImageInclusionRate(weekStart, now),
    getAITitleAdoptionRate(weekStart, now),
    getDAUMAURatio(),
    getWeeklyReturnRate(),
    getNoShowRate(weekStart, now),
    getARPU(monthStart, now),
    getAdCTR(weekStart, now),
    getMonthlyRevenue(now.getFullYear(), now.getMonth() + 1),
  ]);

  return {
    conversion: {
      registrationToTrade: conversionRate,
      imageInclusion: imageInclusionRate,
      aiTitleAdoption: aiTitleAdoptionRate,
    },
    retention: {
      dauMau: dauMauRatio,
      weeklyReturn: weeklyReturnRate,
      noShow: noShowRate,
    },
    revenue: {
      arpu,
      adCTR,
      monthlyRevenue,
    },
    timestamp: Timestamp.now(),
  };
}
