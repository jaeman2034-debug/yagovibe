/**
 * 🔥 선수 경기 기록 서비스
 * 
 * 역할:
 * - 경기별 선수 기록 생성/수정/삭제
 * - 선수 기록 조회
 */

import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { PlayerGameStats } from "@/types/playerStats";

/**
 * 경기별 선수 기록 생성
 */
export async function createPlayerGameStats(input: {
  gameId: string;
  teamId: string;
  playerId: string;
  sportType: string;
  goals: number;
  assists: number;
  shots?: number;
  passes?: number;
  minutesPlayed?: number;
  yellowCards?: number;
  redCards?: number;
  recordedBy: string;
}): Promise<string> {
  const statsData: Omit<PlayerGameStats, "id"> = {
    gameId: input.gameId,
    teamId: input.teamId,
    playerId: input.playerId,
    sportType: input.sportType,
    goals: input.goals || 0,
    assists: input.assists || 0,
    shots: input.shots || 0,
    passes: input.passes || 0,
    minutesPlayed: input.minutesPlayed || 0,
    yellowCards: input.yellowCards || 0,
    redCards: input.redCards || 0,
    recordedBy: input.recordedBy,
    createdAt: serverTimestamp(),
  };

  const statsRef = await addDoc(collection(db, "player_game_stats"), statsData);
  return statsRef.id;
}

/**
 * 경기별 선수 기록 수정
 */
export async function updatePlayerGameStats(
  statsId: string,
  updates: {
    goals?: number;
    assists?: number;
    shots?: number;
    passes?: number;
    minutesPlayed?: number;
    yellowCards?: number;
    redCards?: number;
  }
): Promise<void> {
  const statsRef = doc(db, "player_game_stats", statsId);
  await updateDoc(statsRef, updates);
}

/**
 * 경기별 선수 기록 삭제
 */
export async function deletePlayerGameStats(statsId: string): Promise<void> {
  const statsRef = doc(db, "player_game_stats", statsId);
  await deleteDoc(statsRef);
}

/**
 * 경기의 모든 선수 기록 조회
 */
export async function getGamePlayerStats(gameId: string): Promise<PlayerGameStats[]> {
  const q = query(
    collection(db, "player_game_stats"),
    where("gameId", "==", gameId)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as PlayerGameStats[];
}

/**
 * 팀의 경기별 선수 기록 조회
 */
export async function getTeamGamePlayerStats(
  gameId: string,
  teamId: string
): Promise<PlayerGameStats[]> {
  const q = query(
    collection(db, "player_game_stats"),
    where("gameId", "==", gameId),
    where("teamId", "==", teamId)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as PlayerGameStats[];
}

/**
 * 선수의 모든 경기 기록 조회
 */
export async function getPlayerGameStats(playerId: string): Promise<PlayerGameStats[]> {
  const q = query(
    collection(db, "player_game_stats"),
    where("playerId", "==", playerId)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as PlayerGameStats[];
}
