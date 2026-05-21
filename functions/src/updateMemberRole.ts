/**
 * 🔥 멤버 role 변경 Callable 함수 (role 덮어쓰기 방지)
 * 
 * 원칙:
 * - admin → member 변경: 가능 (권한 축소)
 * - member → admin 변경: owner만 가능 (권한 확대)
 * - admin → admin 변경: 불필요 (에러)
 * - member → member 변경: 불필요 (에러)
 * - 팀 생성자(owner)의 role 변경: 금지
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import * as admin from "firebase-admin";
import { writeAuditLog, extractRequestInfo } from "./utils/auditLog";

const db = getFirestore();

interface UpdateMemberRoleRequest {
  teamId: string;
  targetUid: string;
  newRole: "admin" | "member";
}

interface UpdateMemberRoleResponse {
  success: boolean;
  message: string;
}

export const updateMemberRole = onCall(
  {
    region: "asia-northeast3",
    maxInstances: 10,
  },
  async (request): Promise<UpdateMemberRoleResponse> => {
    const { auth, data } = request;

    // 1️⃣ 인증 확인
    if (!auth || !auth.uid) {
      logger.warn("❌ [updateMemberRole] 인증되지 않은 요청");
      throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    }

    const callerUid = auth.uid;
    const { teamId, targetUid, newRole } = data as UpdateMemberRoleRequest;

    // 2️⃣ 입력 검증
    if (!teamId || !targetUid || !newRole) {
      throw new HttpsError("invalid-argument", "필수 필드가 누락되었습니다.");
    }

    if (!["admin", "member"].includes(newRole)) {
      throw new HttpsError("invalid-argument", "유효하지 않은 role입니다.");
    }

    logger.info("🔥 [updateMemberRole] role 변경 시작", { callerUid, teamId, targetUid, newRole });

    // 3️⃣ 트랜잭션으로 role 변경
    try {
      const result = await db.runTransaction(async (transaction) => {
        // 3-1. 팀 존재 확인
        const teamRef = db.doc(`teams/${teamId}`);
        const teamSnap = await transaction.get(teamRef);
        
        if (!teamSnap.exists) {
          throw new HttpsError("not-found", "팀을 찾을 수 없습니다.");
        }

        const teamData = teamSnap.data()!;
        const ownerUid = teamData.ownerUid || teamData.ownerId;

        // 3-2. 팀 생성자(owner)의 role 변경 금지
        if (targetUid === ownerUid) {
          logger.warn("⚠️ [updateMemberRole] 팀 생성자의 role 변경 시도", { teamId, targetUid });
          throw new HttpsError(
            "permission-denied",
            "팀 생성자의 권한은 변경할 수 없습니다."
          );
        }

        // 3-3. 호출자 권한 확인 (admin만 가능)
        const callerMemberRef = db.doc(`teams/${teamId}/members/${callerUid}`);
        const callerMemberSnap = await transaction.get(callerMemberRef);
        
        if (!callerMemberSnap.exists) {
          throw new HttpsError("permission-denied", "팀 멤버가 아닙니다.");
        }

        const callerMemberData = callerMemberSnap.data()!;
        const callerRole = callerMemberData.role;

        // owner 또는 admin만 role 변경 가능
        if (callerUid !== ownerUid && callerRole !== "admin") {
          throw new HttpsError("permission-denied", "권한이 없습니다.");
        }

        // 3-4. 대상 멤버 확인
        const targetMemberRef = db.doc(`teams/${teamId}/members/${targetUid}`);
        const targetMemberSnap = await transaction.get(targetMemberRef);
        
        if (!targetMemberSnap.exists) {
          throw new HttpsError("not-found", "멤버를 찾을 수 없습니다.");
        }

        const targetMemberData = targetMemberSnap.data()!;
        const currentRole = targetMemberData.role;

        // 3-5. role 변경 검증
        // 같은 role로 변경 시도 → 불필요
        if (currentRole === newRole) {
          logger.warn("⚠️ [updateMemberRole] 같은 role로 변경 시도", { teamId, targetUid, currentRole, newRole });
          throw new HttpsError(
            "failed-precondition",
            `이미 ${newRole} 권한입니다.`
          );
        }

        // member → admin: owner만 가능 (권한 확대)
        if (currentRole === "member" && newRole === "admin") {
          if (callerUid !== ownerUid) {
            throw new HttpsError(
              "permission-denied",
              "admin 권한 부여는 팀 생성자만 가능합니다."
            );
          }
        }

        // admin → member: admin 이상 가능 (권한 축소)
        // (이미 권한 체크 완료)

        // 3-6. role 업데이트
        transaction.update(targetMemberRef, {
          role: newRole,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        logger.info("✅ [updateMemberRole] role 변경 완료", {
          teamId,
          targetUid,
          currentRole,
          newRole,
          callerUid,
        });

        // 3-7. 역인덱스 업데이트 (선택적)
        const teamMemberRef = db.collection("team_members").doc(`${teamId}_${targetUid}`);
        const teamMemberSnap = await transaction.get(teamMemberRef);
        if (teamMemberSnap.exists) {
          transaction.update(teamMemberRef, {
            role: newRole,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }

        return { success: true, currentRole, newRole };
      });

      // 🔥 AuditLog 기록 (트랜잭션 외부 - 실패해도 role 변경은 성공)
      const requestInfo = extractRequestInfo((request as any).rawRequest || {});
      const callerMemberRef = db.doc(`teams/${teamId}/members/${callerUid}`);
      const callerMemberSnap = await callerMemberRef.get();
      const callerRole = (callerMemberSnap.data()?.role as "admin" | "member") || "member";

      await writeAuditLog({
        teamId,
        action: "ROLE_CHANGED",
        actorUid: callerUid,
        actorRole: callerRole === "admin" ? "admin" : "member",
        targetUid: targetUid,
        meta: {
          oldRole: result.currentRole,
          newRole: result.newRole,
        },
        ip: requestInfo.ip,
        userAgent: requestInfo.userAgent,
      });

      return {
        success: result.success,
        message: "권한이 성공적으로 변경되었습니다.",
      };
    } catch (error: any) {
      logger.error("❌ [updateMemberRole] role 변경 실패", {
        callerUid,
        teamId,
        targetUid,
        error: error.message,
        stack: error.stack,
      });

      // HttpsError는 그대로 전달
      if (error instanceof HttpsError) {
        throw error;
      }

      // 기타 에러는 내부 에러로 변환
      throw new HttpsError(
        "internal",
        "권한 변경 중 오류가 발생했습니다. 다시 시도해주세요."
      );
    }
  }
);

