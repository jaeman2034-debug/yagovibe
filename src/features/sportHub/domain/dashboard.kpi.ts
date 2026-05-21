/**
 * 🔥 Dashboard KPI - KPI 지표 계산
 * 
 * 스토리 CTR, 예약 전환률, 매출
 */

import type { DashboardKPI } from "./dashboard.types";
import type { Story } from "./story.types";
import type { CampaignSendLog } from "./marketing.types";

/**
 * 스토리 CTR 계산
 */
export function calculateStoryCTR(
  impressions: number,
  clicks: number
): number {
  if (impressions === 0) return 0;
  return (clicks / impressions) * 100;
}

/**
 * 예약 전환률 계산
 */
export function calculateBookingCR(
  storyClicks: number,
  bookings: number
): number {
  if (storyClicks === 0) return 0;
  return (bookings / storyClicks) * 100;
}

/**
 * D1 재방문률 계산
 */
export function calculateD1ReturnRate(
  newUsers: number,
  returningUsers: number
): number {
  if (newUsers === 0) return 0;
  return (returningUsers / newUsers) * 100;
}

/**
 * KPI 집계
 */
export function aggregateKPI(
  storyStats: {
    impressions: number;
    clicks: number;
  },
  bookingStats: {
    bookings: number;
    revenueToday: number;
    revenueWeek: number;
  },
  userStats: {
    activeUsers: number;
    newUsers: number;
    returningUsers: number;
  }
): DashboardKPI {
  return {
    storyCTR: calculateStoryCTR(storyStats.impressions, storyStats.clicks),
    bookingCR: calculateBookingCR(storyStats.clicks, bookingStats.bookings),
    revenueToday: bookingStats.revenueToday,
    revenueWeek: bookingStats.revenueWeek,
    activeUsers: userStats.activeUsers,
    newUsers: userStats.newUsers,
    d1ReturnRate: calculateD1ReturnRate(
      userStats.newUsers,
      userStats.returningUsers
    ),
  };
}

/**
 * KPI 트렌드 (전일 대비)
 */
export type KPITrend = {
  storyCTR: { value: number; change: number }; // change: 전일 대비 (%)
  bookingCR: { value: number; change: number };
  revenueToday: { value: number; change: number };
  activeUsers: { value: number; change: number };
};

/**
 * KPI 트렌드 계산
 */
export function calculateKPITrend(
  today: DashboardKPI,
  yesterday: DashboardKPI
): KPITrend {
  const calculateChange = (todayVal: number, yesterdayVal: number): number => {
    if (yesterdayVal === 0) return todayVal > 0 ? 100 : 0;
    return ((todayVal - yesterdayVal) / yesterdayVal) * 100;
  };
  
  return {
    storyCTR: {
      value: today.storyCTR,
      change: calculateChange(today.storyCTR, yesterday.storyCTR),
    },
    bookingCR: {
      value: today.bookingCR,
      change: calculateChange(today.bookingCR, yesterday.bookingCR),
    },
    revenueToday: {
      value: today.revenueToday,
      change: calculateChange(today.revenueToday, yesterday.revenueToday),
    },
    activeUsers: {
      value: today.activeUsers,
      change: calculateChange(today.activeUsers, yesterday.activeUsers),
    },
  };
}
