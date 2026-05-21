/**
 * 🔥 Player Event Summary 집계
 * 
 * 역할:
 * - player_games를 집계하여 player_event_summary 생성/업데이트
 * - 경로: player_event_summaries/{playerId}_{eventId}
 */

import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { admin } from "../firebaseAdmin";

const db = getFirestore();

export async function aggregatePlayerEventSummary(
  playerId: string,
  eventId: string,
  divisionId: string | null
): Promise<void> {
  try {
    // player_games 조회 (playerId + eventId)
    const gamesQuery = db
      .collection("player_games")
      .where("playerId", "==", playerId)
      .where("eventId", "==", eventId);

    const gamesSnap = await gamesQuery.get();

    if (gamesSnap.empty) {
      logger.info("ℹ️ [aggregatePlayerEventSummary] player_games 없음:", {
        playerId,
        eventId,
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
    let seasonId: string | null = null;

    gamesSnap.forEach((doc) => {
      const data = doc.data();

      // 첫 번째 게임에서 기본 정보 추출
      if (!playerName) {
        playerName = data.playerName || "";
        teamId = data.teamId || "";
        teamName = data.teamName || null;
        seasonId = data.seasonId || null;
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

    // Event 정보 조회 (이름 등)
    let eventName: string | null = null;
    try {
      const eventDoc = await db.doc(`events/${eventId}`).get();
      if (eventDoc.exists) {
        eventName = eventDoc.data()?.name || null;
      }
    } catch (error) {
      // Event 조회 실패해도 계속 진행
    }

    // Summary 문서 생성/업데이트
    const summaryId = `${playerId}_${eventId}${divisionId ? `_${divisionId}` : ""}`;
    const summaryRef = db.doc(`player_event_summaries/${summaryId}`);

    const now = admin.firestore.Timestamp.now();

    await summaryRef.set(
      {
        id: summaryId,
        playerId,
        playerName,
        eventId,
        divisionId: divisionId || null,
        seasonId: seasonId || null,
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

    logger.info("✅ [aggregatePlayerEventSummary] 완료:", {
      playerId,
      eventId,
      summaryId,
      goals,
      assists,
      appearances,
    });
  } catch (error: any) {
    logger.error("❌ [aggregatePlayerEventSummary] 실패:", {
      playerId,
      eventId,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}
