/**
 * 🔥 Analytics Dashboard Page - 플랫폼 통계 대시보드
 * 
 * 경로: /admin/dashboard
 * 
 * 역할:
 * - 플랫폼 전체 통계 표시
 * - Top Entities 표시
 * - Recent Activity 표시
 */

import { useState, useEffect } from "react";
import { useAuthUser } from "@/hooks/useAuthUser";
import {
  getPlatformStats,
  getTopEvents,
  getTopTeams,
  getTopPlayers,
  getRecentActivity,
  getMonthlyStats,
  getWeeklyStats,
  getInsights,
} from "@/services/analyticsService";
import { StatCard } from "@/components/ui/StatCard";
import { TopEntitiesTable } from "@/components/admin/TopEntitiesTable";
import { RecentActivity } from "@/components/admin/RecentActivity";
import { GrowthCharts } from "@/components/admin/GrowthCharts";
import { InsightsCard } from "@/components/admin/InsightsCard";
import {
  Calendar,
  Users,
  User,
  Target,
  Trophy,
  Building2,
  Loader2,
} from "lucide-react";
import type {
  PlatformStats,
  TopEvent,
  TopTeam,
  TopPlayer,
  RecentActivity as RecentActivityType,
  MonthlyStats,
  WeeklyStats,
  PlatformInsights,
} from "@/services/analyticsService";

export default function AnalyticsDashboardPage() {
  const { profile } = useAuthUser();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [topEvents, setTopEvents] = useState<TopEvent[]>([]);
  const [topTeams, setTopTeams] = useState<TopTeam[]>([]);
  const [topPlayers, setTopPlayers] = useState<TopPlayer[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivityType[]>([]);
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats[]>([]);
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats[]>([]);
  const [insights, setInsights] = useState<PlatformInsights | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      const [
        statsData,
        eventsData,
        teamsData,
        playersData,
        activityData,
        monthlyData,
        weeklyData,
        insightsData,
      ] = await Promise.all([
        getPlatformStats(),
        getTopEvents(5),
        getTopTeams(5),
        getTopPlayers(5),
        getRecentActivity(10),
        getMonthlyStats(12),
        getWeeklyStats(12),
        getInsights(),
      ]);

      setStats(statsData);
      setTopEvents(eventsData);
      setTopTeams(teamsData);
      setTopPlayers(playersData);
      setRecentActivity(activityData);
      setMonthlyStats(monthlyData);
      setWeeklyStats(weeklyData);
      setInsights(insightsData);
    } catch (error) {
      console.error("대시보드 데이터 로드 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 px-4 sm:px-0">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">대시보드</h1>
        <p className="text-sm sm:text-base text-gray-600 mt-1">플랫폼 통계 및 활동 현황</p>
      </div>

      {/* Summary Cards - 모바일: 2열, 태블릿: 3열, 데스크톱: 5열 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <StatCard
          label="Events"
          value={stats?.totalEvents || 0}
          icon={<Calendar className="w-5 h-5" />}
          subtitle={
            stats?.eventsThisMonth
              ? `+${stats.eventsThisMonth} this month`
              : undefined
          }
          variant="primary"
        />
        <StatCard
          label="Teams"
          value={stats?.totalTeams || 0}
          icon={<Users className="w-5 h-5" />}
          subtitle={
            stats?.teamsThisMonth
              ? `+${stats.teamsThisMonth} this month`
              : undefined
          }
          variant="success"
        />
        <StatCard
          label="Players"
          value={stats?.totalPlayers || 0}
          icon={<User className="w-5 h-5" />}
          subtitle={
            stats?.playersThisMonth
              ? `+${stats.playersThisMonth} this month`
              : undefined
          }
          variant="primary"
        />
        <StatCard
          label="Matches"
          value={stats?.totalMatches || 0}
          icon={<Target className="w-5 h-5" />}
          subtitle={
            stats?.matchesThisMonth
              ? `+${stats.matchesThisMonth} this month`
              : undefined
          }
          variant="warning"
        />
        <StatCard
          label="Goals"
          value={stats?.totalGoals || 0}
          icon={<Trophy className="w-5 h-5" />}
          subtitle={
            stats?.goalsThisMonth
              ? `+${stats.goalsThisMonth} this month`
              : undefined
          }
          variant="danger"
        />
      </div>

      {/* Growth Charts */}
      <GrowthCharts
        monthlyStats={monthlyStats}
        weeklyStats={weeklyStats}
        loading={loading}
      />

      {/* Insights */}
      {insights && insights.insights.length > 0 && (
        <InsightsCard insights={insights.insights} loading={loading} />
      )}

      {/* Top Entities - 모바일: 1열, 데스크톱: 3열 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <TopEntitiesTable
          title="Top Events"
          type="events"
          entities={topEvents}
          loading={loading}
        />
        <TopEntitiesTable
          title="Top Teams"
          type="teams"
          entities={topTeams}
          loading={loading}
        />
        <TopEntitiesTable
          title="Top Players"
          type="players"
          entities={topPlayers}
          loading={loading}
        />
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <RecentActivity activities={recentActivity} loading={loading} />
      </div>
    </div>
  );
}
