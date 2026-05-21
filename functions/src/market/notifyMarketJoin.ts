/**
 * 🔥 매칭 참여 알림 공용 함수 (Idempotent)
 * 
 * 역할:
 * - 인앱 알림 저장 (서브컬렉션 구조)
 * - FCM 푸시 발송
 * - 로그 기록
 */

import * as admin from "firebase-admin";
import { sendNotificationToUser } from "../sendUserNotification";

const db = admin.firestore();

/**
 * 알림 발송 (인앱 + FCM)
 * 
 * @param userId - 알림 수신자 UID
 * @param data - 알림 데이터
 */
export async function notifyMarketJoin(
  userId: string,
  data: {
    type: "JOIN_APPROVED" | "JOIN_REJECTED_FULL" | "JOIN_REJECTED" | "JOIN_REQUESTED" | "USER_LEFT" | "WAITLIST_PROMOTED";
    title: string;
    body: string;
    postId: string;
    chatRoomId?: string;
  }
): Promise<void> {
  try {
    console.log("🔔 [notifyMarketJoin] 알림 발송 시작:", {
      userId,
      type: data.type,
      postId: data.postId,
    });

    // 🔥 1. 인앱 알림 저장 (서브컬렉션 구조)
    await db
      .collection("notifications")
      .doc(userId)
      .collection("items")
      .add({
        type: data.type,
        title: data.title,
        body: data.body,
        postId: data.postId,
        ...(data.chatRoomId && { chatRoomId: data.chatRoomId }),
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    console.log("✅ [notifyMarketJoin] 인앱 알림 저장 완료:", { userId });

    // 🔥 2. FCM 푸시 알림 발송
    await sendNotificationToUser(userId, {
      title: data.title,
      body: data.body,
      data: {
        type: data.type,
        postId: data.postId,
        chatRoomId: data.chatRoomId || "",
        route: data.chatRoomId 
          ? `/app/chat/${data.chatRoomId}` 
          : `/app/market/${data.postId}`,
      },
    });

    console.log("✅ [notifyMarketJoin] FCM 발송 완료:", { userId });

    // 🔥 3. 로그 기록 (선택사항)
    await db.collection("_marketJoinNotificationLogs").add({
      userId,
      type: data.type,
      postId: data.postId,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      status: "sent",
    });

    console.log("✅ [notifyMarketJoin] 전체 완료:", { userId, type: data.type });
  } catch (error: any) {
    console.error("❌ [notifyMarketJoin] 알림 발송 실패:", {
      userId,
      type: data.type,
      error: error.message,
      stack: error.stack,
    });
    // 알림 실패해도 메인 로직은 계속 진행 (Fail-safe)
  }
}
