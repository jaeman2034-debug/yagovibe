/**
 * 🔔 Platform Notification Service
 * 
 * 역할:
 * - 스포츠 플랫폼 알림 생성
 * - 팀 멤버 일괄 알림
 * - 알림 템플릿
 */

import {
  collection,
  addDoc,
  serverTimestamp,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Notification, NotificationType } from "@/types/notification";

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  /** FCM 본문 — 없으면 message 사용(푸시 핸들러) */
  body?: string;
  /** 푸시·딥링크 우선 경로(슬래시 시작) */
  link?: string;
  /** 푸시 파이프라인 — `sendPushOnNotificationCreate` */
  status?: "queued" | "sent" | "failed" | "skipped";
  pushDedupKey?: string;
  target?: {
    screen: string;
    id?: string;
    params?: Record<string, string>;
  };
  priority?: "high" | "normal" | "low";
  payload?: Record<string, any>;
  actorId?: string;
  actorName?: string;
  actorPhotoUrl?: string;
  teamId?: string;
  teamName?: string;
}

/**
 * 알림 생성
 */
export async function createNotification(
  params: CreateNotificationParams
): Promise<void> {
  try {
    await addDoc(collection(db, "notifications"), {
      userId: params.userId,
      type: params.type,
      title: params.title,
      message: params.message,
      ...(params.body != null && params.body !== "" && { body: params.body }),
      ...(params.link && { link: params.link }),
      ...(params.status && { status: params.status }),
      ...(params.pushDedupKey && { pushDedupKey: params.pushDedupKey }),
      target: params.target,
      priority: params.priority || "normal",
      payload: params.payload,
      ...(params.actorId && { actorId: params.actorId }),
      ...(params.actorName && { actorName: params.actorName }),
      ...(params.actorPhotoUrl && { actorPhotoUrl: params.actorPhotoUrl }),
      ...(params.teamId && { teamId: params.teamId }),
      ...(params.teamName && { teamName: params.teamName }),
      isRead: false,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("알림 생성 실패:", error);
    throw error;
  }
}

/**
 * 팀 멤버 일괄 알림
 */
export async function notifyTeamMembers(
  teamId: string,
  notification: {
    type: NotificationType;
    title: string;
    message: string;
    target?: {
      screen: string;
      id?: string;
      params?: Record<string, string>;
    };
    priority?: "high" | "normal" | "low";
    payload?: Record<string, any>;
  }
): Promise<void> {
  try {
    // 팀 멤버 조회
    const membersSnapshot = await getDocs(
      collection(db, `teams/${teamId}/members`)
    );

    // 각 멤버에게 알림 생성
    const promises = membersSnapshot.docs.map((doc) =>
      createNotification({
        userId: doc.id,
        teamId,
        ...notification,
      })
    );

    await Promise.all(promises);
  } catch (error) {
    console.error("팀 멤버 알림 실패:", error);
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
  awayScore: number
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
    await createNotification({
      userId: playerId,
      type: "LEADERBOARD_RANK_CHANGED",
      title: "리더보드 순위 변화",
      message: `${categoryLabels[category]} 순위 ${newRank}위로 ${oldRank ? (oldRank > newRank ? "상승" : "하락") : "진입"}했습니다!`,
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
    });
  }
}

/**
 * 수상 발표 알림
 */
export async function notifyAwardAnnounced(
  targetId: string,
  targetType: "player" | "team",
  eventId: string,
  awardType: string,
  title: string
): Promise<void> {
  await createNotification({
    userId: targetId,
    type: "AWARD_ANNOUNCED",
    title: "수상 발표",
    message: `${title}을(를) 수상했습니다!`,
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
  });
}

/**
 * 대회 시작 알림
 */
export async function notifyEventStarted(
  eventId: string,
  eventName: string,
  teamIds: string[]
): Promise<void> {
  const promises = teamIds.map((teamId) =>
    notifyTeamMembers(teamId, {
      type: "EVENT_STARTED",
      title: "대회 시작",
      message: `${eventName}이(가) 시작되었습니다!`,
      target: {
        screen: "event",
        id: eventId,
      },
      priority: "high",
    })
  );

  await Promise.all(promises);
}
