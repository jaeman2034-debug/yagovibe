/**
 * 🔥 팀 경기 생성 시 teamSchedules 자동 생성
 * 
 * Trigger: team_games/{gameId} onCreate
 * 
 * 역할:
 * - 경기 생성 시 teamSchedules에 자동 일정 추가
 * - 팀 일정 캘린더와 경기 기록 연결
 */

import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";

const db = getFirestore();
const logger = functions.logger;

export const onTeamGameCreate = functions.firestore
  .document("team_games/{gameId}")
  .onCreate(async (snap, context) => {
    const { gameId } = context.params;
    const gameData = snap.data();

    logger.info("🔄 [onTeamGameCreate] 경기 생성 감지:", {
      gameId,
      homeTeamId: gameData.homeTeamId,
      awayTeamId: gameData.awayTeamId,
      scheduledAt: gameData.scheduledAt,
    });

    try {
      const { homeTeamId, awayTeamId, scheduledAt, location, homeTeamName, awayTeamName } = gameData;

      if (!scheduledAt) {
        logger.warn("⚠️ [onTeamGameCreate] scheduledAt 없음, 스킵:", { gameId });
        return;
      }

      // 홈팀 일정 생성
      await createTeamSchedule({
        teamId: homeTeamId,
        gameId,
        opponentTeamName: awayTeamName,
        scheduledAt: scheduledAt.toDate(),
        location: location || null,
        isHome: true,
      });

      // 원정팀 일정 생성
      await createTeamSchedule({
        teamId: awayTeamId,
        gameId,
        opponentTeamName: homeTeamName,
        scheduledAt: scheduledAt.toDate(),
        location: location || null,
        isHome: false,
      });

      logger.info("✅ [onTeamGameCreate] 일정 생성 완료:", {
        gameId,
        homeTeamId,
        awayTeamId,
      });
    } catch (error: any) {
      logger.error("❌ [onTeamGameCreate] 일정 생성 실패:", {
        gameId,
        error: error.message,
        stack: error.stack,
      });
      // 에러 발생해도 경기 기록은 유지 (일정만 실패)
    }
  });

/**
 * teamSchedules에 경기 일정 생성
 */
async function createTeamSchedule(params: {
  teamId: string;
  gameId: string;
  opponentTeamName: string;
  scheduledAt: Date;
  location: string | null;
  isHome: boolean;
}): Promise<void> {
  const { teamId, gameId, opponentTeamName, scheduledAt, location, isHome } = params;

  // 일정 제목
  const title = `${isHome ? '홈' : '원정'} vs ${opponentTeamName}`;

  // 시작/종료 시간 (경기는 보통 2시간)
  const startDateTime = new Date(scheduledAt);
  const endDateTime = new Date(scheduledAt);
  endDateTime.setHours(endDateTime.getHours() + 2);

  // 날짜 문자열 (YYYY-MM-DD)
  const date = scheduledAt.toISOString().split('T')[0];

  // 시간 문자열 (HH:mm)
  const startTime = `${String(startDateTime.getHours()).padStart(2, '0')}:${String(startDateTime.getMinutes()).padStart(2, '0')}`;
  const endTime = `${String(endDateTime.getHours()).padStart(2, '0')}:${String(endDateTime.getMinutes()).padStart(2, '0')}`;

  // teamSchedules에 저장
  await db.collection("teamSchedules").add({
    teamId,
    creatorUid: "system", // 시스템 자동 생성
    type: "match",
    title,
    date,
    startTime,
    endTime,
    startDateTime: admin.firestore.Timestamp.fromDate(startDateTime),
    endDateTime: admin.firestore.Timestamp.fromDate(endDateTime),
    locationName: location || "경기장 미정",
    locationLat: null,
    locationLng: null,
    memo: `경기 ID: ${gameId}`,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  logger.info("✅ [createTeamSchedule] 일정 생성:", {
    teamId,
    gameId,
    title,
  });
}
