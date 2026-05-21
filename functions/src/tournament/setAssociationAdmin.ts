/**
 * 🔥 협회 관리자 Custom Claims 설정
 * 
 * 사용법:
 * - Firebase Console Functions에서 직접 호출
 * - 또는 HTTP 호출로 실행
 * 
 * 예시:
 * await setAssociationAdmin("USER_UID", "assoc-nowon-football");
 */

import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";

// 🔥 Cloud Functions v2에서는 자동 초기화되므로 모듈 레벨 초기화 제거
// (배포 타임아웃 방지)

/**
 * 협회 관리자 Custom Claims 설정 (단순화 버전)
 * 🔥 Firestore 접근 제거 - Claims만 설정
 * @param uid 사용자 UID
 * @param associationId 협회 ID
 */
export async function setAssociationAdmin(
  uid: string,
  associationId: string
): Promise<void> {
  console.log("🔥 [setAssociationAdmin] 시작:", { 
    uid, 
    associationId,
    adminAppsLength: admin.apps.length,
    timestamp: new Date().toISOString()
  });

  // 🔥 Cloud Functions v2는 자동 초기화됨
  // ⚠️ admin.initializeApp() 호출 시 중복 초기화 에러 발생 가능
  // 따라서 초기화 체크만 하고 호출하지 않음
  
  // 🔥 Admin Auth 인스턴스 가져오기
  const auth = admin.auth();
  
  if (!auth) {
    const error = new Error("Admin Auth 인스턴스를 가져올 수 없습니다. Admin SDK가 초기화되지 않았습니다.");
    console.error("❌ [setAssociationAdmin] Admin Auth null:", { 
      uid, 
      associationId,
      adminAppsLength: admin.apps.length 
    });
    throw error;
  }

  console.log("✅ [setAssociationAdmin] Admin Auth 확인 완료");

  // 기존 Claims 가져오기 (Firestore 접근 없이 Auth만)
  let user;
  try {
    user = await auth.getUser(uid);
    console.log("✅ [setAssociationAdmin] 사용자 정보 조회 성공:", {
      uid: user.uid,
      email: user.email,
      hasExistingClaims: !!user.customClaims
    });
  } catch (getUserError: any) {
    console.error("❌ [setAssociationAdmin] 사용자 조회 실패:", {
      uid,
      errorCode: getUserError?.code,
      errorMessage: getUserError?.message
    });
    
    if (getUserError?.code === "auth/user-not-found") {
      throw new Error(`사용자를 찾을 수 없습니다: ${uid}`);
    }
    throw new Error(`사용자 조회 실패: ${getUserError?.message || "알 수 없는 오류"}`);
  }

  const currentClaims = user.customClaims || {};
  console.log("🔥 [setAssociationAdmin] 기존 Claims:", currentClaims);

  // 🔥 표준 Claims 구조 확정
  const newClaims = {
    ...currentClaims,
    role: "ADMIN",                    // 관리자 역할
    associationId: associationId,    // 협회 ID
  };

  console.log("🔥 [setAssociationAdmin] 새로운 Claims 설정:", newClaims);

  // 🔥 Firestore members/{uid} 문서 생성/업데이트 (Rules 체크용)
  const db = admin.firestore();
  const memberRef = db.doc(`associations/${associationId}/members/${uid}`);
  
  try {
    // 기존 문서 확인
    const memberDoc = await memberRef.get();
    
    if (memberDoc.exists) {
      // 기존 문서가 있으면 role만 업데이트
      await memberRef.update({
        role: "admin",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log("✅ [setAssociationAdmin] members/{uid} 문서 업데이트 완료:", { uid, associationId });
    } else {
      // 새 문서 생성
      await memberRef.set({
        uid,
        role: "admin",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log("✅ [setAssociationAdmin] members/{uid} 문서 생성 완료:", { uid, associationId });
    }
  } catch (firestoreError: any) {
    console.error("❌ [setAssociationAdmin] Firestore members 문서 생성/업데이트 실패:", {
      uid,
      associationId,
      errorCode: firestoreError?.code,
      errorMessage: firestoreError?.message,
    });
    // Firestore 오류는 경고만 하고 계속 진행 (Claims는 설정)
  }

  // Claims 설정
  try {
    await auth.setCustomUserClaims(uid, newClaims);
    console.log("✅ [setAssociationAdmin] Custom Claims 설정 성공:", { 
      uid, 
      associationId,
      claims: newClaims
    });
  } catch (setClaimsError: any) {
    console.error("❌ [setAssociationAdmin] Claims 설정 실패:", {
      uid,
      associationId,
      errorCode: setClaimsError?.code,
      errorMessage: setClaimsError?.message,
      errorStack: setClaimsError?.stack?.substring(0, 500)
    });
    
    // Admin SDK 에러 코드별 처리
    if (setClaimsError?.code === "auth/user-not-found") {
      throw new Error(`사용자를 찾을 수 없습니다: ${uid}`);
    }
    if (setClaimsError?.code === "auth/invalid-uid") {
      throw new Error(`유효하지 않은 UID입니다: ${uid}`);
    }
    
    throw new Error(`Custom Claims 설정 실패: ${setClaimsError?.message || "알 수 없는 오류"}`);
  }

  console.log("✅ [setAssociationAdmin] 협회 관리자 권한 부여 완료:", { uid, associationId });
}

/**
 * HTTP 호출 가능한 Cloud Function
 * 
 * 사용법:
 * const setAdminFn = httpsCallable(functions, "setAssociationAdmin");
 * await setAdminFn({ uid: "USER_UID", associationId: "assoc-nowon-football" });
 */
/**
 * HTTP 호출 가능한 Cloud Function (단순화 버전)
 * 🔥 Firestore 접근 제거, Claims만 설정
 */
export const setAssociationAdminCallable = onCall(
  {
    region: "asia-northeast3",
    cors: true,
  },
  async (request) => {
    // 🔥 최초 1회 부여용: 로그인만 확인 (권한 체크 없음)
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    }

    const { uid, associationId } = request.data || {};

    console.log("🔥 [setAssociationAdminCallable] 호출됨:", {
      uid,
      associationId,
      callerUid: request.auth.uid,
    });

    // 파라미터 검증
    if (!uid || !associationId) {
      throw new HttpsError(
        "invalid-argument",
        "uid와 associationId가 필요합니다."
      );
    }

    try {
      // 🔥 Claims만 설정 (Firestore 접근 없음)
      await setAssociationAdmin(uid, associationId);

      console.log("✅ [setAssociationAdminCallable] 완료:", { uid, associationId });

      return {
        success: true,
        message: `협회 관리자 권한이 부여되었습니다: ${uid}`,
      };
    } catch (error: any) {
      // 상세 에러 로깅
      console.error("❌ [setAssociationAdminCallable] 에러 발생:", {
        errorType: error?.constructor?.name,
        errorCode: error?.code,
        errorMessage: error?.message,
        errorStack: error?.stack?.substring(0, 500),
      });

      // HttpsError는 그대로 재던지기
      if (error instanceof HttpsError) {
        throw error;
      }

      // Admin SDK 에러 처리
      if (error?.code === "auth/user-not-found") {
        throw new HttpsError("not-found", `사용자를 찾을 수 없습니다: ${uid}`);
      }

      if (error?.code === "auth/invalid-uid") {
        throw new HttpsError("invalid-argument", `유효하지 않은 UID입니다: ${uid}`);
      }

      // 기타 에러는 internal로 변환
      const errorMessage = error?.message || "알 수 없는 오류";
      const errorCode = error?.code || "unknown";

      throw new HttpsError(
        "internal",
        `Custom Claims 설정 중 오류가 발생했습니다: ${errorMessage} (코드: ${errorCode})`,
        {
          originalError: errorMessage,
          originalCode: errorCode,
        }
      );
    }
  }
);

