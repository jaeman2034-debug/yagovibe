/**
 * 🔥 Player Summary 집계 (전체 누적)
 * 
 * 역할:
 * - player_games를 집계하여 player_summary 생성/업데이트
 * - 경로: player_summary/{playerId}
 */

import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { admin } from "../firebaseAdmin";

const db = getFirestore();

export async function aggregatePlayerSummary(playerId: string): Promise<void> {
  try {
    // player_games 조회 (playerId만)
    const gamesQuery = db.collection("player_games").where("playerId", "==", playerId);

    const gamesSnap = await gamesQuery.get();

    if (gamesSnap.empty) {
      logger.info("ℹ️ [aggregatePlayerSummary] player_games 없음:", { playerId });
      return;
    }

    // 집계 계산
    let goals = 0;
    let assists = 0;
    let appearances = 0;
    let starts = 0;
    let totalMinutesPlayed = 0;
    let yellowCards = 0;
    let redCards = 0;

    let playerName = "";
    let currentTeamId: string | null = null;
    let organizationId: string | null = null;
    let lastMatchAt: admin.firestore.Timestamp | null = null;

    gamesSnap.forEach((doc) => {
      const data = doc.data();

      // 첫 번째 게임에서 기본 정보 추출
      if (!playerName) {
        playerName = data.playerName || "";
      }

      // 최신 팀 정보 추출 (playedAt 기준)
      const playedAt = data.playedAt;
      if (playedAt && (!lastMatchAt || playedAt > lastMatchAt)) {
        lastMatchAt = playedAt;
        currentTeamId = data.teamId || null;
      }

      // 집계
      goals += data.goals || 0;
      assists += data.assists || 0;
      yellowCards += data.yellowCards || 0;
      redCards += data.redCards || 0;
      totalMinutesPlayed += data.minutesPlayed || 0;

      if (data.appearance) {
        appearances++;
      }

      if (data.starter) {
        starts++;
      }
    });

    // Awards 조회 (수상 카운트)
    let mvpAwards = 0;
    let topScorerAwards = 0;
    let best11Awards = 0;

    try {
      const awardsQuery = db
        .collection("player_awards")
        .where("playerId", "==", playerId);

      const awardsSnap = await awardsQuery.get();
      awardsSnap.forEach((doc) => {
        const award = doc.data();
        const awardType = award.awardType;

        if (awardType === "mvp") {
          mvpAwards++;
        } else if (awardType === "top_scorer") {
          topScorerAwards++;
        } else if (awardType === "best11") {
          best11Awards++;
        }
      });
    } catch (error) {
      // Awards 조회 실패해도 계속 진행
    }

    // Summary 문서 생성/업데이트
    const summaryRef = db.doc(`player_summary/${playerId}`);

    const now = admin.firestore.Timestamp.now();

    await summaryRef.set(
      {
        id: playerId,
        playerId,
        organizationId: organizationId || null,
        currentTeamId: currentTeamId || null,
        appearances,
        starts,
        totalMinutesPlayed,
        goals,
        assists,
        yellowCards,
        redCards,
        mvpAwards,
        topScorerAwards,
        best11Awards,
        lastMatchAt: lastMatchAt || null,
        updatedAt: now,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    logger.info("✅ [aggregatePlayerSummary] 완료:", {
      playerId,
      goals,
      assists,
      appearances,
    });
  } catch (error: any) {
    logger.error("❌ [aggregatePlayerSummary] 실패:", {
      playerId,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}
