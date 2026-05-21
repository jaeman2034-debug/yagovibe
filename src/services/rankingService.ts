/**
 * 🔥 랭킹 서비스
 * 
 * 역할:
 * - teams.stats 기반 팀 랭킹 조회
 * - Firestore 서버 정렬 사용
 */

import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface TeamRanking {
  id: string;
  name: string;
  sportType: string;
  region: string;
  logo?: string;
  stats: {
    games: number;
    wins: number;
    draws: number;
    losses: number;
    goalsFor: number;
    goalsAgainst: number;
    goalDiff: number;
    winRate: number;
  };
}

/**
 * 팀 랭킹 조회
 * 
 * 정렬 기준:
 * 1. 승률 (winRate desc)
 * 2. 득실차 (goalDiff desc)
 * 3. 승수 (wins desc)
 */
export async function getTeamRanking(sportType: string): Promise<TeamRanking[]> {
  const q = query(
    collection(db, "teams"),
    where("sportType", "==", sportType),
    where("status", "==", "active"),
    orderBy("stats.winRate", "desc"),
    orderBy("stats.goalDiff", "desc"),
    orderBy("stats.wins", "desc"),
    limit(100)
  );

  const snap = await getDocs(q);

  return snap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as TeamRanking[];
}
