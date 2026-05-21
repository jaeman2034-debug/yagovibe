/**
 * 🔥 Team Game 생성 헬퍼 함수
 * 
 * 역할: team_games 생성 로직 재사용
 */

import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";

export interface CreateTeamGameInput {
  matchId: string;
  eventId: string;
  divisionId?: string | null;
  seasonId?: string | null;
  sportType: string;
  gameType: "friendly" | "league" | "tournament" | "scrimmage";
  homeTeamId: string;
  homeTeamName: string;
  awayTeamId: string;
  awayTeamName: string;
  scheduledAt: admin.firestore.Timestamp;
  playedAt: admin.firestore.Timestamp;
  location?: string | null;
  address?: string | null;
  homeScore: number;
  awayScore: number;
  roundCode?: string | null;
  roundName?: string | null;
  createdBy?: string;
}

/**
 * Team Game 생성 (홈/어웨이 각각)
 */
export async function createTeamGames(
  input: CreateTeamGameInput
): Promise<{ homeGameId: string; awayGameId: string }> {
  const db = getFirestore();
  
  const {
    matchId,
    eventId,
    divisionId,
    seasonId,
    sportType,
    gameType,
    homeTeamId,
    homeTeamName,
    awayTeamId,
    awayTeamName,
    scheduledAt,
    playedAt,
    location,
    address,
    homeScore,
    awayScore,
    roundCode,
    roundName,
    createdBy,
  } = input;

  // 승자 결정
  let winnerTeamId: string | null = null;
  let resultType: "home-win" | "away-win" | "draw" | null = null;

  if (homeScore > awayScore) {
    winnerTeamId = homeTeamId;
    resultType = "home-win";
  } else if (awayScore > homeScore) {
    winnerTeamId = awayTeamId;
    resultType = "away-win";
  } else {
    resultType = "draw";
  }

  const now = admin.firestore.Timestamp.now();

  // 공통 필드
  const baseGameData = {
    sportType,
    gameType,
    sourceType: "event" as const,
    sourceId: matchId,
    eventId,
    divisionId: divisionId || null,
    seasonId: seasonId || null,
    homeTeamId,
    homeTeamName,
    awayTeamId,
    awayTeamName,
    scheduledAt,
    playedAt,
    location: location || null,
    address: address || null,
    status: "completed" as const,
    homeScore,
    awayScore,
    winnerTeamId,
    resultType,
    roundCode: roundCode || null,
    roundName: roundName || null,
    createdBy: createdBy || "system",
    recordedBy: "system",
    recordedAt: now,
    createdAt: now,
    updatedAt: now,
  };

  // 홈팀 team_game
  const teamGameHomeRef = db.collection("team_games").doc();
  await teamGameHomeRef.set(baseGameData);

  // 어웨이팀 team_game
  const teamGameAwayRef = db.collection("team_games").doc();
  await teamGameAwayRef.set(baseGameData);

  return {
    homeGameId: teamGameHomeRef.id,
    awayGameId: teamGameAwayRef.id,
  };
}
