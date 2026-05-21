/**
 * 🔥 Analytics Trend - 트렌드 분석
 * 
 * 전일 대비, 주간 트렌드, 지역 비교
 */

import type { DailyKpi } from "./analytics.types";

/**
 * 트렌드 변화
 */
export type TrendChange = {
  value: number;
  change: number;        // 전일 대비 변화 (%)
  changeAbs: number;     // 절대 변화량
  direction: "up" | "down" | "stable";
};

/**
 * 전일 대비 변화 계산
 */
export function calculateTrend(
  today: DailyKpi,
  yesterday: DailyKpi
): {
  storyCtr: TrendChange;
  bookingCr: TrendChange;
  revenue: TrendChange;
  hubViewUnique: TrendChange;
} {
  const calcChange = (todayVal: number, yesterdayVal: number): TrendChange => {
    const changeAbs = todayVal - yesterdayVal;
    const change =
      yesterdayVal > 0 ? (changeAbs / yesterdayVal) * 100 : (todayVal > 0 ? 100 : 0);
    const direction: "up" | "down" | "stable" =
      Math.abs(change) < 1 ? "stable" : change > 0 ? "up" : "down";

    return {
      value: todayVal,
      change: Math.round(change * 100) / 100,
      changeAbs,
      direction,
    };
  };

  return {
    storyCtr: calcChange(today.storyCtr, yesterday.storyCtr),
    bookingCr: calcChange(today.bookingCr, yesterday.bookingCr),
    revenue: calcChange(today.revenue, yesterday.revenue),
    hubViewUnique: calcChange(today.hubViewUnique, yesterday.hubViewUnique),
  };
}

/**
 * 주간 트렌드 (7일 평균)
 */
export function calculateWeeklyTrend(dailyKpis: DailyKpi[]): {
  avgStoryCtr: number;
  avgBookingCr: number;
  avgRevenue: number;
  totalRevenue: number;
  growthRate: number; // 첫날 대비 마지막날 성장률
} {
  if (dailyKpis.length === 0) {
    return {
      avgStoryCtr: 0,
      avgBookingCr: 0,
      avgRevenue: 0,
      totalRevenue: 0,
      growthRate: 0,
    };
  }

  const avgStoryCtr =
    dailyKpis.reduce((sum, kpi) => sum + kpi.storyCtr, 0) / dailyKpis.length;
  const avgBookingCr =
    dailyKpis.reduce((sum, kpi) => sum + kpi.bookingCr, 0) / dailyKpis.length;
  const avgRevenue =
    dailyKpis.reduce((sum, kpi) => sum + kpi.revenue, 0) / dailyKpis.length;
  const totalRevenue = dailyKpis.reduce((sum, kpi) => sum + kpi.revenue, 0);

  const firstDay = dailyKpis[0];
  const lastDay = dailyKpis[dailyKpis.length - 1];
  const growthRate =
    firstDay.revenue > 0
      ? ((lastDay.revenue - firstDay.revenue) / firstDay.revenue) * 100
      : 0;

  return {
    avgStoryCtr: Math.round(avgStoryCtr * 100) / 100,
    avgBookingCr: Math.round(avgBookingCr * 100) / 100,
    avgRevenue: Math.round(avgRevenue * 100) / 100,
    totalRevenue,
    growthRate: Math.round(growthRate * 100) / 100,
  };
}

/**
 * 지역 비교
 */
export function compareRegions(
  regionKpis: Map<string, DailyKpi>
): Array<{
  region: string;
  storyCtr: number;
  bookingCr: number;
  revenue: number;
  healthScore: number;
}> {
  const result: Array<{
    region: string;
    storyCtr: number;
    bookingCr: number;
    revenue: number;
    healthScore: number;
  }> = [];

  for (const [region, kpi] of regionKpis) {
    // 간단한 건강도 계산 (실제로는 calculateHealthScore 사용)
    const healthScore = Math.min(
      kpi.storyCtr * 0.3 + kpi.bookingCr * 0.3 + (kpi.revenue > 0 ? 40 : 0),
      100
    );

    result.push({
      region,
      storyCtr: kpi.storyCtr,
      bookingCr: kpi.bookingCr,
      revenue: kpi.revenue,
      healthScore: Math.round(healthScore),
    });
  }

  // 건강도 순으로 정렬
  return result.sort((a, b) => b.healthScore - a.healthScore);
}
