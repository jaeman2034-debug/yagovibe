/**
 * 🔥 Insights 생성 엔진
 * 
 * 역할:
 * - 플랫폼 통계 기반 인사이트 자동 생성
 * - Growth, Trend, Milestone, Alert 인사이트 계산
 * - platform_insights/latest 문서 업데이트
 */

import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { admin } from "../firebaseAdmin";

const db = getFirestore();

// Helper functions to get stats (inline to avoid circular dependency)
async function getPlatformStats(): Promise<any> {
  const statsRef = db.doc("platform_stats/global");
  const statsSnap = await statsRef.get();
  return statsSnap.exists ? statsSnap.data() : null;
}

async function getMonthlyStats(months: number = 12): Promise<any[]> {
  const monthlyRef = db.collection("platform_monthly_stats");
  const monthlyQuery = monthlyRef
    .orderBy("month", "desc")
    .limit(months);
  const monthlySnap = await monthlyQuery.get();
  const stats: any[] = [];
  monthlySnap.forEach((doc) => {
    stats.push(doc.data());
  });
  return stats.reverse(); // 오름차순
}

async function getWeeklyStats(weeks: number = 12): Promise<any[]> {
  const weeklyRef = db.collection("platform_weekly_stats");
  const weeklyQuery = weeklyRef
    .orderBy("week", "desc")
    .limit(weeks);
  const weeklySnap = await weeklyQuery.get();
  const stats: any[] = [];
  weeklySnap.forEach((doc) => {
    stats.push(doc.data());
  });
  return stats.reverse(); // 오름차순
}

export type InsightType = "growth" | "trend" | "milestone" | "alert";
export type InsightPriority = "high" | "normal" | "low";

export interface Insight {
  type: InsightType;
  priority: InsightPriority;
  metric: string;
  message: string;
  value?: number;
  period?: "weekly" | "monthly";
  createdAt: any;
}

export interface PlatformInsights {
  insights: Insight[];
  generatedAt: any;
}

/**
 * Growth 인사이트 계산
 */
function calculateGrowthInsights(
  currentWeekly: any,
  previousWeekly: any,
  currentMonthly: any,
  previousMonthly: any
): Insight[] {
  const insights: Insight[] = [];

  // 주별 경기 수 증가
  if (previousWeekly && previousWeekly.matches > 0) {
    const growth = Math.round(
      ((currentWeekly.matches - previousWeekly.matches) /
        previousWeekly.matches) *
        100
    );

    if (Math.abs(growth) >= 15) {
      insights.push({
        type: growth > 0 ? "growth" : "alert",
        priority: Math.abs(growth) >= 30 ? "high" : "normal",
        metric: "matches",
        message:
          growth > 0
            ? `경기 수가 이번 주 ${growth}% 증가했습니다`
            : `경기 수가 이번 주 ${Math.abs(growth)}% 감소했습니다`,
        value: growth,
        period: "weekly",
        createdAt: admin.firestore.Timestamp.now(),
      });
    }
  }

  // 월별 신규 선수 증가
  if (previousMonthly && previousMonthly.newPlayers > 0) {
    const growth = Math.round(
      ((currentMonthly.newPlayers - previousMonthly.newPlayers) /
        previousMonthly.newPlayers) *
        100
    );

    if (growth >= 10) {
      insights.push({
        type: "growth",
        priority: growth >= 25 ? "high" : "normal",
        metric: "newPlayers",
        message: `신규 선수가 이번 달 ${growth}% 증가했습니다`,
        value: growth,
        period: "monthly",
        createdAt: admin.firestore.Timestamp.now(),
      });
    }
  }

  return insights;
}

/**
 * Trend 인사이트 계산
 */
function calculateTrendInsights(
  weeklyStats: any[],
  monthlyStats: any[]
): Insight[] {
  const insights: Insight[] = [];

  // 최근 4주 vs 이전 4주 경기 수 비교
  if (weeklyStats.length >= 8) {
    const recent4Weeks = weeklyStats.slice(-4);
    const previous4Weeks = weeklyStats.slice(-8, -4);

    const recentAvg =
      recent4Weeks.reduce((sum, w) => sum + (w.matches || 0), 0) / 4;
    const previousAvg =
      previous4Weeks.reduce((sum, w) => sum + (w.matches || 0), 0) / 4;

    if (previousAvg > 0) {
      const change = ((recentAvg - previousAvg) / previousAvg) * 100;

      if (Math.abs(change) >= 10) {
        insights.push({
          type: change > 0 ? "trend" : "alert",
          priority: Math.abs(change) >= 20 ? "high" : "normal",
          metric: "matches",
          message:
            change > 0
              ? `최근 4주 평균 경기 수가 이전 4주 대비 ${Math.round(change)}% 증가했습니다`
              : `최근 4주 평균 경기 수가 이전 4주 대비 ${Math.round(Math.abs(change))}% 감소했습니다`,
          value: Math.round(change),
          period: "weekly",
          createdAt: admin.firestore.Timestamp.now(),
        });
      }
    }
  }

  // 경기당 평균 득점 트렌드
  if (weeklyStats.length >= 8) {
    const recent4Weeks = weeklyStats.slice(-4);
    const previous4Weeks = weeklyStats.slice(-8, -4);

    const recentGoals = recent4Weeks.reduce((sum, w) => sum + (w.goals || 0), 0);
    const recentMatches = recent4Weeks.reduce(
      (sum, w) => sum + (w.matches || 0),
      0
    );
    const previousGoals = previous4Weeks.reduce(
      (sum, w) => sum + (w.goals || 0),
      0
    );
    const previousMatches = previous4Weeks.reduce(
      (sum, w) => sum + (w.matches || 0),
      0
    );

    if (recentMatches > 0 && previousMatches > 0) {
      const recentAvg = recentGoals / recentMatches;
      const previousAvg = previousGoals / previousMatches;
      const change = ((recentAvg - previousAvg) / previousAvg) * 100;

      if (Math.abs(change) >= 5) {
        insights.push({
          type: change > 0 ? "trend" : "alert",
          priority: "normal",
          metric: "goals_per_match",
          message:
            change > 0
              ? `경기당 평균 득점이 ${recentAvg.toFixed(1)}골로 상승했습니다`
              : `경기당 평균 득점이 ${recentAvg.toFixed(1)}골로 하락했습니다`,
          value: Math.round(change),
          period: "weekly",
          createdAt: admin.firestore.Timestamp.now(),
        });
      }
    }
  }

  return insights;
}

/**
 * Milestone 인사이트 계산
 */
function calculateMilestoneInsights(
  currentStats: any,
  previousStats: any
): Insight[] {
  const insights: Insight[] = [];

  // 플랫폼 규모 이정표
  const milestones = [
    { threshold: 10000, metric: "totalPlayers", label: "10,000명" },
    { threshold: 5000, metric: "totalPlayers", label: "5,000명" },
    { threshold: 1000, metric: "totalPlayers", label: "1,000명" },
    { threshold: 500, metric: "totalTeams", label: "500팀" },
    { threshold: 100, metric: "totalTeams", label: "100팀" },
    { threshold: 1000, metric: "totalMatches", label: "1,000경기" },
    { threshold: 500, metric: "totalMatches", label: "500경기" },
    { threshold: 100, metric: "totalEvents", label: "100대회" },
    { threshold: 50, metric: "totalEvents", label: "50대회" },
  ];

  for (const milestone of milestones) {
    const currentValue = currentStats[milestone.metric] || 0;
    const previousValue = previousStats?.[milestone.metric] || 0;

    if (currentValue >= milestone.threshold && previousValue < milestone.threshold) {
      insights.push({
        type: "milestone",
        priority: milestone.threshold >= 5000 ? "high" : "normal",
        metric: milestone.metric,
        message: `플랫폼이 ${milestone.label}을(를) 달성했습니다!`,
        value: currentValue,
        createdAt: admin.firestore.Timestamp.now(),
      });
    }
  }

  return insights;
}

/**
 * Alert 인사이트 계산
 */
function calculateAlertInsights(
  currentWeekly: any,
  previousWeekly: any,
  currentMonthly: any,
  previousMonthly: any
): Insight[] {
  const insights: Insight[] = [];

  // 이번 달 이벤트 생성 없음
  if (currentMonthly && currentMonthly.events === 0 && previousMonthly && previousMonthly.events > 0) {
    insights.push({
      type: "alert",
      priority: "high",
      metric: "events",
      message: "이번 달 새 이벤트가 생성되지 않았습니다",
      period: "monthly",
      createdAt: admin.firestore.Timestamp.now(),
    });
  }

  // 이번 주 경기 수 급감
  if (previousWeekly && previousWeekly.matches > 0) {
    const drop = ((previousWeekly.matches - currentWeekly.matches) / previousWeekly.matches) * 100;
    if (drop >= 50) {
      insights.push({
        type: "alert",
        priority: "high",
        metric: "matches",
        message: `이번 주 경기 수가 지난주 대비 ${Math.round(drop)}% 급감했습니다`,
        value: Math.round(drop),
        period: "weekly",
        createdAt: admin.firestore.Timestamp.now(),
      });
    }
  }

  return insights;
}

/**
 * Insights 생성
 */
export async function generateInsights(): Promise<void> {
  try {
    logger.info("🔄 [generateInsights] 인사이트 생성 시작");

    // 현재 통계 조회
    const [currentStats, weeklyStats, monthlyStats] = await Promise.all([
      getPlatformStats(),
      getWeeklyStats(12),
      getMonthlyStats(12),
    ]);

    if (!currentStats || weeklyStats.length < 2 || monthlyStats.length < 2) {
      logger.warn("⚠️ [generateInsights] 데이터 부족, 스킵");
      return;
    }

    // 이전 통계 조회 (비교용)
    const previousStatsRef = db.doc("platform_stats/previous");
    const previousStatsSnap = await previousStatsRef.get();
    const previousStats = previousStatsSnap.exists
      ? previousStatsSnap.data()
      : null;

    // 현재 주/월
    const currentWeekly = weeklyStats[weeklyStats.length - 1];
    const previousWeekly = weeklyStats[weeklyStats.length - 2];
    const currentMonthly = monthlyStats[monthlyStats.length - 1];
    const previousMonthly = monthlyStats[monthlyStats.length - 2];

    // 인사이트 계산
    const allInsights: Insight[] = [
      ...calculateGrowthInsights(
        currentWeekly,
        previousWeekly,
        currentMonthly,
        previousMonthly
      ),
      ...calculateTrendInsights(weeklyStats, monthlyStats),
      ...calculateMilestoneInsights(currentStats, previousStats),
      ...calculateAlertInsights(
        currentWeekly,
        previousWeekly,
        currentMonthly,
        previousMonthly
      ),
    ];

    // 우선순위 정렬 (alert > growth > milestone > trend)
    const priorityOrder: Record<InsightType, number> = {
      alert: 0,
      growth: 1,
      milestone: 2,
      trend: 3,
    };

    allInsights.sort((a, b) => {
      const priorityDiff = priorityOrder[a.type] - priorityOrder[b.type];
      if (priorityDiff !== 0) return priorityDiff;

      const priorityValue: Record<InsightPriority, number> = {
        high: 0,
        normal: 1,
        low: 2,
      };
      return priorityValue[a.priority] - priorityValue[b.priority];
    });

    // 최대 5개만 저장
    const insights = allInsights.slice(0, 5);

    // platform_insights/latest 업데이트
    const insightsRef = db.doc("platform_insights/latest");
    const platformInsights: PlatformInsights = {
      insights,
      generatedAt: admin.firestore.Timestamp.now(),
    };

    await insightsRef.set(platformInsights, { merge: true });

    // 이전 통계 저장 (다음 비교용)
    await previousStatsRef.set(currentStats, { merge: true });

    logger.info("✅ [generateInsights] 인사이트 생성 완료:", {
      count: insights.length,
      types: insights.map((i) => i.type),
    });
  } catch (error: any) {
    logger.error("❌ [generateInsights] 인사이트 생성 실패:", {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}
