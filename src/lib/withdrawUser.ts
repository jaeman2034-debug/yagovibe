/**
 * 🔥 유저 탈퇴 처리 (soft delete + auth 삭제)
 * 
 * 역할:
 * - 유저 주도 탈퇴
 * - 데이터 소프트 삭제 (법/복구 대비)
 * - Phone Auth 특성 고려한 재가입 정책
 * - 운영자 추적 가능
 * 
 * 포인트:
 * - Firestore는 soft delete (status: "deleted")
 * - Firebase Auth 계정은 즉시 삭제 (재가입 가능)
 * - Phone Auth는 번호가 곧 계정이라 Auth 삭제 필요
 */

import { getAuth, deleteUser, reauthenticateWithCredential, PhoneAuthProvider } from "firebase/auth";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { logRetentionEvent } from "@/utils/retentionEvents";

const auth = getAuth();

/**
 * 유저 탈퇴 (soft delete + auth 삭제)
 * 
 * @throws {Error} 인증되지 않은 경우
 * @throws {Error} 최근 로그인이 필요한 경우 (re-auth 필요)
 */
export async function withdrawUser(): Promise<void> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("[withdrawUser] 인증되지 않은 사용자입니다.");
  }

  // 🔥 최근 로그인 확인 (deleteUser는 최근 로그인 필요)
  // 오래된 세션이면 re-auth 요구됨 (정상)
  if (!user.metadata.lastSignInTime) {
    throw new Error("[withdrawUser] 최근 로그인이 필요합니다. 다시 로그인해주세요.");
  }

  const userRef = doc(db, "users", user.uid);

  try {
    // 1️⃣ Firestore soft delete
    await updateDoc(userRef, {
      status: "deleted",
      deletedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    console.log("✅ [withdrawUser] Firestore soft delete 완료");

    // 2️⃣ 탈퇴 이벤트 로그
    try {
      await addDoc(collection(db, "eventLogs"), {
        event: "account_deleted",
        uid: user.uid,
        metadata: {
          phoneNumber: user.phoneNumber || null,
          lastSignInTime: user.metadata.lastSignInTime || null,
        },
        createdAt: serverTimestamp(),
      });
    } catch (logError) {
      // 로그 저장 실패해도 탈퇴는 계속 진행
      console.error("⚠️ [withdrawUser] 이벤트 로그 저장 실패 (무시):", logError);
    }

    // 3️⃣ Firebase Auth 계정 삭제
    // 🔥 Phone Auth는 번호가 곧 계정이라 Auth 삭제 필요
    // 삭제 안 하면 재가입 시 문제 발생
    await deleteUser(user);

    console.log("✅ [withdrawUser] Firebase Auth 계정 삭제 완료");
  } catch (error: any) {
    console.error("❌ [withdrawUser] 탈퇴 처리 실패:", error);

    // 🔥 최근 로그인이 필요한 경우
    if (error.code === "auth/requires-recent-login") {
      throw new Error(
        "최근 로그인이 필요합니다. 보안을 위해 다시 로그인해주세요."
      );
    }

    throw error;
  }
}

/**
 * 탈퇴 확인 (재인증 필요 시)
 * 
 * @param verificationCode - SMS 인증번호
 */
export async function withdrawUserWithReauth(verificationCode: string): Promise<void> {
  const user = auth.currentUser;
  if (!user || !user.phoneNumber) {
    throw new Error("[withdrawUserWithReauth] 전화번호 인증이 필요합니다.");
  }

  try {
    // 🔥 재인증 (Phone Auth)
    const credential = PhoneAuthProvider.credential(
      user.phoneNumber,
      verificationCode
    );
    await reauthenticateWithCredential(user, credential);

    // 🔥 재인증 성공 후 탈퇴 처리
    await withdrawUser();
  } catch (error: any) {
    console.error("❌ [withdrawUserWithReauth] 재인증 실패:", error);
    throw error;
  }
}
