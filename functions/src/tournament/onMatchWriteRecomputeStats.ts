/**
 * 🔥 대시보드 집계 트리거
 * Phase 1-4: match/checkin 변동 시 stats 문서 재계산
 * 
 * - 홈 화면에서 "오늘 경기/미배정 심판/미검인 선수" 즉시 노출 가능
 */

import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { recomputeDailyStatsForTournament } from "../lib/tournamentStats";
import * as admin from "firebase-admin";

const db = admin.firestore();

/**
 * 경기 작성/수정 시 통계 재계산
 */
export const onMatchWriteRecomputeStats = onDocumentWritten(
  {
    region: "asia-northeast3",
    document: "associations/{associationId}/tournaments/{tournamentId}/matches/{matchId}",
  },
  async (event) => {
    const associationId = event.params.associationId as string;
    const tournamentId = event.params.tournamentId as string;

    // 변경된 match의 date 기준 날짜키를 잡거나, 안전하게 오늘+내일 정도 재계산도 가능
    await recomputeDailyStatsForTournament(db, associationId, tournamentId);
  }
);

/**
 * 검인 기록 작성 시 통계 재계산
 */
export const onCheckinWriteRecomputeStats = onDocumentWritten(
  {
    region: "asia-northeast3",
    document:
      "associations/{associationId}/tournaments/{tournamentId}/matches/{matchId}/checkins/{checkinId}",
  },
  async (event) => {
    const associationId = event.params.associationId as string;
    const tournamentId = event.params.tournamentId as string;

    await recomputeDailyStatsForTournament(db, associationId, tournamentId);
  }
);

