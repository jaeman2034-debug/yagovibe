/**
 * 🔥 Player Match History 생성
 * 
 * 역할:
 * - player_games 기반으로 player_match_history 생성
 * - 경로: player_match_history/{playerId}_{matchId}
 * - Player Page 성능 최적화용
 */

import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { admin } from "../firebaseAdmin";

const db = getFirestore();

export async function createPlayerMatchHistory(playerGame: any): Promise<void> {
  try {
    const { playerId, matchId, eventId, teamId, teamName } = playerGame;

    if (!playerId || !matchId) {
      logger.warn("⚠️ [createPlayerMatchHistory] 필수 필드 누락:", {
        playerId,
        matchId,
      });
      return;
    }

    // event_match 정보 조회
    const matchDoc = await db.doc(`event_matches/${matchId}`).get();

    if (!matchDoc.exists) {
      logger.warn("⚠️ [createPlayerMatchHistory] event_match 없음:", { matchId });
      return;
    }

    const matchData = matchDoc.data()!;

    // 상대팀 정보 추출
    const isHome = matchData.homeTeamId === teamId;
    const opponentTeamId = isHome ? matchData.awayTeamId : matchData.homeTeamId;
    const opponentTeamName = isHome
      ? matchData.awayTeamName || matchData.awayTeamId
      : matchData.homeTeamName || matchData.homeTeamId;

    // 경기 결과 추출
    let result: "win" | "draw" | "loss" | undefined;
    if (matchData.status === "completed" && matchData.homeScore !== null && matchData.awayScore !== null) {
      const homeScore = matchData.homeScore;
      const awayScore = matchData.awayScore;

      if (isHome) {
        if (homeScore > awayScore) result = "win";
        else if (homeScore < awayScore) result = "loss";
        else result = "draw";
      } else {
        if (awayScore > homeScore) result = "win";
        else if (awayScore < homeScore) result = "loss";
        else result = "draw";
      }
    }

    // History 문서 생성/업데이트
    const historyId = `${playerId}_${matchId}`;
    const historyRef = db.doc(`player_match_history/${historyId}`);

    const now = admin.firestore.Timestamp.now();

    await historyRef.set(
      {
        id: historyId,
        playerId,
        matchId,
        eventId: eventId || null,
        organizationId: null, // 필요시 추가
        teamId,
        teamName: teamName || null,
        opponentTeamId,
        opponentTeamName: opponentTeamName || null,
        matchDate: matchData.scheduledAt || now,
        stageLabel: matchData.roundName || null,
        roundCode: matchData.roundCode || null,
        starter: playerGame.starter || false,
        appearance: playerGame.appearance || false,
        minutesPlayed: playerGame.minutesPlayed || 0,
        goals: playerGame.goals || 0,
        assists: playerGame.assists || 0,
        yellowCards: playerGame.yellowCards || 0,
        redCards: playerGame.redCards || 0,
        result: result || null,
        createdAt: now,
      },
      { merge: true }
    );

    logger.info("✅ [createPlayerMatchHistory] 완료:", {
      playerId,
      matchId,
      historyId,
    });
  } catch (error: any) {
    logger.error("❌ [createPlayerMatchHistory] 실패:", {
      playerId: playerGame?.playerId,
      matchId: playerGame?.matchId,
      error: error.message,
      stack: error.stack,
    });
    // 에러 발생해도 원본 데이터는 유지
  }
}
