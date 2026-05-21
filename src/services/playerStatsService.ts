/**
 * 🔥 선수 통계 서비스
 * 
 * 역할:
 * - 선수 누적 통계 조회
 * - 선수 랭킹 조회
 */

import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { PlayerStats } from "@/types/playerStats";

/**
 * 선수 통계 조회
 */
export async function getPlayerStats(playerId: string): Promise<PlayerStats | null> {
  const statsRef = doc(db, "player_stats", playerId);
  const statsSnap = await getDoc(statsRef);

  if (!statsSnap.exists()) {
    return null;
  }

  return {
    playerId: statsSnap.id,
    ...statsSnap.data(),
  } as PlayerStats;
}

/**
 * 선수 랭킹 조회 (득점 기준)
 */
export async function getPlayerRankingByGoals(
  sportType: string,
  limitCount: number = 100
): Promise<PlayerStats[]> {
  const q = query(
    collection(db, "player_stats"),
    where("sportType", "==", sportType),
    orderBy("goals", "desc"),
    orderBy("assists", "desc"),
    limit(limitCount)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    playerId: doc.id,
    ...doc.data(),
  })) as PlayerStats[];
}

/**
 * 선수 랭킹 조회 (어시스트 기준)
 */
export async function getPlayerRankingByAssists(
  sportType: string,
  limitCount: number = 100
): Promise<PlayerStats[]> {
  const q = query(
    collection(db, "player_stats"),
    where("sportType", "==", sportType),
    orderBy("assists", "desc"),
    orderBy("goals", "desc"),
    limit(limitCount)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    playerId: doc.id,
    ...doc.data(),
  })) as PlayerStats[];
}

/**
 * 선수 랭킹 조회 (득점/경기 기준)
 */
export async function getPlayerRankingByGoalsPerGame(
  sportType: string,
  minGames: number = 3,
  limitCount: number = 100
): Promise<PlayerStats[]> {
  const q = query(
    collection(db, "player_stats"),
    where("sportType", "==", sportType),
    where("games", ">=", minGames),
    orderBy("games", "desc"),
    orderBy("goalsPerGame", "desc"),
    limit(limitCount)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    playerId: doc.id,
    ...doc.data(),
  })) as PlayerStats[];
}
