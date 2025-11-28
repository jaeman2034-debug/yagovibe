/**
 * 🔥 실서비스 수준 유저별 푸시 알림 발송 함수
 * 
 * 사용 예시:
 * import { sendNotificationToUser } from "./sendUserNotification";
 * 
 * await sendNotificationToUser("abc123", {
 *   title: "새 예약이 도착했습니다",
 *   body: "시설 A에 새로운 예약이 들어왔습니다.",
 *   data: {
 *     route: "/facility/123",
 *   },
 * });
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// Firebase Admin SDK 초기화 (이미 초기화되어 있다면 생략)
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const messaging = admin.messaging();

/**
 * 유저별 모든 기기에 푸시 발송 함수
 * @param uid 사용자 UID
 * @param payload 알림 페이로드
 */
export async function sendNotificationToUser(
  uid: string,
  payload: {
    title: string;
    body: string;
    data?: Record<string, string>;
    imageUrl?: string;
  }
): Promise<void> {
  try {
    console.log(`🔥 [sendUserNotification] 유저 ${uid}에게 푸시 발송 시작`);

    // 1) Firestore에서 해당 유저의 모든 기기 토큰 가져오기
    const devicesRef = db.collection(`users/${uid}/devices`);
    const devicesSnapshot = await devicesRef.get();

    if (devicesSnapshot.empty) {
      console.log(`⚠️ [sendUserNotification] 유저 ${uid}의 등록된 디바이스 없음`);
      return;
    }

    // 2) 유효한 토큰만 수집 (token이 null이 아닌 것만)
    const tokens: string[] = [];
    const deviceDocs: admin.firestore.QueryDocumentSnapshot[] = [];

    devicesSnapshot.forEach((doc) => {
      const deviceData = doc.data();
      if (deviceData.token && typeof deviceData.token === "string") {
        tokens.push(deviceData.token);
        deviceDocs.push(doc);
      }
    });

    if (tokens.length === 0) {
      console.log(`⚠️ [sendUserNotification] 유저 ${uid}의 유효한 토큰 없음`);
      return;
    }

    console.log(`✅ [sendUserNotification] ${tokens.length}개 기기 발견`);

    // 3) FCM 메시지 구성
    const message: admin.messaging.MulticastMessage = {
      tokens,
      notification: {
        title: payload.title,
        body: payload.body,
        ...(payload.imageUrl && { imageUrl: payload.imageUrl }),
      },
      data: {
        ...payload.data,
        // 타임스탬프 추가 (선택사항)
        timestamp: new Date().toISOString(),
      },
      // Android/iOS 설정
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

    // 4) FCM으로 멀티캐스트 발송
    const response = await messaging.sendEachForMulticast(message);

    console.log(`✅ [sendUserNotification] 발송 완료:`, {
      successCount: response.successCount,
      failureCount: response.failureCount,
    });

    // 5) 실패한 토큰 처리 (무효한 토큰은 Firestore에서 삭제)
    if (response.failureCount > 0) {
      const failedTokens: string[] = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          failedTokens.push(tokens[idx]);
          console.error(`❌ 토큰 발송 실패: ${resp.error?.code} - ${resp.error?.message}`);
        }
      });

      // 무효한 토큰을 Firestore에서 삭제
      for (const doc of deviceDocs) {
        const deviceData = doc.data();
        if (failedTokens.includes(deviceData.token)) {
          // 토큰을 null로 설정하거나 문서 삭제
          await doc.ref.update({ token: null });
          console.log(`🗑️ 무효한 토큰 삭제: ${doc.id}`);
        }
      }
    }
  } catch (error) {
    console.error(`❌ [sendUserNotification] 푸시 발송 실패:`, error);
    throw error;
  }
}

/**
 * Cloud Functions HTTP 엔드포인트 (선택사항)
 * POST /sendNotification
 * Body: { uid: string, title: string, body: string, data?: object }
 */
export const sendNotification = functions.https.onRequest(async (req, res) => {
  // CORS 설정
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const { uid, title, body, data, imageUrl } = req.body;

    if (!uid || !title || !body) {
      res.status(400).json({ 
        error: "Missing required fields: uid, title, body" 
      });
      return;
    }

    await sendNotificationToUser(uid, {
      title,
      body,
      data,
      imageUrl,
    });

    res.status(200).json({ 
      success: true, 
      message: "Notification sent successfully" 
    });
  } catch (error: any) {
    console.error("❌ [sendNotification] HTTP 핸들러 오류:", error);
    res.status(500).json({ 
      error: error.message || "Internal server error" 
    });
  }
});

