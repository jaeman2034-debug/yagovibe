/**
 * 🔥 Player Season Summary 집계
 * 
 * 역할:
 * - player_games를 집계하여 player_season_summary 생성/업데이트
 * - 경로: player_season_summaries/{playerId}_{seasonId}
 */

import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { admin } from "../firebaseAdmin";

const db = getFirestore();

export async function aggregatePlayerSeasonSummary(
  playerId: string,
  seasonId: string
): Promise<void> {
  try {
    // player_games 조회 (playerId + seasonId)
    const gamesQuery = db
      .collection("player_games")
      .where("playerId", "==", playerId)
      .where("seasonId", "==", seasonId);

    const gamesSnap = await gamesQuery.get();

    if (gamesSnap.empty) {
      logger.info("ℹ️ [aggregatePlayerSeasonSummary] player_games 없음:", {
        playerId,
        seasonId,
      });
      return;
    }

    // 집계 계산
    let goals = 0;
    let assists = 0;
    let appearances = 0;
    let starts = 0;
    let minutesPlayed = 0;
    let yellowCards = 0;
    let redCards = 0;

    let playerName = "";
    let teamId = "";
    let teamName: string | null = null;

    gamesSnap.forEach((doc) => {
      const data = doc.data();

      // 첫 번째 게임에서 기본 정보 추출
      if (!playerName) {
        playerName = data.playerName || "";
        teamId = data.teamId || "";
        teamName = data.teamName || null;
      }

      // 집계
      goals += data.goals || 0;
      assists += data.assists || 0;
      yellowCards += data.yellowCards || 0;
      redCards += data.redCards || 0;
      minutesPlayed += data.minutesPlayed || 0;

      if (data.appearance) {
        appearances++;
      }

      if (data.starter) {
        starts++;
      }
    });

    // Summary 문서 생성/업데이트
    const summaryId = `${playerId}_${seasonId}`;
    const summaryRef = db.doc(`player_season_summaries/${summaryId}`);

    const now = admin.firestore.Timestamp.now();

    await summaryRef.set(
      {
        id: summaryId,
        playerId,
        playerName,
        seasonId,
        teamId,
        teamName: teamName || null,
        appearances,
        starts,
        minutesPlayed,
        goals,
        assists,
        yellowCards,
        redCards,
        updatedAt: now,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    logger.info("✅ [aggregatePlayerSeasonSummary] 완료:", {
      playerId,
      seasonId,
      summaryId,
      goals,
      assists,
      appearances,
    });
  } catch (error: any) {
    logger.error("❌ [aggregatePlayerSeasonSummary] 실패:", {
      playerId,
      seasonId,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}
