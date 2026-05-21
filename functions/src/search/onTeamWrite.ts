/**
 * 🔥 Team 작성 시 Search Index 업데이트
 * 
 * Trigger: teams/{teamId} onWrite
 * 
 * 역할:
 * - search_index에 팀 정보 업데이트
 */

import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions/v2";
import { getFirestore } from "firebase-admin/firestore";
import { admin } from "../firebaseAdmin";
import { generateSearchKeywords, normalizeSearchText } from "../utils/searchUtils";

const db = getFirestore();

export const onTeamWrite = onDocumentWritten(
  {
    document: "teams/{teamId}",
    region: "asia-northeast3",
  },
  async (event) => {
    const { teamId } = event.params;
    const after = event.data?.after?.data();

    // 삭제된 경우 search_index에서도 삭제
    if (!after) {
      try {
        await db.doc(`search_index/team_${teamId}`).delete();
        logger.info("✅ [onTeamWrite] search_index 삭제 완료:", { teamId });
      } catch (error: any) {
        logger.error("❌ [onTeamWrite] search_index 삭제 실패:", {
          teamId,
          error: error.message,
        });
      }
      return;
    }

    const { name, region, organizationId, logoUrl, isActive } = after;

    if (!name) {
      logger.warn("⚠️ [onTeamWrite] 팀명 없음, 스킵:", { teamId });
      return;
    }

    logger.info("🔄 [onTeamWrite] Search Index 업데이트 시작:", { teamId, name });

    try {
      // team_summary 조회
      const summarySnap = await db.doc(`team_summary/${teamId}`).get();
      const summary = summarySnap.exists ? summarySnap.data()! : {};

      // 검색 키워드 생성
      const searchName = normalizeSearchText(name);
      const searchKeywords = generateSearchKeywords(name);

      // search_index 업데이트
      const searchIndexRef = db.doc(`search_index/team_${teamId}`);

      await searchIndexRef.set(
        {
          entityType: "team",
          entityId: teamId,
          title: name,
          subtitle: region || "",
          imageUrl: logoUrl || "",
          url: `/public/teams/${teamId}`,
          organizationId: organizationId || null,
          searchName,
          searchKeywords,
          stats: {
            matches: summary.matches || 0,
            wins: summary.wins || 0,
            goals: summary.goalsFor || 0,
          },
          isActive: isActive ?? true,
          updatedAt: admin.firestore.Timestamp.now(),
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      logger.info("✅ [onTeamWrite] Search Index 업데이트 완료:", { teamId });
    } catch (error: any) {
      logger.error("❌ [onTeamWrite] Search Index 업데이트 실패:", {
        teamId,
        error: error.message,
        stack: error.stack,
      });
    }
  }
);
