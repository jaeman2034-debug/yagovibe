import { onCall } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

if (!getApps().length) {
  initializeApp();
}

/**
 * 사용자에게 역할(Role) 부여
 * Firebase Auth Custom Claims에 role 추가
 * 
 * 사용 예시:
 * - 관리자: setUserRole({ uid: "xxx", role: "admin" })
 * - 매니저: setUserRole({ uid: "xxx", role: "manager" })
 * - 뷰어: setUserRole({ uid: "xxx", role: "viewer" })
 */
export const setUserRole = onCall(
  {
    region: "asia-northeast3",
    cors: true,
  },
  async (request) => {
    try {
      // 호출자 권한 확인 (관리자만 가능)
      const callerUid = request.auth?.uid;
      if (!callerUid) {
        throw new Error("인증이 필요합니다.");
      }

      // 호출자의 역할 확인
      const caller = await getAuth().getUser(callerUid);
      const callerRole = caller.customClaims?.role;

      if (callerRole !== "admin") {
        throw new Error("관리자 권한이 필요합니다.");
      }

      const { uid, role } = request.data;

      if (!uid || !role) {
        throw new Error("uid와 role이 필요합니다.");
      }

      if (!["admin", "manager", "viewer"].includes(role)) {
        throw new Error("유효하지 않은 역할입니다. (admin, manager, viewer만 가능)");
      }

      // Custom Claims 설정
      await getAuth().setCustomUserClaims(uid, { role });

      logger.info(`✅ ${uid} → ${role} 역할 부여 완료 (by ${callerUid})`);

      return {
        ok: true,
        message: `${uid}에게 ${role} 역할이 부여되었습니다.`,
      };
    } catch (error: any) {
      logger.error("❌ 역할 부여 오류:", error);
      throw new Error(error.message || "역할 부여 실패");
    }
  }
);

