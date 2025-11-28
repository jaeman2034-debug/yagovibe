// src/lib/saveDeviceToken.ts
/**
 * 🔥 실서비스 수준 FCM 토큰 저장 시스템 (최종 버전)
 * 
 * Firestore 구조:
 * users/{uid}/devices/{deviceId} {
 *   token: string,
 *   platform: "ios" | "android" | "web",
 *   updatedAt: Timestamp,
 * }
 */

import { doc, setDoc } from "firebase/firestore";
import { db, auth } from "./firebase";
import { v4 as uuidv4 } from "uuid";

/**
 * FCM 토큰을 Firestore에 저장
 * @param token FCM 등록 토큰
 * @param platform 기기 플랫폼 ("ios" | "android" | "web")
 */
export async function saveDeviceToken(token: string, platform: string): Promise<void> {
  const user = auth.currentUser;
  
  if (!user) {
    console.log("❌ 로그인한 사용자 없음 → FCM 토큰 저장 스킵");
    return;
  }

  // 기기 고유 ID (앱 재실행/재로그인 시에도 동일 디바이스로 인식)
  let deviceId = localStorage.getItem("device_id");
  if (!deviceId) {
    deviceId = uuidv4();
    localStorage.setItem("device_id", deviceId);
  }

  const ref = doc(db, `users/${user.uid}/devices/${deviceId}`);

  await setDoc(
    ref,
    {
      token,
      platform,
      updatedAt: new Date(),
    },
    { merge: true }
  );

  console.log(`🔥 FCM token saved: uid=${user.uid}, deviceId=${deviceId}`);
}

/**
 * 기기 토큰 삭제 (로그아웃 시 호출)
 */
export async function removeDeviceToken(): Promise<void> {
  try {
    const user = auth.currentUser;
    
    if (!user) {
      console.log("⚠️ [removeDeviceToken] 로그인한 사용자 없음 → 토큰 삭제 스킵");
      return;
    }

    const deviceId = localStorage.getItem("yago_vibe_device_id");
    
    if (!deviceId) {
      console.log("⚠️ [removeDeviceToken] 기기 ID 없음 → 삭제 스킵");
      return;
    }

    const deviceRef = doc(db, `users/${user.uid}/devices/${deviceId}`);
    
    // Firestore에서 삭제
    await setDoc(deviceRef, { token: null }, { merge: true });
    
    // 또는 완전 삭제하려면:
    // await deleteDoc(deviceRef);
    
    console.log(`✅ [removeDeviceToken] 기기 토큰 삭제 완료:`, {
      userId: user.uid,
      deviceId,
    });
  } catch (error) {
    console.error("❌ [removeDeviceToken] 토큰 삭제 실패:", error);
  }
}

