/**
 * 🔥 Leaderboard 서비스
 * 
 * 역할:
 * - Event별 리더보드 조회
 * - 카테고리별 리더보드 조회
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

export type LeaderboardCategory = "goals" | "assists" | "appearances" | "yellow_cards" | "red_cards";

export interface LeaderboardRow {
  rank: number;
  playerId: string;
  playerName: string;
  teamId?: string;
  teamName?: string;
  value: number;
  appearances?: number;
}

export interface Leaderboard {
  id: string;
  eventId: string;
  divisionId?: string | null;
  category: LeaderboardCategory;
  leaderboard: LeaderboardRow[];
  updatedAt: any;
}

/**
 * Event별 리더보드 조회
 */
export async function getEventLeaderboard(
  eventId: string,
  category: LeaderboardCategory,
  divisionId?: string | null
): Promise<Leaderboard | null> {
  try {
    const leaderboardId = `${eventId}${divisionId ? `_${divisionId}` : ""}_${category}`;
    const docRef = doc(db, "leaderboards", leaderboardId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    const data = docSnap.data();
    return {
      id: docSnap.id,
      eventId: data.eventId,
      divisionId: data.divisionId || null,
      category: data.category || category,
      leaderboard: data.leaderboard || data.rows || [],
      updatedAt: data.updatedAt,
    } as Leaderboard;
  } catch (error) {
    console.error("[getEventLeaderboard] 조회 실패:", error);
    return null;
  }
}

/**
 * 모든 카테고리 리더보드 조회
 */
export async function getAllEventLeaderboards(
  eventId: string,
  divisionId?: string | null
): Promise<Record<LeaderboardCategory, Leaderboard | null>> {
  const categories: LeaderboardCategory[] = [
    "goals",
    "assists",
    "appearances",
    "yellow_cards",
    "red_cards",
  ];

  const results = await Promise.all(
    categories.map((category) => getEventLeaderboard(eventId, category, divisionId))
  );

  return {
    goals: results[0] || null,
    assists: results[1] || null,
    appearances: results[2] || null,
    yellow_cards: results[3] || null,
    red_cards: results[4] || null,
  };
}
