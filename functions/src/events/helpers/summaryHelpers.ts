/**
 * 🔥 Summary 업데이트 헬퍼 함수
 * 
 * 역할: Team Event Summary, Team Season Summary 업데이트
 */

import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";

export interface GameResult {
  result: "win" | "draw" | "loss";
  goalsFor: number;
  goalsAgainst: number;
}

/**
 * Team Event Summary 업데이트
 */
export async function updateTeamEventSummary(
  teamId: string,
  eventId: string,
  divisionId: string | null,
  gameResult: GameResult
): Promise<void> {
  const db = getFirestore();
  
  const summaryId = `summary_${teamId}_${eventId}_${divisionId || "all"}`;
  const summaryRef = db.doc(`team_event_summaries/${summaryId}`);

  const summaryDoc = await summaryRef.get();
  const current = summaryDoc.exists ? summaryDoc.data() : {
    teamId,
    eventId,
    divisionId: divisionId || null,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDiff: 0,
  };

  const updated = {
    ...current,
    played: (current.played || 0) + 1,
    won: (current.won || 0) + (gameResult.result === "win" ? 1 : 0),
    drawn: (current.drawn || 0) + (gameResult.result === "draw" ? 1 : 0),
    lost: (current.lost || 0) + (gameResult.result === "loss" ? 1 : 0),
    goalsFor: (current.goalsFor || 0) + gameResult.goalsFor,
    goalsAgainst: (current.goalsAgainst || 0) + gameResult.goalsAgainst,
    goalDiff: ((current.goalsFor || 0) + gameResult.goalsFor) - ((current.goalsAgainst || 0) + gameResult.goalsAgainst),
    updatedAt: admin.firestore.Timestamp.now(),
  };

  await summaryRef.set(updated, { merge: true });
}

/**
 * Team Season Summary 업데이트
 */
export async function updateTeamSeasonSummary(
  teamId: string,
  seasonId: string,
  gameResult: GameResult
): Promise<void> {
  const db = getFirestore();
  
  const summaryId = `summary_${teamId}_${seasonId}`;
  const summaryRef = db.doc(`team_season_summaries/${summaryId}`);

  const summaryDoc = await summaryRef.get();
  const current = summaryDoc.exists ? summaryDoc.data() : {
    teamId,
    seasonId,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDiff: 0,
  };

  const updated = {
    ...current,
    played: (current.played || 0) + 1,
    won: (current.won || 0) + (gameResult.result === "win" ? 1 : 0),
    drawn: (current.drawn || 0) + (gameResult.result === "draw" ? 1 : 0),
    lost: (current.lost || 0) + (gameResult.result === "loss" ? 1 : 0),
    goalsFor: (current.goalsFor || 0) + gameResult.goalsFor,
    goalsAgainst: (current.goalsAgainst || 0) + gameResult.goalsAgainst,
    goalDiff: ((current.goalsFor || 0) + gameResult.goalsFor) - ((current.goalsAgainst || 0) + gameResult.goalsAgainst),
    updatedAt: admin.firestore.Timestamp.now(),
  };

  await summaryRef.set(updated, { merge: true });
}
