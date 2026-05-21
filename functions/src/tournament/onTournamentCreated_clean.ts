/**
 * 🔥 대회 게시 시 자동 시스템 공지 생성
 * 
 * 원칙:
 * - 대회 게시 = 공식 사건 발생 = 기록으로 남아야 함
 * - 시스템 자동 생성 공지는 "시간의 기록"
 * - 운영 공지(사람용)와 시스템 공지(자동 기록) 분리
 * 
 * 트리거 조건 (엄격):
 * ✅ adminStatus: "published"
 * ✅ isOfficial: true
 * ✅ systemNotices.TOURNAMENT_CREATED 없음 (최초 1회만)
 */

import { onDocumentCreated, onDocumentUpdated } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions/v2";
import { triggerTournamentCreated, triggerDrawCompleted, triggerReviewCompleted } from "./systemNoticeTriggers";

/**
 * 대회 생성 시 자동 시스템 공지 생성 (생성 시점에 이미 published인 경우)
 */
export const onTournamentCreated = onDocumentCreated(
  {
    document: "associations/{associationId}/tournaments/{tournamentId}",
    region: "asia-northeast3",
  },
  async (event) => {
    try {
      const { associationId, tournamentId } = event.params;
      const tournament = event.data?.data() as any;

      if (!tournament) {
        logger.warn("⚠️ 대회 데이터가 없습니다:", tournamentId);
        return;
      }

      // 🔥 트리거 조건 체크 (엄격)
      if (tournament.adminStatus !== "published") {
        logger.info("⏭️ 대회가 아직 게시되지 않음:", { tournamentId, adminStatus: tournament.adminStatus });
        return;
      }

      if (!tournament.isOfficial) {
        logger.info("⏭️ 공식 기준 대회가 아님:", { tournamentId, isOfficial: tournament.isOfficial });
        return;
      }

      // 중복 체크 (새로운 스키마: systemNotices)
      const systemNotices = tournament.systemNotices || {};
      if (systemNotices.TOURNAMENT_CREATED) {
        logger.info("⏭️ 이미 시스템 공지가 생성됨:", { tournamentId });
        return;
      }

      logger.info("🔥 대회 생성 감지 (published 상태), 시스템 공지 생성 시작:", { associationId, tournamentId });
      
      // 🔥 헬퍼 함수 사용
      await triggerTournamentCreated(associationId, tournamentId, tournament);
    } catch (error: any) {
      logger.error("❌ 시스템 공지 생성 오류:", {
        tournamentId: event.params.tournamentId,
        error: error.message,
        stack: error.stack,
      });
      // 오류가 발생해도 대회 생성은 성공한 상태이므로 throw하지 않음
    }
  }
);

/**
 * 대회 업데이트 시 자동 시스템 공지 생성
 * 
 * 처리하는 이벤트:
 * ① draft → published 변경 (TOURNAMENT_CREATED)
 * ⑥ drawExecuted 변경 (DRAW_COMPLETED)
 * ⑤ 검수 기간 종료 체크 (REVIEW_COMPLETED)
 */
export const onTournamentUpdated = onDocumentUpdated(
  {
    document: "associations/{associationId}/tournaments/{tournamentId}",
    region: "asia-northeast3",
  },
  async (event) => {
    try {
      const { associationId, tournamentId } = event.params;
      const before = event.data?.before.data() as any;
      const after = event.data?.after.data() as any;

      if (!before || !after) {
        return;
      }

      // 🔥 ① draft → published 변경 감지 (TOURNAMENT_CREATED)
      if (before.adminStatus !== "published" && after.adminStatus === "published") {
        if (after.isOfficial) {
          const systemNotices = after.systemNotices || {};
          if (!systemNotices.TOURNAMENT_CREATED) {
            logger.info("🔥 대회 게시 감지 (draft → published), 시스템 공지 생성 시작:", { associationId, tournamentId });
            await triggerTournamentCreated(associationId, tournamentId, after);
          }
        }
      }

      // 🔥 ⑥ drawExecuted 변경 감지 (DRAW_COMPLETED)
      if (before.drawExecuted !== after.drawExecuted && after.drawExecuted === true) {
        if (after.isOfficial) {
          logger.info("🔥 조 추첨 완료 감지, 시스템 공지 생성 시작:", { associationId, tournamentId });
          await triggerDrawCompleted(associationId, tournamentId, after, before);
        }
      }

      // 🔥 ⑤ 검수 기간 종료 체크 (REVIEW_COMPLETED) - 매일 스케줄러가 처리하지만, 여기서도 즉시 체크
      if (after.isOfficial && after.reviewPeriod?.endDate) {
        const endDate = after.reviewPeriod.endDate.toDate
          ? after.reviewPeriod.endDate.toDate()
          : new Date(after.reviewPeriod.endDate);
        const now = new Date();
        if (endDate <= now) {
          await triggerReviewCompleted(associationId, tournamentId, after);
        }
      }
    } catch (error: any) {
      logger.error("❌ 대회 업데이트 트리거 오류:", {
        tournamentId: event.params.tournamentId,
        error: error.message,
        stack: error.stack,
      });
    }
  }
);

