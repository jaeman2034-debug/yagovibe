/**
 * 🔥 Analytics Service - 플랫폼 통계 조회
 * 
 * 역할:
 * - platform_stats 조회
 * - Top Entities 조회
 * - Recent Activity 조회
 * - Monthly/Weekly Stats 조회
 * - Insights 조회
 */

import {
  doc,
  getDoc,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Event } from "@/types/event";
import type { TeamSummary } from "@/types/teamSummary";
import type { PlayerSummary } from "@/types/playerSummary";

export interface PlatformStats {
  totalEvents: number;
  totalTeams: number;
  totalPlayers: number;
  totalMatches: number;
  totalGoals: number;
  eventsThisMonth: number;
  teamsThisMonth: number;
  playersThisMonth: number;
  matchesThisMonth: number;
  goalsThisMonth: number;
  updatedAt: any;
}

export interface TopEvent {
  id: string;
  name: string;
  matches: number;
  teams: number;
  goals: number;
  status: string;
}

export interface TopTeam {
  id: string;
  name: string;
  matches: number;
  wins: number;
  goals: number;
  championships: number;
}

export interface TopPlayer {
  id: string;
  name: string;
  teamId?: string;
  teamName?: string;
  goals: number;
  assists: number;
  appearances: number;
}

export interface RecentActivity {
  id: string;
  type: string;
  title: string;
  message: string;
  createdAt: any;
}

export interface MonthlyStats {
  month: string;
  events: number;
  newTeams: number;
  newPlayers: number;
  matches: number;
  goals: number;
}

export interface WeeklyStats {
  week: string;
  matches: number;
  goals: number;
  newPlayers: number;
  newTeams: number;
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
 * 플랫폼 통계 조회
 */
export async function getPlatformStats(): Promise<PlatformStats | null> {
  try {
    const statsRef = doc(db, "platform_stats", "global");
    const statsSnap = await getDoc(statsRef);

    if (!statsSnap.exists()) {
      return null;
    }

    return statsSnap.data() as PlatformStats;
  } catch (error) {
    console.error("[getPlatformStats] 조회 실패:", error);
    return null;
  }
}

/**
 * Top Events 조회
 */
export async function getTopEvents(limitCount: number = 5): Promise<TopEvent[]> {
  try {
    // events + event_stats_summary 조합
    const eventsQuery = query(
      collection(db, "events"),
      orderBy("createdAt", "desc"),
      limit(limitCount * 2) // 여유있게 조회
    );

    const eventsSnap = await getDocs(eventsQuery);
    const events: TopEvent[] = [];

    for (const eventDoc of eventsSnap.docs) {
      const eventData = eventDoc.data() as Event;
      
      // event_stats_summary 조회 (있으면)
      try {
        const statsRef = doc(db, "event_stats_summary", eventData.id);
        const statsSnap = await getDoc(statsRef);
        
        const stats = statsSnap.exists() ? statsSnap.data() : null;
        
        events.push({
          id: eventData.id,
          name: eventData.name,
          matches: stats?.totalMatches || 0,
          teams: stats?.totalTeams || 0,
          goals: stats?.totalGoals || 0,
          status: eventData.status || "scheduled",
        });
      } catch {
        // stats 없으면 기본값
        events.push({
          id: eventData.id,
          name: eventData.name,
          matches: 0,
          teams: 0,
          goals: 0,
          status: eventData.status || "scheduled",
        });
      }
    }

    // matches 기준 정렬
    return events.sort((a, b) => b.matches - a.matches).slice(0, limitCount);
  } catch (error) {
    console.error("[getTopEvents] 조회 실패:", error);
    return [];
  }
}

/**
 * Top Teams 조회
 */
export async function getTopTeams(limitCount: number = 5): Promise<TopTeam[]> {
  try {
    const teamsQuery = query(
      collection(db, "team_summary"),
      orderBy("matches", "desc"),
      limit(limitCount)
    );

    const teamsSnap = await getDocs(teamsQuery);
    const teams: TopTeam[] = [];

    for (const teamDoc of teamsSnap.docs) {
      const teamData = teamDoc.data() as TeamSummary;
      
      // team 정보 조회 (이름 등)
      try {
        const teamRef = doc(db, "teams", teamData.teamId);
        const teamSnap = await getDoc(teamRef);
        const teamInfo = teamSnap.exists() ? teamSnap.data() : null;

        teams.push({
          id: teamData.teamId,
          name: teamInfo?.name || "Unknown",
          matches: teamData.matches || 0,
          wins: teamData.wins || 0,
          goals: teamData.goalsFor || 0,
          championships: teamData.championships || 0,
        });
      } catch {
        teams.push({
          id: teamData.teamId,
          name: "Unknown",
          matches: teamData.matches || 0,
          wins: teamData.wins || 0,
          goals: teamData.goalsFor || 0,
          championships: teamData.championships || 0,
        });
      }
    }

    return teams;
  } catch (error) {
    console.error("[getTopTeams] 조회 실패:", error);
    return [];
  }
}

/**
 * Top Players 조회
 */
export async function getTopPlayers(limitCount: number = 5): Promise<TopPlayer[]> {
  try {
    const playersQuery = query(
      collection(db, "player_summary"),
      orderBy("goals", "desc"),
      limit(limitCount)
    );

    const playersSnap = await getDocs(playersQuery);
    const players: TopPlayer[] = [];

    for (const playerDoc of playersSnap.docs) {
      const playerData = playerDoc.data() as PlayerSummary;
      
      // player 정보 조회
      try {
        const playerRef = doc(db, "players", playerData.playerId);
        const playerSnap = await getDoc(playerRef);
        const playerInfo = playerSnap.exists() ? playerSnap.data() : null;

        // team 정보 조회
        let teamName: string | undefined;
        if (playerData.currentTeamId) {
          try {
            const teamRef = doc(db, "teams", playerData.currentTeamId);
            const teamSnap = await getDoc(teamRef);
            const teamInfo = teamSnap.exists() ? teamSnap.data() : null;
            teamName = teamInfo?.name;
          } catch {
            // team 조회 실패 시 무시
          }
        }

        players.push({
          id: playerData.playerId,
          name: playerInfo?.name || "Unknown",
          teamId: playerData.currentTeamId,
          teamName,
          goals: playerData.goals || 0,
          assists: playerData.assists || 0,
          appearances: playerData.appearances || 0,
        });
      } catch {
        players.push({
          id: playerData.playerId,
          name: "Unknown",
          goals: playerData.goals || 0,
          assists: playerData.assists || 0,
          appearances: playerData.appearances || 0,
        });
      }
    }

    return players;
  } catch (error) {
    console.error("[getTopPlayers] 조회 실패:", error);
    return [];
  }
}

/**
 * Recent Activity 조회
 * 
 * Note: admin_logs가 없으면 activities 컬렉션 사용
 */
export async function getRecentActivity(limitCount: number = 10): Promise<RecentActivity[]> {
  try {
    // 먼저 admin_logs 시도
    try {
      const logsQuery = query(
        collection(db, "admin_logs"),
        orderBy("createdAt", "desc"),
        limit(limitCount)
      );

      const logsSnap = await getDocs(logsQuery);
      
      if (!logsSnap.empty) {
        return logsSnap.docs.map((doc) => ({
          id: doc.id,
          type: doc.data().action || "unknown",
          title: doc.data().action || "Activity",
          message: `${doc.data().action || "Activity"} - ${doc.data().entityType || ""}`,
          createdAt: doc.data().createdAt,
        }));
      }
    } catch {
      // admin_logs 없으면 activities 사용
    }

    // activities 컬렉션 사용
    const activitiesQuery = query(
      collection(db, "activities"),
      where("visibility", "==", "public"),
      orderBy("createdAt", "desc"),
      limit(limitCount)
    );

    const activitiesSnap = await getDocs(activitiesQuery);
    
    return activitiesSnap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        type: data.type || "unknown",
        title: data.title || "Activity",
        message: data.summary || data.title || "",
        createdAt: data.createdAt,
      };
    });
  } catch (error) {
    console.error("[getRecentActivity] 조회 실패:", error);
    return [];
  }
}

/**
 * 최근 N개월 통계 조회 (차트용)
 */
export async function getMonthlyStats(months: number = 12): Promise<MonthlyStats[]> {
  try {
    const monthlyQuery = query(
      collection(db, "platform_monthly_stats"),
      orderBy("month", "desc"),
      limit(months)
    );

    const monthlySnap = await getDocs(monthlyQuery);
    const stats: MonthlyStats[] = [];

    monthlySnap.forEach((doc) => {
      const data = doc.data();
      stats.push({
        month: data.month || "",
        events: data.events || 0,
        newTeams: data.newTeams || 0,
        newPlayers: data.newPlayers || 0,
        matches: data.matches || 0,
        goals: data.goals || 0,
      });
    });

    // 오름차순 정렬 (가장 오래된 것부터)
    return stats.reverse();
  } catch (error) {
    console.error("[getMonthlyStats] 조회 실패:", error);
    return [];
  }
}

/**
 * 최근 N주 통계 조회 (차트용)
 */
export async function getWeeklyStats(weeks: number = 12): Promise<WeeklyStats[]> {
  try {
    const weeklyQuery = query(
      collection(db, "platform_weekly_stats"),
      orderBy("week", "desc"),
      limit(weeks)
    );

    const weeklySnap = await getDocs(weeklyQuery);
    const stats: WeeklyStats[] = [];

    weeklySnap.forEach((doc) => {
      const data = doc.data();
      stats.push({
        week: data.week || "",
        matches: data.matches || 0,
        goals: data.goals || 0,
        newPlayers: data.newPlayers || 0,
        newTeams: data.newTeams || 0,
      });
    });

    // 오름차순 정렬 (가장 오래된 것부터)
    return stats.reverse();
  } catch (error) {
    console.error("[getWeeklyStats] 조회 실패:", error);
    return [];
  }
}

/**
 * Insights 조회
 */
export async function getInsights(): Promise<PlatformInsights | null> {
  try {
    const insightsRef = doc(db, "platform_insights", "latest");
    const insightsSnap = await getDoc(insightsRef);

    if (!insightsSnap.exists()) {
      return null;
    }

    return insightsSnap.data() as PlatformInsights;
  } catch (error) {
    console.error("[getInsights] 조회 실패:", error);
    return null;
  }
}
