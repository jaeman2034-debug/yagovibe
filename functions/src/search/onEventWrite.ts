/**
 * 🔥 Event 작성 시 Search Index 업데이트
 * 
 * Trigger: events/{eventId} onWrite
 * 
 * 역할:
 * - search_index에 대회 정보 업데이트
 */

import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions/v2";
import { getFirestore } from "firebase-admin/firestore";
import { admin } from "../firebaseAdmin";
import { generateSearchKeywords, normalizeSearchText } from "../utils/searchUtils";

const db = getFirestore();

export const onEventWrite = onDocumentWritten(
  {
    document: "events/{eventId}",
    region: "asia-northeast3",
  },
  async (event) => {
    const { eventId } = event.params;
    const after = event.data?.after?.data();

    // 삭제된 경우 search_index에서도 삭제
    if (!after) {
      try {
        await db.doc(`search_index/event_${eventId}`).delete();
        logger.info("✅ [onEventWrite] search_index 삭제 완료:", { eventId });
      } catch (error: any) {
        logger.error("❌ [onEventWrite] search_index 삭제 실패:", {
          eventId,
          error: error.message,
        });
      }
      return;
    }

    const { name, status, organizationId, startDate, endDate } = after;

    if (!name) {
      logger.warn("⚠️ [onEventWrite] 대회명 없음, 스킵:", { eventId });
      return;
    }

    logger.info("🔄 [onEventWrite] Search Index 업데이트 시작:", { eventId, name });

    try {
      // event_stats_summary 조회
      const summarySnap = await db.doc(`event_stats_summary/${eventId}`).get();
      const summary = summarySnap.exists ? summarySnap.data()! : {};

      const subtitle = status === "ongoing" ? "진행중" : status === "completed" ? "완료" : "예정";

      // 검색 키워드 생성
      const searchName = normalizeSearchText(name);
      const searchKeywords = generateSearchKeywords(name);

      // search_index 업데이트
      const searchIndexRef = db.doc(`search_index/event_${eventId}`);

      await searchIndexRef.set(
        {
          entityType: "event",
          entityId: eventId,
          title: name,
          subtitle,
          imageUrl: "",
          url: `/events/${eventId}`,
          organizationId: organizationId || null,
          searchName,
          searchKeywords,
          stats: {
            matches: summary.totalMatches || summary.completedMatches || 0,
          },
          isActive: status !== "canceled",
          updatedAt: admin.firestore.Timestamp.now(),
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      logger.info("✅ [onEventWrite] Search Index 업데이트 완료:", { eventId });
    } catch (error: any) {
      logger.error("❌ [onEventWrite] Search Index 업데이트 실패:", {
        eventId,
        error: error.message,
        stack: error.stack,
      });
    }
  }
);
