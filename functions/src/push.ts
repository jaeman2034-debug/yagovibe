/**
 * 🔥 FCM 푸시 알림 발송 (프로덕션 배포 패키지)
 * 
 * 유저별 FCM 토큰: `/users/{uid}.fcmTokens: string[]` 가정
 */

import { fcm, db } from "./firebase";

type PushPayload = {
  title: string;
  body: string;
  data?: Record<string, string>;
};

export async function sendFCM(uid: string, payload: PushPayload) {
  try {
    const userSnap = await db.collection("users").doc(uid).get();
    const userData = userSnap.data();
    
    // 🔥 FCM 토큰 구조 확인 (배열 또는 서브컬렉션)
    let tokens: string[] = [];
    
    if (userData?.fcmTokens && Array.isArray(userData.fcmTokens)) {
      // 배열 필드 방식
      tokens = userData.fcmTokens.filter(Boolean);
    } else {
      // 서브컬렉션 방식 (users/{uid}/fcmTokens/{tokenId})
      const tokensSnap = await db
        .collection("users")
        .doc(uid)
        .collection("fcmTokens")
        .get();
      
      tokens = tokensSnap.docs
        .map((doc) => doc.data().token)
        .filter(Boolean);
    }

    if (tokens.length === 0) {
      console.log("⚠️ [sendFCM] FCM 토큰 없음:", { uid });
      return;
    }

    await fcm.sendEachForMulticast({
      tokens,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: {
        ...payload.data,
        // 기본 데이터 필드 (문자열로 변환)
        title: payload.title,
        body: payload.body,
      },
      android: {
        priority: "high" as const,
      },
      apns: {
        payload: {
          aps: {
            sound: "default",
            badge: 1,
          },
        },
      },
    });

    console.log("✅ [sendFCM] 발송 완료:", { uid, tokensCount: tokens.length });
  } catch (error: any) {
    console.error("❌ [sendFCM] 발송 실패:", {
      uid,
      error: error.message,
      stack: error.stack,
    });
    // FCM 실패해도 메인 로직은 계속 진행 (Fail-safe)
  }
}
