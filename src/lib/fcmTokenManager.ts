// 🔥 FCM 토큰 관리 (채팅 푸시 알림용)
import { getMessaging, getToken, isSupported, type Messaging } from "firebase/messaging";
import { doc, setDoc, serverTimestamp, deleteDoc, collection, getDocs } from "firebase/firestore";
import { db, app } from "./firebase";

let messagingInstance: Messaging | null = null;

/**
 * FCM Messaging 인스턴스 가져오기 (싱글톤)
 */
function getMessagingInstance(): Messaging | null {
  if (typeof window === "undefined") return null; // SSR 환경에서는 null 반환
  
  if (!messagingInstance) {
    try {
      // 브라우저 지원 확인
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      isSupported().then((ok) => {
        if (!ok) {
          console.warn("⚠️ [fcmTokenManager] 현재 브라우저는 FCM을 지원하지 않습니다.");
          messagingInstance = null;
          return;
        }
        messagingInstance = getMessaging(app);
      }).catch((err) => {
        console.warn("⚠️ [fcmTokenManager] FCM 지원 확인 실패:", err);
        messagingInstance = null;
      });
    } catch (error) {
      console.warn("⚠️ [fcmTokenManager] FCM Messaging 초기화 실패:", error);
      return null;
    }
  }
  
  return messagingInstance;
}

/**
 * FCM 토큰 등록 및 Firestore 저장
 * @param uid 사용자 UID
 */
export async function registerFcmToken(uid: string): Promise<void> {
  if (typeof window === "undefined") return;
  
  const messaging = getMessagingInstance();
  if (!messaging) {
    console.warn("⚠️ [fcmTokenManager] FCM Messaging 사용 불가");
    return;
  }

  try {
    // VAPID 키 확인
    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
    
    if (!vapidKey) {
      // VAPID 키가 없으면 FCM 기능만 비활성화 (앱은 정상 작동)
      // console.warn("⚠️ [fcmTokenManager] VITE_FIREBASE_VAPID_KEY가 설정되지 않았습니다");
      return;
    }

    // FCM 토큰 가져오기
    const token = await getToken(messaging, { vapidKey });
    
    if (!token) {
      console.warn("⚠️ [fcmTokenManager] FCM 토큰을 가져올 수 없습니다");
      return;
    }

    // Firestore에 토큰 저장 (users/{uid}/fcmTokens/{token})
    const tokenRef = doc(db, "users", uid, "fcmTokens", token);
    await setDoc(
      tokenRef,
      { createdAt: serverTimestamp() },
      { merge: true }
    );

    console.log(`✅ [fcmTokenManager] FCM 토큰 저장 완료: ${uid}`);
  } catch (error) {
    console.error("❌ [fcmTokenManager] FCM 토큰 등록 실패:", error);
  }
}

/**
 * 사용자의 모든 FCM 토큰 삭제 (로그아웃 시)
 * @param uid 사용자 UID
 */
export async function removeFcmTokens(uid: string): Promise<void> {
  try {
    const tokensRef = collection(db, "users", uid, "fcmTokens");
    const tokensSnap = await getDocs(tokensRef);
    
    const deletePromises = tokensSnap.docs.map((docSnap) => 
      deleteDoc(docSnap.ref)
    );
    
    await Promise.all(deletePromises);
    console.log(`✅ [fcmTokenManager] FCM 토큰 삭제 완료: ${uid}`);
  } catch (error) {
    console.error("❌ [fcmTokenManager] FCM 토큰 삭제 실패:", error);
  }
}

