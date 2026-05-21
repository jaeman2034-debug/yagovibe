/**
 * 🔥 Player 작성 시 Search Index 업데이트
 * 
 * Trigger: users/{playerId} onWrite (선수는 users 컬렉션에 저장)
 * 
 * 역할:
 * - search_index에 선수 정보 업데이트
 */

import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions/v2";
import { getFirestore } from "firebase-admin/firestore";
import { admin } from "../firebaseAdmin";
import { generateSearchKeywords, normalizeSearchText } from "../utils/searchUtils";

const db = getFirestore();

export const onPlayerWrite = onDocumentWritten(
  {
    document: "users/{playerId}",
    region: "asia-northeast3",
  },
  async (event) => {
    const { playerId } = event.params;
    const after = event.data?.after?.data();

    // 삭제된 경우 search_index에서도 삭제
    if (!after) {
      try {
        await db.doc(`search_index/player_${playerId}`).delete();
        logger.info("✅ [onPlayerWrite] search_index 삭제 완료:", { playerId });
      } catch (error: any) {
        logger.error("❌ [onPlayerWrite] search_index 삭제 실패:", {
          playerId,
          error: error.message,
        });
      }
      return;
    }

    const playerName =
      after.displayName || after.name || after.nickname || after.email?.split("@")[0] || "";

    if (!playerName) {
      logger.warn("⚠️ [onPlayerWrite] 선수명 없음, 스킵:", { playerId });
      return;
    }

    logger.info("🔄 [onPlayerWrite] Search Index 업데이트 시작:", { playerId, playerName });

    try {
      // player_summary 조회
      const summarySnap = await db.doc(`player_summary/${playerId}`).get();
      const summary = summarySnap.exists ? summarySnap.data()! : {};

      // 현재 팀 정보 조회
      let currentTeamName = "";
      if (summary.currentTeamId) {
        const teamSnap = await db.doc(`teams/${summary.currentTeamId}`).get();
        if (teamSnap.exists) {
          currentTeamName = teamSnap.data()!.name || "";
        }
      }

      const position = after.position || after.primaryPosition || "";
      const subtitle = `${position || "-"} · ${currentTeamName || "무소속"}`;

      // 검색 키워드 생성
      const searchName = normalizeSearchText(playerName);
      const searchKeywords = generateSearchKeywords(playerName);

      // search_index 업데이트
      const searchIndexRef = db.doc(`search_index/player_${playerId}`);

      await searchIndexRef.set(
        {
          entityType: "player",
          entityId: playerId,
          title: playerName,
          subtitle,
          imageUrl: after.photoURL || after.profileImageUrl || "",
          url: `/public/players/${playerId}`,
          searchName,
          searchKeywords,
          stats: {
            appearances: summary.appearances || 0,
            goals: summary.goals || 0,
            assists: summary.assists || 0,
          },
          isActive: after.isActive ?? true,
          updatedAt: admin.firestore.Timestamp.now(),
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      logger.info("✅ [onPlayerWrite] Search Index 업데이트 완료:", { playerId });
    } catch (error: any) {
      logger.error("❌ [onPlayerWrite] Search Index 업데이트 실패:", {
        playerId,
        error: error.message,
        stack: error.stack,
      });
    }
  }
);
