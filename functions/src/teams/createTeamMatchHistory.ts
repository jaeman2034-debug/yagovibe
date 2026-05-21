/**
 * 🔥 Team Match History 생성
 * 
 * 역할:
 * - event_matches 기반으로 team_match_history 생성
 * - 경로: team_match_history/{teamId}_{matchId}
 * - Team Page 성능 최적화용
 */

import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { admin } from "../firebaseAdmin";

const db = getFirestore();

export async function createTeamMatchHistory(
  matchData: any,
  teamId: string,
  isHome: boolean
): Promise<void> {
  try {
    const { id: matchId, eventId, divisionId, homeTeamId, awayTeamId, homeTeamName, awayTeamName, homeScore, awayScore, scheduledAt, roundCode, roundName } = matchData;

    if (!matchId || !teamId) {
      logger.warn("⚠️ [createTeamMatchHistory] 필수 필드 누락:", {
        matchId,
        teamId,
      });
      return;
    }

    // 상대팀 정보 추출
    const opponentTeamId = isHome ? awayTeamId : homeTeamId;
    const opponentTeamName = isHome ? (awayTeamName || awayTeamId) : (homeTeamName || homeTeamId);

    // 득실점 추출
    const scored = isHome ? (homeScore || 0) : (awayScore || 0);
    const conceded = isHome ? (awayScore || 0) : (homeScore || 0);

    // 경기 결과 추출
    let result: "win" | "draw" | "loss" | null = null;
    if (homeScore !== null && awayScore !== null) {
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
    const historyId = `${teamId}_${matchId}`;
    const historyRef = db.doc(`team_match_history/${historyId}`);

    const now = admin.firestore.Timestamp.now();

    await historyRef.set(
      {
        id: historyId,
        teamId,
        matchId,
        eventId: eventId || null,
        organizationId: null, // 필요시 추가
        opponentTeamId,
        opponentTeamName: opponentTeamName || null,
        isHome,
        scored,
        conceded,
        result: result || null,
        stageLabel: roundName || null,
        roundCode: roundCode || null,
        matchDate: scheduledAt || now,
        createdAt: now,
      },
      { merge: true }
    );

    logger.info("✅ [createTeamMatchHistory] 완료:", {
      teamId,
      matchId,
      historyId,
    });
  } catch (error: any) {
    logger.error("❌ [createTeamMatchHistory] 실패:", {
      teamId,
      matchId: matchData?.id,
      error: error.message,
      stack: error.stack,
    });
    // 에러 발생해도 원본 데이터는 유지
  }
}
