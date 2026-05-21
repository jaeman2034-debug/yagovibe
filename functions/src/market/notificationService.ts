/**
 * 🔔 알림 서비스 (완성본 세트)
 * 
 * 역할:
 * - 승인/취소/거절 알림 발송
 * - 중복 발송 방지
 * - 일관된 알림 구조
 */

import * as admin from "firebase-admin";
import { admin as firebaseAdmin } from "../firebaseAdmin";
import { logger } from "firebase-functions/v2";
import { sendNotificationToUser } from "../sendUserNotification";
import { log, logError, logMetric } from "../utils/logger";

const db = firebaseAdmin.firestore();

/**
 * 🔔 알림 발송 (완성본 세트)
 * 
 * @param userId - 받는 사람 UID
 * @param type - 알림 타입
 * @param title - 알림 제목
 * @param body - 알림 내용
 * @param link - 이동 경로
 * @param idempotencyKey - 중복 방지 키 (선택)
 */
export async function sendNotification({
  userId,
  type,
  title,
  body,
  link,
  idempotencyKey,
  actorId,
  actorName,
  actorPhotoUrl,
  teamId,
  teamName,
}: {
  userId: string;
  type: "approved" | "message" | "cancelled" | "rejected" | "new_member" | "kicked" | "closed";
  title: string;
  body: string;
  link: string;
  idempotencyKey?: string;
  actorId?: string;
  actorName?: string;
  actorPhotoUrl?: string;
  teamId?: string;
  teamName?: string;
}): Promise<string | null> {
  try {
    log("NOTIFICATION_START", { userId, type, title });

    // 🔥 중복 방지: idempotencyKey가 있으면 체크
    if (idempotencyKey) {
      const existingNotiSnap = await db
        .collection("notifications")
        .where("userId", "==", userId)
        .where("type", "==", type.toUpperCase())
        .where("payload.idempotencyKey", "==", idempotencyKey)
        .limit(1)
        .get();

      if (!existingNotiSnap.empty) {
        log("NOTIFICATION_DUPLICATE", { userId, type, idempotencyKey });
        return existingNotiSnap.docs[0].id;
      }
    }

    // 🔥 알림 생성 (기존 구조 호환)
    const notificationRef = await db.collection("notifications").add({
      userId,
      type: type === "approved" ? "MARKET_JOIN_APPROVED" 
        : type === "cancelled" ? "MARKET_JOIN_CANCELLED"
        : type === "rejected" ? "MARKET_JOIN_REJECTED"
        : type === "new_member" ? "RECRUIT_NEW_MEMBER"
        : type === "kicked" ? "RECRUIT_KICKED"
        : type === "closed" ? "RECRUIT_CLOSED"
        : "MARKET_MESSAGE", // 기존 타입 구조 호환
      title,
      message: body, // 기존 구조 호환
      body, // 새 구조
      ...(actorId && { actorId }),
      ...(actorName && { actorName }),
      ...(actorPhotoUrl && { actorPhotoUrl }),
      ...(teamId && { teamId }),
      ...(teamName && { teamName }),
      target: {
        screen: link.startsWith("/app/chat/") || link.startsWith("/chat/") ? "chat" : "market",
        id: link.split("/").pop() || "",
      },
      link, // 하위 호환
      priority: type === "approved" ? "high" : "normal",
      isRead: false,
      payload: {
        ...(idempotencyKey && { idempotencyKey }),
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    log("NOTIFICATION_CREATED", { notificationId: notificationRef.id, userId, type });

    // 🔥 FCM 푸시 알림 발송 (완성본 세트)
    try {
      log("PUSH_START", { userId, type });
      await sendNotificationToUser(userId, {
        title,
        body,
        data: {
          type: type.toUpperCase(),
          link,
          route: link.startsWith("/app/") ? link : `/app${link}`,
        },
      });
      log("PUSH_SUCCESS", { userId, type });
      logMetric("PUSH_SUCCESS", 1, { userId, type });
    } catch (pushError: any) {
      logError("PUSH_FAILED", pushError, { userId, type });
      logMetric("PUSH_FAILED", 1, { userId, type });
      // 푸시 실패해도 인앱 알림은 성공으로 처리
    }

    return notificationRef.id;
  } catch (error: any) {
    logError("NOTIFICATION_FAILED", error, { userId, type });
    // 실패해도 메인 로직은 계속 진행
    return null;
  }
}

/**
 * 🔔 승인 알림 발송
 */
export async function sendApprovalNotification({
  userId,
  postId,
  postTitle,
  chatRoomId,
  idempotencyKey,
  hostId,
  hostName,
  hostPhotoUrl,
  teamId,
  teamName,
}: {
  userId: string;
  postId: string;
  postTitle: string;
  chatRoomId?: string;
  idempotencyKey?: string;
  hostId?: string;
  hostName?: string;
  hostPhotoUrl?: string;
  teamId?: string;
  teamName?: string;
}): Promise<string | null> {
  const host = typeof hostName === "string" ? hostName.trim() : "";
  const body = host
    ? `${host}님이 "${postTitle}" 모집 참여를 승인했습니다.`
    : `"${postTitle}" 모집 참여가 승인되었습니다.`;

  return await sendNotification({
    userId,
    type: "approved",
    title: "참여 승인!",
    body,
    link: chatRoomId ? `/app/chat/${chatRoomId}` : `/app/market/${postId}`,
    idempotencyKey,
    actorId: hostId,
    actorName: host || undefined,
    actorPhotoUrl: hostPhotoUrl,
    teamId,
    teamName,
  });
}

/**
 * 🔔 취소/거절 알림 발송
 */
export async function sendCancellationNotification({
  userId,
  postId,
  postTitle,
  reason,
  idempotencyKey,
}: {
  userId: string;
  postId: string;
  postTitle: string;
  reason?: string;
  idempotencyKey?: string;
}): Promise<string | null> {
  return await sendNotification({
    userId,
    type: "cancelled",
    title: "참여 취소",
    body: reason 
      ? `"${postTitle}" 참여가 취소되었습니다. (${reason})`
      : `"${postTitle}" 참여가 취소되었습니다.`,
    link: `/app/market/${postId}`,
    idempotencyKey,
  });
}
