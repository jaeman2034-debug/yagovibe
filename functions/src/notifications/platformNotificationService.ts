/**
 * 🔔 Platform Notification Service (Cloud Functions)
 * 
 * 역할:
 * - 스포츠 플랫폼 알림 생성
 * - Firestore notifications 저장
 * - FCM 푸시 알림 전송 (선택적)
 */

import { getFirestore } from "firebase-admin/firestore";
import * as admin from "firebase-admin";
import { logger } from "firebase-functions/v2";

const db = getFirestore();

export type PlatformNotificationType =
  | "MATCH_RESULT_UPDATED"
  | "MATCH_STARTED"
  | "MATCH_COMPLETED"
  | "PLAYER_STATS_UPDATED"
  | "LEADERBOARD_RANK_CHANGED"
  | "EVENT_STARTED"
  | "EVENT_COMPLETED"
  | "AWARD_ANNOUNCED"
  | "TEAM_MATCH_SCHEDULED"
  | "TEAM_MATCH_REMINDER"
  | "PLAYER_ACHIEVEMENT"
  | "TEAM_RANKING_UPDATED";

interface CreateNotificationParams {
  userId: string;
  type: PlatformNotificationType;
  title: string;
  message: string;
  target?: {
    screen: string;
    id?: string;
    params?: Record<string, string>;
  };
  priority?: "high" | "normal" | "low";
  payload?: Record<string, any>;
  organizationId?: string;
  eventId?: string;
}

/**
 * 알림 생성
 */
export async function createNotification(
  params: CreateNotificationParams
): Promise<void> {
  try {
    await db.collection("notifications").add({
      userId: params.userId,
      type: params.type,
      title: params.title,
      message: params.message,
      target: params.target,
      priority: params.priority || "normal",
      payload: params.payload,
      isRead: false,
      organizationId: params.organizationId || null,
      eventId: params.eventId || null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    logger.info("✅ [createNotification] 알림 생성 완료:", {
      userId: params.userId,
      type: params.type,
    });
  } catch (error: any) {
    logger.error("❌ [createNotification] 알림 생성 실패:", {
      userId: params.userId,
      type: params.type,
      error: error.message,
    });
    throw error;
  }
}

/**
 * 팀 멤버 일괄 알림
 */
export async function notifyTeamMembers(
  teamId: string,
  notification: {
    type: PlatformNotificationType;
    title: string;
    message: string;
    target?: {
      screen: string;
      id?: string;
      params?: Record<string, string>;
    };
    priority?: "high" | "normal" | "low";
    payload?: Record<string, any>;
    organizationId?: string;
    eventId?: string;
  }
): Promise<void> {
  try {
    // 팀 멤버 조회
    const membersSnapshot = await db
      .collection(`teams/${teamId}/members`)
      .get();

    if (membersSnapshot.empty) {
      logger.info("ℹ️ [notifyTeamMembers] 팀 멤버 없음:", { teamId });
      return;
    }

    // 각 멤버에게 알림 생성
    const promises = membersSnapshot.docs.map((doc) =>
      createNotification({
        userId: doc.id,
        ...notification,
      })
    );

    await Promise.all(promises);

    logger.info("✅ [notifyTeamMembers] 팀 멤버 알림 완료:", {
      teamId,
      memberCount: membersSnapshot.docs.length,
    });
  } catch (error: any) {
    logger.error("❌ [notifyTeamMembers] 팀 멤버 알림 실패:", {
      teamId,
      error: error.message,
    });
    throw error;
  }
}

/**
 * 경기 결과 업데이트 알림
 */
export async function notifyMatchResultUpdated(
  matchId: string,
  homeTeamId: string,
  awayTeamId: string,
  homeTeamName: string,
  awayTeamName: string,
  homeScore: number,
  awayScore: number,
  eventId?: string
): Promise<void> {
  const message = `${homeTeamName} ${homeScore} : ${awayScore} ${awayTeamName}`;

  // 홈 팀 알림
  await notifyTeamMembers(homeTeamId, {
    type: "MATCH_RESULT_UPDATED",
    title: "경기 결과 업데이트",
    message,
    target: {
      screen: "match",
      id: matchId,
    },
    priority: "high",
    eventId,
  });

  // 원정 팀 알림
  await notifyTeamMembers(awayTeamId, {
    type: "MATCH_RESULT_UPDATED",
    title: "경기 결과 업데이트",
    message,
    target: {
      screen: "match",
      id: matchId,
    },
    priority: "high",
    eventId,
  });
}

/**
 * 경기 완료 알림
 */
export async function notifyMatchCompleted(
  matchId: string,
  homeTeamId: string,
  awayTeamId: string,
  homeTeamName: string,
  awayTeamName: string,
  homeScore: number,
  awayScore: number,
  eventId?: string
): Promise<void> {
  const message = `${homeTeamName} ${homeScore} : ${awayScore} ${awayTeamName} 경기 종료`;

  // 홈 팀 알림
  await notifyTeamMembers(homeTeamId, {
    type: "MATCH_COMPLETED",
    title: "경기 완료",
    message,
    target: {
      screen: "match",
      id: matchId,
    },
    priority: "high",
    eventId,
  });

  // 원정 팀 알림
  await notifyTeamMembers(awayTeamId, {
    type: "MATCH_COMPLETED",
    title: "경기 완료",
    message,
    target: {
      screen: "match",
      id: matchId,
    },
    priority: "high",
    eventId,
  });
}

/**
 * 수상 발표 알림
 */
export async function notifyAwardAnnounced(
  targetId: string,
  targetType: "player" | "team",
  eventId: string,
  awardType: string,
  title: string,
  eventName?: string
): Promise<void> {
  const message = eventName
    ? `${eventName} ${title}을(를) 수상했습니다!`
    : `${title}을(를) 수상했습니다!`;

  await createNotification({
    userId: targetId,
    type: "AWARD_ANNOUNCED",
    title: "수상 발표",
    message,
    target: {
      screen: targetType === "player" ? "player" : "team",
      id: targetId,
      params: {
        eventId,
      },
    },
    priority: "high",
    payload: {
      eventId,
      awardType,
    },
    eventId,
  });
}

/**
 * 리더보드 순위 변화 알림
 */
export async function notifyLeaderboardRankChanged(
  playerId: string,
  eventId: string,
  category: "goals" | "assists" | "appearances",
  newRank: number,
  oldRank?: number
): Promise<void> {
  const categoryLabels: Record<string, string> = {
    goals: "득점",
    assists: "도움",
    appearances: "출전",
  };

  // Top 3 진입 시에만 알림
  if (newRank <= 3) {
    const rankChange =
      oldRank !== undefined
        ? oldRank > newRank
          ? "상승"
          : oldRank < newRank
          ? "하락"
          : "유지"
        : "진입";

    await createNotification({
      userId: playerId,
      type: "LEADERBOARD_RANK_CHANGED",
      title: "리더보드 순위 변화",
      message: `${categoryLabels[category]} 순위 ${newRank}위로 ${rankChange}했습니다!`,
      target: {
        screen: "leaderboard",
        id: `${eventId}_${category}`,
      },
      priority: "high",
      payload: {
        eventId,
        category,
        rank: newRank,
        oldRank,
      },
      eventId,
    });
  }
}
