/**
 * 🔔 새 메시지 푸시 알림 Cloud Function
 * 
 * chatRooms/{roomId}/messages/{messageId} 문서가 생성되면
 * 상대방에게 FCM 푸시 알림을 전송합니다.
 */

import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";

// 🔥 구조화 로거 (운영용)
function log(type: string, data: Record<string, any> = {}) {
  console.log(JSON.stringify({
    time: new Date().toISOString(),
    type,
    ...data,
  }));
}

function logError(type: string, error: any, data: Record<string, any> = {}) {
  console.error(JSON.stringify({
    time: new Date().toISOString(),
    type: `ERROR_${type}`,
    error: {
      message: error?.message || String(error),
      code: error?.code,
    },
    ...data,
  }));
}

export const notifyNewMessage = functions.firestore
  .document("chatRooms/{roomId}/messages/{messageId}" as any)
  .onCreate(async (snap, context) => {
    const message = snap.data();
    const { roomId } = context.params;
    const senderId = message.senderId;

    log("MESSAGE_NOTIFY_START", { roomId, messageId: context.params.messageId, senderId });

    try {
      // 🔥 채팅방 정보 조회
      const roomRef = admin.firestore().doc(`chatRooms/${roomId}`);
      const roomSnap = await roomRef.get();

      if (!roomSnap.exists) {
        console.warn("⚠️ [notifyNewMessage] 채팅방이 존재하지 않습니다:", roomId);
        return;
      }

      const room = roomSnap.data()!;
      
      // 🔥 시스템 메시지는 푸시 안 함
      if (message.type === "system" || !message.senderId) {
        console.log("ℹ️ [notifyNewMessage] 시스템 메시지는 푸시하지 않습니다.");
        return;
      }
      
      // 🔥 모집 마감 체크
      if (room.status === "closed") {
        console.log("ℹ️ [notifyNewMessage] 모집이 마감된 채팅방입니다.");
        return;
      }
      
      // 🔥 members 배열 우선 확인 (실전급 설계), 하위 호환
      const members = room.members || room.participants || [];
      
      // 🔥 타입 확인 (recruit_group vs trade)
      const roomType = room.type || (room.postId ? "recruit_group" : "trade");

      // 🔥 수신자 = sender 제외한 참여자 (강퇴된 사람 제외)
      const receivers = members.filter((uid: string) => {
        if (uid === senderId) return false;
        // 🔥 강퇴된 사람 제외
        if (room.roles?.[uid] === "banned") return false;
        return true;
      });

      if (receivers.length === 0) {
        console.log("ℹ️ [notifyNewMessage] 수신자가 없습니다.");
        return;
      }

      // 🔥 메시지 내용 준비 (당근마켓 스타일)
      const messageText = message.location
        ? "📍 거래 위치를 공유했어요"
        : message.text || "새 메시지";

      // 🔥 상품 정보 조회 (제목용) - productSnapshot 사용
      let productTitle = "채팅";
      if (room.productSnapshot?.title) {
        productTitle = room.productSnapshot.title;
      } else if (room.productId) {
        // 🔥 레거시: productSnapshot이 없으면 products 컬렉션 조회 (fallback)
        try {
          const productRef = admin.firestore().doc(`products/${room.productId}`);
          const productSnap = await productRef.get();
          if (productSnap.exists) {
            const productData = productSnap.data()!;
            productTitle = productData.title || productData.name || "채팅";
          }
        } catch (error) {
          console.warn("⚠️ [notifyNewMessage] 상품 정보 조회 실패:", error);
        }
      }

      // 🔥 보낸 사람 정보 조회 (이름용)
      let senderName = "상대방";
      try {
        const senderRef = admin.firestore().doc(`users/${senderId}`);
        const senderSnap = await senderRef.get();
        if (senderSnap.exists) {
          const senderData = senderSnap.data()!;
          senderName = senderData.displayName || senderData.name || "상대방";
        }
      } catch (error) {
        console.warn("⚠️ [notifyNewMessage] 보낸 사람 정보 조회 실패:", error);
      }

      // 🔥 각 수신자에게 푸시 알림 전송
      const sendPromises = receivers.map(async (receiverUid: string) => {
        try {
          // 🔥 사용자 정보 조회 (FCM 토큰용)
          const userRef = admin.firestore().doc(`users/${receiverUid}`);
          const userSnap = await userRef.get();

          if (!userSnap.exists) {
            console.warn("⚠️ [notifyNewMessage] 사용자가 존재하지 않습니다:", receiverUid);
            return;
          }

          const userData = userSnap.data()!;
          
          // 🔥 FCM 토큰 조회 (devices 컬렉션 또는 fcmTokens 필드)
          let fcmTokens: string[] = [];
          
          // 방법 1: devices 컬렉션에서 조회 (최신 방식)
          try {
            const devicesRef = admin.firestore().collection(`users/${receiverUid}/devices`);
            const devicesSnap = await devicesRef.get();
            devicesSnap.forEach((doc) => {
              const deviceData = doc.data();
              if (deviceData.token && typeof deviceData.token === "string") {
                fcmTokens.push(deviceData.token);
              }
            });
          } catch (error) {
            console.warn("⚠️ [notifyNewMessage] devices 컬렉션 조회 실패:", error);
          }
          
          // 방법 2: fcmTokens 필드에서 조회 (하위 호환성)
          if (fcmTokens.length === 0 && userData.fcmTokens) {
            fcmTokens = userData.fcmTokens || [];
          }

          if (fcmTokens.length === 0) {
            console.log("ℹ️ [notifyNewMessage] FCM 토큰이 없습니다:", receiverUid);
            return;
          }

          // 🔥 unread 계산 (seq 기반)
          const lastSeq = room.lastMessageSeq ?? 0;
          const readSeq = room.read?.[receiverUid]?.lastReadSeq ?? 0;
          const unread = Math.max(0, lastSeq - readSeq);
          
          // 🔥 타입별 제목 설정
          const notificationTitle = roomType === "recruit_group"
            ? "모집 단체방"
            : productTitle;
          
          // 🔥 당근마켓 스타일 푸시 메시지
          // 제목: 타입별 제목
          // 내용: "보낸사람이름: 메시지 내용"
          const notificationBody = message.location
            ? `${senderName}: 📍 거래 위치를 공유했어요`
            : `${senderName}: ${messageText}`;

          // 🔥 FCM 메시지 전송
          const messagePayload: admin.messaging.MulticastMessage = {
            tokens: fcmTokens,
            notification: {
              title: notificationTitle,
              body: notificationBody,
            },
            data: {
              roomId,
              type: roomType, // 🔥 recruit_group 또는 trade
              unread: String(unread), // 🔥 unread 수
              route: `/app/chat/${roomId}`, // 🔥 알림 클릭 시 이동 경로
            },
            // 🔥 Android/iOS 설정
            android: {
              priority: "high" as const,
              notification: {
                sound: "default",
                channelId: "default",
              },
            },
            apns: {
              payload: {
                aps: {
                  sound: "default",
                  badge: 1,
                },
              },
            },
          };

          const response = await admin.messaging().sendEachForMulticast(messagePayload);
          
          log("PUSH_SUCCESS", {
            receiverUid,
            roomId,
            successCount: response.successCount,
            failureCount: response.failureCount,
          });

          // 🔥 실패한 토큰 제거 (무효한 토큰 정리)
          if (response.failureCount > 0) {
            const invalidTokens: string[] = [];
            response.responses.forEach((resp, idx) => {
              if (!resp.success && resp.error) {
                const errorCode = resp.error.code;
                if (
                  errorCode === "messaging/invalid-registration-token" ||
                  errorCode === "messaging/registration-token-not-registered"
                ) {
                  invalidTokens.push(fcmTokens[idx]);
                }
              }
            });

            if (invalidTokens.length > 0) {
              // 🔥 무효한 토큰 제거 (devices 컬렉션에서)
              const devicesRef = admin.firestore().collection(`users/${receiverUid}/devices`);
              const devicesSnap = await devicesRef.get();
              const deletePromises = devicesSnap.docs
                .filter((doc) => invalidTokens.includes(doc.data().token))
                .map((doc) => doc.ref.delete());
              
              await Promise.all(deletePromises);
              console.log("🧹 [notifyNewMessage] 무효한 FCM 토큰 제거:", invalidTokens.length);
            }
          }
        } catch (error: any) {
          logError("PUSH_FAILED", error, { receiverUid, roomId });
        }
      });

      await Promise.all(sendPromises);
      console.log("✅ [notifyNewMessage] 모든 수신자에게 푸시 알림 전송 완료");
    } catch (error: any) {
      console.error("❌ [notifyNewMessage] 푸시 알림 처리 실패:", error);
    }
  });
