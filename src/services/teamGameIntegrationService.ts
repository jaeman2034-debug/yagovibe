/**
 * 🔥 팀 경기 시스템 통합 서비스
 * 
 * 역할:
 * - matches → team_games 연결
 * - tournament → team_games 연결
 * - 기존 시스템과 team_games 연결
 */

import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { createTeamGame } from './teamGameService';
import type { Match } from '@/types/match';

/**
 * matches → team_games 연결
 * 
 * 매칭이 확정되면 team_games에 경기 기록 생성
 */
export async function createTeamGameFromMatch(
  matchId: string,
  opponentTeamId: string,
  createdBy: string
): Promise<string> {
  // match 정보 조회
  const matchRef = doc(db, 'matches', matchId);
  const matchSnap = await getDoc(matchRef);

  if (!matchSnap.exists()) {
    throw new Error('매칭을 찾을 수 없습니다.');
  }

  const match = matchSnap.data() as Match;

  // 이미 team_games가 생성되었는지 확인
  if (match.teamGameId) {
    throw new Error('이미 경기 기록이 생성되었습니다.');
  }

  // match의 teamId가 홈팀
  const homeTeamId = match.teamId;
  const awayTeamId = opponentTeamId;

  // 날짜 + 시간 결합
  const scheduledAt = new Date(match.date.toDate());
  const [hours, minutes] = match.time.split(':').map(Number);
  scheduledAt.setHours(hours, minutes, 0, 0);

  // team_games 생성
  const gameId = await createTeamGame({
    homeTeamId,
    awayTeamId,
    scheduledAt,
    location: match.stadium || undefined,
    gameType: 'friendly', // matches는 기본적으로 친선전
    sourceType: 'match',
    sourceId: matchId,
    createdBy,
    notes: match.description || undefined,
  });

  // match에 teamGameId 연결
  await updateDoc(matchRef, {
    teamGameId: gameId,
    status: 'matched', // 매칭 확정 상태로 변경
  });

  return gameId;
}

/**
 * tournament → team_games 연결
 * 
 * 토너먼트 경기 결과 확정 시 team_games에 기록
 */
export async function createTeamGameFromTournament(
  tournamentMatchId: string,
  associationId: string,
  tournamentId: string,
  homeTeamId: string,
  awayTeamId: string,
  homeScore: number,
  awayScore: number,
  scheduledAt: Date,
  createdBy: string
): Promise<string> {
  // team_games 생성
  const gameId = await createTeamGame({
    homeTeamId,
    awayTeamId,
    scheduledAt,
    gameType: 'tournament',
    sourceType: 'tournament',
    sourceId: tournamentMatchId,
    createdBy,
  });

  // 경기 결과도 함께 기록
  const { completeTeamGame } = await import('./teamGameService');
  await completeTeamGame(gameId, {
    homeScore,
    awayScore,
    playedAt: scheduledAt,
    recordedBy: createdBy,
  });

  return gameId;
}
