/**
 * 🔥 Match Result 작성 시 자동 집계
 * 
 * Trigger: event_matches/{matchId} onUpdate
 * 
 * 역할:
 * 1. team_event_summary 업데이트 (홈/원정 각각)
 * 2. team_summary 업데이트 (홈/원정 각각)
 * 3. team_match_history 생성 (홈/원정 각각)
 * 
 * 조건: status === "completed"일 때만 실행
 */

import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions/v2";
import { getFirestore } from "firebase-admin/firestore";
import { aggregateTeamEventSummary } from "./aggregateTeamEventSummary";
import { aggregateTeamSummary } from "./aggregateTeamSummary";
import { createTeamMatchHistory } from "./createTeamMatchHistory";

const db = getFirestore();

export const onMatchResultWrite = onDocumentUpdated(
  {
    document: "event_matches/{matchId}",
    region: "asia-northeast3",
  },
  async (event) => {
    const { matchId } = event.params;
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();

    if (!after) {
      logger.info("ℹ️ [onMatchResultWrite] event_match 삭제됨, 스킵:", { matchId });
      return;
    }

    // completed 상태로 변경된 경우만 처리
    const wasCompleted = before?.status === "completed";
    const isCompleted = after.status === "completed";

    if (!isCompleted || wasCompleted) {
      logger.info("ℹ️ [onMatchResultWrite] completed 상태가 아니거나 이미 처리됨:", {
        matchId,
        beforeStatus: before?.status,
        afterStatus: after.status,
      });
      return;
    }

    // 점수 검증
    if (after.homeScore === null || after.awayScore === null) {
      logger.warn("⚠️ [onMatchResultWrite] 점수 정보 없음:", {
        matchId,
        homeScore: after.homeScore,
        awayScore: after.awayScore,
      });
      return;
    }

    const { eventId, divisionId, homeTeamId, awayTeamId } = after;

    if (!eventId || !homeTeamId || !awayTeamId) {
      logger.warn("⚠️ [onMatchResultWrite] 필수 필드 누락:", {
        matchId,
        eventId,
        homeTeamId,
        awayTeamId,
      });
      return;
    }

    logger.info("🔄 [onMatchResultWrite] Match Result 집계 시작:", {
      matchId,
      eventId,
      homeTeamId,
      awayTeamId,
    });

    try {
      // 홈/원정팀 각각 집계
      await Promise.all([
        // 홈팀 집계
        aggregateTeamEventSummary(homeTeamId, eventId, divisionId || null),
        aggregateTeamSummary(homeTeamId),
        createTeamMatchHistory(after, homeTeamId, true),

        // 원정팀 집계
        aggregateTeamEventSummary(awayTeamId, eventId, divisionId || null),
        aggregateTeamSummary(awayTeamId),
        createTeamMatchHistory(after, awayTeamId, false),
      ]);

      logger.info("✅ [onMatchResultWrite] Match Result 집계 완료:", {
        matchId,
        homeTeamId,
        awayTeamId,
      });
    } catch (error: any) {
      logger.error("❌ [onMatchResultWrite] 집계 실패:", {
        matchId,
        error: error.message,
        stack: error.stack,
      });
      // 에러 발생해도 원본 데이터는 유지
    }
  }
);
