/**
 * 🔥 Event Stats 서비스
 * 
 * 역할:
 * - Event 통계 요약 조회
 * - Team Event Summary 조회
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { TeamEventSummary } from "@/types/teamSummary";

export interface EventStatsSummary {
  eventId: string;
  totalMatches: number;
  completedMatches: number;
  totalGoals: number;
  totalPlayers: number;
  avgGoalsPerMatch: number;
  updatedAt: any;
}

/**
 * Event Stats Summary 조회
 * (없으면 계산하여 반환)
 */
export async function getEventStatsSummary(eventId: string): Promise<EventStatsSummary | null> {
  try {
    // event_stats_summary 문서 조회 시도
    const summaryRef = doc(db, "event_stats_summary", eventId);
    const summarySnap = await getDoc(summaryRef);

    if (summarySnap.exists()) {
      const data = summarySnap.data();
      return {
        eventId,
        totalMatches: data.totalMatches || 0,
        completedMatches: data.completedMatches || 0,
        totalGoals: data.totalGoals || 0,
        totalPlayers: data.totalPlayers || 0,
        avgGoalsPerMatch: data.avgGoalsPerMatch || 0,
        updatedAt: data.updatedAt,
      };
    }

    // 없으면 event_matches와 player_event_summaries에서 계산
    const [matchesSnap, playersSnap] = await Promise.all([
      getDocs(query(collection(db, "event_matches"), where("eventId", "==", eventId))),
      getDocs(query(collection(db, "player_event_summaries"), where("eventId", "==", eventId))),
    ]);

    let totalMatches = 0;
    let completedMatches = 0;
    let totalGoals = 0;

    matchesSnap.forEach((doc) => {
      const data = doc.data();
      totalMatches++;
      if (data.status === "completed") {
        completedMatches++;
        if (data.homeScore !== null && data.awayScore !== null) {
          totalGoals += (data.homeScore || 0) + (data.awayScore || 0);
        }
      }
    });

    // 고유 선수 수 계산
    const uniquePlayerIds = new Set<string>();
    playersSnap.forEach((doc) => {
      const data = doc.data();
      if (data.playerId) {
        uniquePlayerIds.add(data.playerId);
      }
    });

    const totalPlayers = uniquePlayerIds.size;
    const avgGoalsPerMatch = completedMatches > 0 ? totalGoals / completedMatches : 0;

    return {
      eventId,
      totalMatches,
      completedMatches,
      totalGoals,
      totalPlayers,
      avgGoalsPerMatch: Math.round(avgGoalsPerMatch * 100) / 100,
      updatedAt: null,
    };
  } catch (error) {
    console.error("[getEventStatsSummary] 조회 실패:", error);
    return null;
  }
}

/**
 * Team Event Summaries 조회 (팀 순위용)
 */
export async function getTeamEventSummaries(
  eventId: string,
  divisionId?: string | null
): Promise<TeamEventSummary[]> {
  try {
    let q = query(
      collection(db, "team_event_summaries"),
      where("eventId", "==", eventId),
      orderBy("wins", "desc"),
      orderBy("goalDifference", "desc"),
      orderBy("goalsFor", "desc")
    );

    if (divisionId) {
      q = query(
        collection(db, "team_event_summaries"),
        where("eventId", "==", eventId),
        where("divisionId", "==", divisionId),
        orderBy("wins", "desc"),
        orderBy("goalDifference", "desc"),
        orderBy("goalsFor", "desc")
      ) as any;
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as TeamEventSummary[];
  } catch (error) {
    console.error("[getTeamEventSummaries] 조회 실패:", error);
    return [];
  }
}
