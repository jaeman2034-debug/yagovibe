/**
 * 🔥 Event Entry 승인 시 자동 처리
 * 
 * Trigger: event_entries/{entryId} onUpdate
 * 
 * 역할:
 * 1. team_event_summary 초기화
 * 2. Event 참가 팀 수 업데이트
 * 
 * 핵심 원칙: 승인될 때만 실행
 */

import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";

const logger = functions.logger;

export const onEventEntryApproved = functions.firestore
  .document("event_entries/{entryId}")
  .onUpdate(async (change, context) => {
    const db = getFirestore();
    
    const { entryId } = context.params;
    const before = change.before.exists ? change.before.data() : null;
    const after = change.after.exists ? change.after.data() : null;

    if (!before || !after) {
      logger.warn("⚠️ [onEventEntryApproved] 문서가 없음:", { entryId });
      return;
    }

    logger.info("🔄 [onEventEntryApproved] Event Entry 변경 감지:", {
      entryId,
      beforeStatus: before.applicationStatus,
      afterStatus: after.applicationStatus,
    });

    try {
      // 승인될 때만 실행
      if (
        before.applicationStatus === "approved" ||
        after.applicationStatus !== "approved"
      ) {
        logger.info("ℹ️ [onEventEntryApproved] 승인 상태가 아니거나 이미 처리됨:", {
          entryId,
          beforeStatus: before.applicationStatus,
          afterStatus: after.applicationStatus,
        });
        return;
      }

      const {
        eventId,
        divisionId,
        teamId,
        teamName,
        seasonId,
      } = after;

      logger.info("✅ [onEventEntryApproved] Event Entry 승인, 처리 시작:", {
        entryId,
        eventId,
        teamId,
      });

      // team_event_summary 초기화
      const summaryId = `summary_${teamId}_${eventId}_${divisionId || "all"}`;
      const summaryRef = db.doc(`team_event_summaries/${summaryId}`);

      await summaryRef.set({
        teamId,
        eventId,
        divisionId: divisionId || null,
        seasonId: seasonId || null,
        teamName,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDiff: 0,
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now(),
      }, { merge: true });

      logger.info("✅ [onEventEntryApproved] team_event_summary 초기화 완료:", {
        entryId,
        teamId,
        eventId,
      });

      // Event 참가 팀 수 업데이트 (선택적)
      // 필요시 event 문서의 teamCount 필드 업데이트
    } catch (error: any) {
      logger.error("❌ [onEventEntryApproved] 처리 실패:", {
        entryId,
        error: error.message,
        stack: error.stack,
      });
    }
  });
