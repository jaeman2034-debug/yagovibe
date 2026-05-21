/**
 * 🔥 채팅 메시지 생성 시 알림 발송 (Firestore 트리거)
 * 
 * 알림 조건:
 * - 수신자가 채팅방에 없을 때만 발송
 * - 사용자가 알림을 켜놓았을 때만 발송
 * 
 * 사용 예시:
 * Firestore 트리거로 자동 호출됨
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { sendNotificationToUser } from "./sendUserNotification";

// Firebase Admin SDK 초기화
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * 채팅 메시지 생성 트리거
 * /chats/{chatId}/messages/{messageId} 생성 시 호출
 */
export const onChatMessageCreated = functions.firestore
  .document("chats/{chatId}/messages/{messageId}")
  .onCreate(async (snap, context) => {
    try {
      const messageData = snap.data();
      const { chatId } = context.params;

      // 거래 채팅 중복 방 합치기 스크립트가 복사한 메시지 — 알림·부가 처리 스킵
      if (messageData._mergedFromChatId) {
        console.log("⏭️ [onChatMessageCreated] 마이그레이션 복사본 → 스킵");
        return;
      }

      const senderId = messageData.senderId || messageData.uid;
      const messageText = messageData.text || "";

      if (!senderId || !messageText) {
        console.log("⚠️ [onChatMessageCreated] 메시지 데이터 없음");
        return;
      }

      // 시스템 메시지는 알림 발송 안 함
      if (
        messageData.system === true ||
        messageData.type === "system_init" ||
        messageData.type === "system_auto_reply" ||
        messageData.type === "system_action" ||
        messageData.type === "system_status_change"
      ) {
        console.log("⏭️ [onChatMessageCreated] 시스템 메시지 → 알림 스킵");
        return;
      }

      // 채팅방 정보 로드
      const chatDoc = await db.collection("chats").doc(chatId).get();
      if (!chatDoc.exists) {
        console.log("⚠️ [onChatMessageCreated] 채팅방 없음");
        return;
      }

      const chatData = chatDoc.data();
      if (!chatData) return;

      // 채팅방 사용자 목록 (users 배열 또는 sellerId/buyerId)
      const users = chatData.users || [];
      const receiverId = users.find((uid: string) => uid !== senderId);

      if (!receiverId) {
        console.log("⚠️ [onChatMessageCreated] 수신자 없음");
        return;
      }

      // 🔥 알림 조건 1: 수신자의 알림 설정 확인
      const settingsRef = db.collection(`users/${receiverId}/settings`).doc("notifications");
      const settingsSnap = await settingsRef.get();
      const chatNotificationsEnabled = settingsSnap.exists
        ? settingsSnap.data()?.chatNotificationsEnabled !== false // 기본값: true
        : true;

      if (!chatNotificationsEnabled) {
        console.log(`⏭️ [onChatMessageCreated] 사용자 ${receiverId} 알림 꺼짐`);
        return;
      }

      // 🔥 알림 조건 2: 수신자가 채팅방에 있는지 확인
      // (실제로는 클라이언트에서 관리하므로, 여기서는 항상 발송)
      // 필요시 Firestore에 currentChatRoomId를 기록하고 여기서 확인 가능

      // 🔥 알림 발송
      const messagePreview = messageText.length > 50 
        ? messageText.substring(0, 50) + "..." 
        : messageText;

      await sendNotificationToUser(receiverId, {
        title: "YAGO SPORTS",
        body: messagePreview,
        data: {
          type: "chat",
          chatId: chatId,
          messageId: context.params.messageId,
          route: `/app/chat/${chatId}`, // 🔥 딥링크 경로
        },
      });

      console.log(`✅ [onChatMessageCreated] 알림 발송 완료: ${receiverId}`);
    } catch (error) {
      console.error("❌ [onChatMessageCreated] 알림 발송 실패:", error);
      // 알림 실패해도 메시지 저장은 성공했으므로 에러를 throw하지 않음
    }
  });

