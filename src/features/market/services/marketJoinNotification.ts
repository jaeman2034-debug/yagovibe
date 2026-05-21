/**
 * 🔥 매칭 참여 알림 시스템 (운영 안정화)
 * 
 * 역할:
 * - 승인 시 참여자에게 알림
 * - 거절(FULL) 시 자동 안내
 * - 채팅방 연결 알림
 */

import { createNotification } from "@/lib/notifications/createNotification";
import type { NotificationType } from "@/types/notification";

/** 호스트(작성자) 스냅샷 — 게시글에 있는 값 우선 */
export type JoinNotifyActorContext = {
  actorId?: string;
  actorName?: string;
  actorPhotoUrl?: string;
  teamId?: string;
  teamName?: string;
};

/**
 * 승인 알림 발송
 * 
 * @param userId - 참여자 UID
 * @param postId - 게시글 ID
 * @param postTitle - 게시글 제목
 * @param chatRoomId - 채팅방 ID (선택)
 */
export async function notifyJoinApproved(
  userId: string,
  postId: string,
  postTitle: string,
  chatRoomId?: string,
  actor?: JoinNotifyActorContext
): Promise<void> {
  try {
    console.log("🔔 [notifyJoinApproved] 알림 발송 시작:", {
      userId,
      postId,
      chatRoomId,
    });

    const host = actor?.actorName?.trim();
    const body = host
      ? `${host}님이 "${postTitle}" 참여를 승인했습니다. 채팅방이 열렸습니다.`
      : `"${postTitle}" 매칭 참여가 승인되었습니다. 채팅방이 열렸습니다.`;

    await createNotification({
      userId,
      type: "MARKET_JOIN_APPROVED" as NotificationType,
      title: "매칭 참여 승인",
      message: body,
      target: chatRoomId
        ? {
            screen: "chat",
            id: chatRoomId,
          }
        : {
            screen: "market",
            id: postId,
          },
      priority: "high",
      ...(actor?.actorId && { actorId: actor.actorId }),
      ...(actor?.actorName && { actorName: actor.actorName }),
      ...(actor?.actorPhotoUrl && { actorPhotoUrl: actor.actorPhotoUrl }),
      ...(actor?.teamId && { teamId: actor.teamId }),
      ...(actor?.teamName && { teamName: actor.teamName }),
      payload: {
        postId,
        chatRoomId,
        type: "join_approved",
      },
    });

    console.log("✅ [notifyJoinApproved] 알림 발송 완료:", { userId, postId });
  } catch (error: any) {
    console.error("❌ [notifyJoinApproved] 알림 발송 실패:", {
      userId,
      postId,
      error: error.message,
    });
    // 알림 실패해도 메인 로직은 계속 진행 (Fail-safe)
  }
}

/**
 * 자동 거절 알림 발송 (FULL)
 * 
 * @param userId - 참여자 UID
 * @param postId - 게시글 ID
 * @param postTitle - 게시글 제목
 */
export async function notifyJoinAutoRejected(
  userId: string,
  postId: string,
  postTitle: string,
  actor?: JoinNotifyActorContext
): Promise<void> {
  try {
    console.log("🔔 [notifyJoinAutoRejected] 알림 발송 시작:", {
      userId,
      postId,
    });

    await createNotification({
      userId,
      type: "MARKET_JOIN_REJECTED" as NotificationType,
      title: "매칭 참여 자동 거절",
      message: `"${postTitle}" 매칭이 모집 인원이 마감되어 자동 거절되었습니다.`,
      target: {
        screen: "market",
        id: postId,
      },
      priority: "normal",
      ...(actor?.actorId && { actorId: actor.actorId }),
      ...(actor?.actorName && { actorName: actor.actorName }),
      ...(actor?.actorPhotoUrl && { actorPhotoUrl: actor.actorPhotoUrl }),
      ...(actor?.teamId && { teamId: actor.teamId }),
      ...(actor?.teamName && { teamName: actor.teamName }),
      payload: {
        postId,
        reason: "FULL_AUTO",
        type: "join_auto_rejected",
      },
    });

    console.log("✅ [notifyJoinAutoRejected] 알림 발송 완료:", { userId, postId });
  } catch (error: any) {
    console.error("❌ [notifyJoinAutoRejected] 알림 발송 실패:", {
      userId,
      postId,
      error: error.message,
    });
    // 알림 실패해도 메인 로직은 계속 진행 (Fail-safe)
  }
}

/**
 * 수동 거절 알림 발송
 * 
 * @param userId - 참여자 UID
 * @param postId - 게시글 ID
 * @param postTitle - 게시글 제목
 */
export async function notifyJoinRejected(
  userId: string,
  postId: string,
  postTitle: string,
  actor?: JoinNotifyActorContext
): Promise<void> {
  try {
    console.log("🔔 [notifyJoinRejected] 알림 발송 시작:", {
      userId,
      postId,
    });

    const host = actor?.actorName?.trim();
    const body = host
      ? `${host}님이 "${postTitle}" 매칭 참여를 거절했습니다.`
      : `"${postTitle}" 매칭 참여가 거절되었습니다.`;

    await createNotification({
      userId,
      type: "MARKET_JOIN_REJECTED" as NotificationType,
      title: "매칭 참여 거절",
      message: body,
      target: {
        screen: "market",
        id: postId,
      },
      priority: "normal",
      ...(actor?.actorId && { actorId: actor.actorId }),
      ...(actor?.actorName && { actorName: actor.actorName }),
      ...(actor?.actorPhotoUrl && { actorPhotoUrl: actor.actorPhotoUrl }),
      ...(actor?.teamId && { teamId: actor.teamId }),
      ...(actor?.teamName && { teamName: actor.teamName }),
      payload: {
        postId,
        reason: "MANUAL_REJECT",
        type: "join_rejected",
      },
    });

    console.log("✅ [notifyJoinRejected] 알림 발송 완료:", { userId, postId });
  } catch (error: any) {
    console.error("❌ [notifyJoinRejected] 알림 발송 실패:", {
      userId,
      postId,
      error: error.message,
    });
    // 알림 실패해도 메인 로직은 계속 진행 (Fail-safe)
  }
}
