/**
 * 🔥 채팅 메시지 생성 시 푸시 알림 전송
 *
 * 역할:
 * - chatRooms/{roomId}/messages/{messageId} 생성 시
 * - 발신자를 제외한 모든 멤버에게 푸시 알림 전송
 *
 * (소스는 functions-chat 전용 — 메인 functions 번들과 분리)
 */

import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions";
import * as admin from "firebase-admin";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

// 배포/분석 단계에서 getFirestore()가 먼저 실행되면 app/no-app — 반드시 초기화 후 DB 참조
if (!admin.apps.length) {
  admin.initializeApp();
}
const db = getFirestore();

/**
 * 메시지 생성 시 푸시 알림 전송
 */
export const onMessageCreated = onDocumentCreated(
  "chatRooms/{roomId}/messages/{messageId}",
  async (event) => {
    const { roomId, messageId } = event.params;
    const messageData = event.data?.data();

    if (!messageData) {
      logger.warn("⚠️ [onMessageCreated] 메시지 스냅샷 없음 — 푸시 스킵", {
        roomId,
        messageId,
      });
      return;
    }

    const senderId =
      (messageData.senderId as string | undefined) ||
      (messageData.uid as string | undefined);
    if (!senderId) {
      logger.warn("⚠️ [onMessageCreated] senderId/uid 없음 — 푸시 스킵", {
        roomId,
        messageId,
      });
      return;
    }

    // 시스템 메시지는 푸시하지 않음 (멤버 전원에게 가면 스팸/혼선)
    if (messageData.type === "system") {
      logger.info("⏭️ [onMessageCreated] 시스템 메시지 — 푸시 스킵", { roomId, messageId });
      return;
    }

    const textPreview =
      typeof messageData.text === "string"
        ? messageData.text.substring(0, 50)
        : "";

    logger.info("🔔 [onMessageCreated] 메시지 생성 감지:", {
      roomId,
      messageId,
      senderId,
      text: textPreview,
    });

    try {
      // 1️⃣ 채팅방 정보 조회
      const roomRef = db.doc(`chatRooms/${roomId}`);
      const roomSnap = await roomRef.get();

      if (!roomSnap.exists) {
        logger.warn("⚠️ [onMessageCreated] 채팅방이 존재하지 않음:", { roomId });
        return;
      }

      const roomData = roomSnap.data();
      const members = roomData?.members || roomData?.participants || [];

      // 2️⃣ 발신자를 제외한 멤버 목록 (자기 자신에게는 절대 보내지 않음)
      const targetMembers = members.filter((uid: string) => uid && uid !== senderId);

      if (targetMembers.length === 0) {
        logger.info("ℹ️ [onMessageCreated] 알림 대상 없음:", { roomId });
        return;
      }

      // 3️⃣ 메시지 미리보기 생성
      let messagePreview = "";
      if (messageData.type === "image") {
        messagePreview = "사진을 보냈습니다";
      } else if (messageData.type === "video") {
        messagePreview = "동영상을 보냈습니다";
      } else if (messageData.type === "location") {
        messagePreview = "위치를 공유했습니다";
      } else {
        messagePreview = messageData.text || "";
        if (messagePreview.length > 50) {
          messagePreview = messagePreview.substring(0, 50) + "...";
        }
      }

      // 4️⃣ 채팅방 이름 결정
      let chatRoomName = "채팅";
      if (roomData?.type === "team" && roomData?.name) {
        chatRoomName = roomData.name;
      } else if (roomData?.type === "trade" && roomData?.productSnapshot?.title) {
        chatRoomName = roomData.productSnapshot.title;
      } else if (roomData?.name) {
        chatRoomName = roomData.name;
      }

      // 5️⃣ 각 멤버에게 푸시 알림 전송 (users/{uid}/devices 기반)
      const messaging = admin.messaging();
      const notificationPromises = targetMembers.map(async (uid: string) => {
        try {
          if (uid === senderId) {
            logger.warn("⏭️ [onMessageCreated] 수신자=발신자 스킵 (방어)", {
              uid,
              roomId,
              messageId,
            });
            return;
          }

          logger.info("📤 [onMessageCreated] 푸시 대상 처리 시작", {
            messageId,
            recipientUid: uid,
            roomId,
            senderId,
          });

          // 🔥 users/{uid}/devices 서브컬렉션에서 토큰 조회 (fcmTokens 배열 대신)
          const devicesRef = db.collection(`users/${uid}/devices`);
          const devicesSnap = await devicesRef.get();

          const validTokens: string[] = [];
          const tokenToDocId: Map<string, string> = new Map();

          devicesSnap.forEach((doc) => {
            const data = doc.data();
            const token = data?.token;
            const enabled = data?.enabled !== false;
            if (token && typeof token === "string" && enabled) {
              validTokens.push(token);
              tokenToDocId.set(token, doc.id);
            }
          });

          // fcmTokens 하위 호환 (devices가 비어 있으면 users/{uid}.fcmTokens 사용)
          if (validTokens.length === 0) {
            const userRef = db.doc(`users/${uid}`);
            const userSnap = await userRef.get();
            const userData = userSnap.exists ? userSnap.data() : null;
            const legacyTokens = userData?.fcmTokens || [];
            const tokens = Array.isArray(legacyTokens) ? legacyTokens : [legacyTokens];
            tokens.forEach((t: string) => {
              if (t && typeof t === "string") validTokens.push(t);
            });
          }

          if (validTokens.length === 0) {
            logger.info("ℹ️ [onMessageCreated] FCM 토큰 없음:", { uid, roomId, messageId });
            return;
          }

          // 🔥 multicast로 여러 디바이스에 한 번에 전송
          const multicastMessage = {
            notification: {
              title: chatRoomName,
              body: messagePreview,
            },
            data: {
              type: "chat",
              roomId,
              messageId,
              senderId: senderId || "",
              route: `/chat/${roomId}`,
            },
            android: {
              priority: "high" as const,
            },
            apns: {
              headers: {
                "apns-priority": "10",
              },
            },
            tokens: validTokens,
          };

          const response = await messaging.sendEachForMulticast(multicastMessage);

          // 🔥 실패한 토큰 정리 (devices 문서 비활성화 또는 삭제)
          if (response.failureCount > 0) {
            const invalidTokens: string[] = [];
            response.responses.forEach((resp, idx) => {
              if (!resp.success && resp.error) {
                const code = resp.error.code;
                if (
                  code === "messaging/invalid-registration-token" ||
                  code === "messaging/registration-token-not-registered"
                ) {
                  invalidTokens.push(validTokens[idx]);
                }
              }
            });

            for (const token of invalidTokens) {
              const docId = tokenToDocId.get(token);
              if (docId) {
                const deviceRef = db.doc(`users/${uid}/devices/${docId}`);
                await deviceRef.update({
                  enabled: false,
                  updatedAt: FieldValue.serverTimestamp(),
                });
                logger.info("🧹 [onMessageCreated] 무효 토큰 비활성화:", { uid, deviceId: docId });
              } else {
                // 레거시 fcmTokens 배열에서 제거
                const userRef = db.doc(`users/${uid}`);
                await userRef.update({
                  fcmTokens: FieldValue.arrayRemove(token),
                });
                logger.info("🧹 [onMessageCreated] 레거시 fcmTokens에서 제거:", { uid });
              }
            }
          }

          logger.info("✅ [onMessageCreated] 푸시 알림 전송 성공:", {
            messageId,
            uid,
            roomId,
            successCount: response.successCount,
            failureCount: response.failureCount,
          });
        } catch (error: any) {
          logger.error("❌ [onMessageCreated] 푸시 알림 전송 실패:", {
            messageId,
            recipientUid: uid,
            roomId,
            senderId,
            error: error?.message,
            code: error?.code,
          });
        }
      });

      await Promise.allSettled(notificationPromises);

      logger.info("✅ [onMessageCreated] 모든 알림 처리 완료:", {
        roomId,
        messageId,
        targetCount: targetMembers.length,
      });
    } catch (error: any) {
      logger.error("❌ [onMessageCreated] 알림 처리 실패:", {
        roomId,
        messageId,
        error: error.message,
        stack: error.stack,
      });
    }
  }
);
