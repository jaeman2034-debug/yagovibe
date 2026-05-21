/**
 * 🔥 Leaderboards 업데이트
 * 
 * 역할:
 * - player_event_summaries를 집계하여 leaderboards 생성/업데이트
 * - 경로: leaderboards/{eventId}_{category}
 * - Public Stats 페이지 성능 최적화용
 */

import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { admin } from "../firebaseAdmin";

const db = getFirestore();

type LeaderboardCategory = "goals" | "assists" | "appearances" | "yellow_cards" | "red_cards";

export async function updateLeaderboards(
  eventId: string,
  divisionId: string | null
): Promise<void> {
  try {
    const categories: LeaderboardCategory[] = [
      "goals",
      "assists",
      "appearances",
      "yellow_cards",
      "red_cards",
    ];

    // 각 카테고리별로 리더보드 생성
    for (const category of categories) {
      await updateLeaderboardForCategory(eventId, divisionId, category);
    }

    logger.info("✅ [updateLeaderboards] 완료:", {
      eventId,
      divisionId,
    });
  } catch (error: any) {
    logger.error("❌ [updateLeaderboards] 실패:", {
      eventId,
      divisionId,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

async function updateLeaderboardForCategory(
  eventId: string,
  divisionId: string | null,
  category: LeaderboardCategory
): Promise<void> {
  try {
    // player_event_summaries 조회
    let query = db
      .collection("player_event_summaries")
      .where("eventId", "==", eventId);

    if (divisionId) {
      query = query.where("divisionId", "==", divisionId) as any;
    }

    const summariesSnap = await query.get();

    if (summariesSnap.empty) {
      logger.info("ℹ️ [updateLeaderboardForCategory] player_event_summaries 없음:", {
        eventId,
        category,
      });
      return;
    }

    // 카테고리별 값 추출 및 정렬
    const entries: Array<{
      playerId: string;
      playerName: string;
      teamId: string;
      teamName: string | null;
      value: number;
    }> = [];

    summariesSnap.forEach((doc) => {
      const data = doc.data();
      let value = 0;

      switch (category) {
        case "goals":
          value = data.goals || 0;
          break;
        case "assists":
          value = data.assists || 0;
          break;
        case "appearances":
          value = data.appearances || 0;
          break;
        case "yellow_cards":
          value = data.yellowCards || 0;
          break;
        case "red_cards":
          value = data.redCards || 0;
          break;
      }

      if (value > 0) {
        entries.push({
          playerId: data.playerId,
          playerName: data.playerName || "",
          teamId: data.teamId,
          teamName: data.teamName || null,
          value,
        });
      }
    });

    // 값 기준 내림차순 정렬
    entries.sort((a, b) => b.value - a.value);

    // 순위 부여
    const leaderboard = entries.map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));

    // Leaderboard 문서 생성/업데이트
    const leaderboardId = `${eventId}${divisionId ? `_${divisionId}` : ""}_${category}`;
    const leaderboardRef = db.doc(`leaderboards/${leaderboardId}`);

    const now = admin.firestore.Timestamp.now();

    await leaderboardRef.set(
      {
        id: leaderboardId,
        scope: "event",
        eventId,
        divisionId: divisionId || null,
        category,
        leaderboard,
        updatedAt: now,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    logger.info("✅ [updateLeaderboardForCategory] 완료:", {
      eventId,
      category,
      leaderboardId,
      entryCount: leaderboard.length,
    });
  } catch (error: any) {
    logger.error("❌ [updateLeaderboardForCategory] 실패:", {
      eventId,
      category,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}
