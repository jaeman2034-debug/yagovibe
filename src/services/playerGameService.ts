/**
 * 🔥 Player Game 서비스
 * 
 * 역할:
 * - player_games 생성/조회/수정/삭제
 * - 경기별 선수 기록 관리
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
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { PlayerGame } from "@/types/playerGame";

/**
 * Player Game 생성
 */
export async function createPlayerGame(input: {
  matchId: string;
  eventId?: string | null;
  divisionId?: string | null;
  seasonId?: string | null;
  teamId: string;
  playerId: string;
  playerName: string;
  appearance: boolean;
  starter: boolean;
  minutesPlayed: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  playedAt: Date | Timestamp;
}): Promise<string> {
  const playerGameData: Omit<PlayerGame, "id"> = {
    matchId: input.matchId,
    eventId: input.eventId || null,
    divisionId: input.divisionId || null,
    seasonId: input.seasonId || null,
    teamId: input.teamId,
    playerId: input.playerId,
    playerName: input.playerName,
    appearance: input.appearance,
    starter: input.starter,
    minutesPlayed: input.minutesPlayed,
    goals: input.goals || 0,
    assists: input.assists || 0,
    yellowCards: input.yellowCards || 0,
    redCards: input.redCards || 0,
    playedAt: input.playedAt instanceof Timestamp 
      ? input.playedAt 
      : Timestamp.fromDate(input.playedAt),
    createdAt: serverTimestamp() as Timestamp,
    updatedAt: serverTimestamp() as Timestamp,
  };

  const docRef = await addDoc(collection(db, "player_games"), playerGameData);
  return docRef.id;
}

/**
 * Player Game 업데이트
 */
export async function updatePlayerGame(
  playerGameId: string,
  updates: Partial<Omit<PlayerGame, "id" | "createdAt">>
): Promise<void> {
  const updateData: any = {
    ...updates,
    updatedAt: serverTimestamp(),
  };

  // playedAt이 Date인 경우 Timestamp로 변환
  if (updates.playedAt && updates.playedAt instanceof Date) {
    updateData.playedAt = Timestamp.fromDate(updates.playedAt);
  }

  await updateDoc(doc(db, "player_games", playerGameId), updateData);
}

/**
 * Player Game 삭제
 */
export async function deletePlayerGame(playerGameId: string): Promise<void> {
  await deleteDoc(doc(db, "player_games", playerGameId));
}

/**
 * 경기별 Player Games 조회
 */
export async function getPlayerGamesByMatch(matchId: string): Promise<PlayerGame[]> {
  const q = query(
    collection(db, "player_games"),
    where("matchId", "==", matchId)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as PlayerGame[];
}

/**
 * 팀별 Player Games 조회 (경기 내)
 */
export async function getPlayerGamesByMatchAndTeam(
  matchId: string,
  teamId: string
): Promise<PlayerGame[]> {
  const q = query(
    collection(db, "player_games"),
    where("matchId", "==", matchId),
    where("teamId", "==", teamId)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as PlayerGame[];
}

/**
 * Event별 Player Games 조회
 */
export async function getPlayerGamesByEvent(
  eventId: string,
  divisionId?: string
): Promise<PlayerGame[]> {
  const constraints = [where("eventId", "==", eventId)];
  
  if (divisionId) {
    constraints.push(where("divisionId", "==", divisionId));
  }

  const q = query(collection(db, "player_games"), ...constraints);

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as PlayerGame[];
}

/**
 * Player Games 일괄 저장 (경기별)
 */
export async function savePlayerGamesBatch(
  matchId: string,
  playerGames: Array<{
    eventId?: string | null;
    divisionId?: string | null;
    seasonId?: string | null;
    teamId: string;
    playerId: string;
    playerName: string;
    appearance: boolean;
    starter: boolean;
    minutesPlayed: number;
    goals: number;
    assists: number;
    yellowCards: number;
    redCards: number;
    playedAt: Date | Timestamp;
  }>
): Promise<void> {
  const batch = writeBatch(db);
  const now = serverTimestamp() as Timestamp;

  // 기존 player_games 삭제 (해당 경기의)
  const existingGames = await getPlayerGamesByMatch(matchId);
  existingGames.forEach((game) => {
    batch.delete(doc(db, "player_games", game.id));
  });

  // 새로운 player_games 생성
  playerGames.forEach((input) => {
    const playerGameRef = doc(collection(db, "player_games"));
    const playerGameData: Omit<PlayerGame, "id"> = {
      matchId,
      eventId: input.eventId || null,
      divisionId: input.divisionId || null,
      seasonId: input.seasonId || null,
      teamId: input.teamId,
      playerId: input.playerId,
      playerName: input.playerName,
      appearance: input.appearance,
      starter: input.starter,
      minutesPlayed: input.minutesPlayed,
      goals: input.goals || 0,
      assists: input.assists || 0,
      yellowCards: input.yellowCards || 0,
      redCards: input.redCards || 0,
      playedAt: input.playedAt instanceof Timestamp 
        ? input.playedAt 
        : Timestamp.fromDate(input.playedAt),
      createdAt: now,
      updatedAt: now,
    };

    batch.set(playerGameRef, playerGameData);
  });

  await batch.commit();
}
