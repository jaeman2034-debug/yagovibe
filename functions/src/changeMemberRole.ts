/**
 * 🔥 멤버 role 변경 Cloud Function (F-3 LOCK)
 * 
 * 권한 위임은 반드시 서버에서
 * hasPower 기반 권한 검증
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import * as admin from "firebase-admin";
import { writeAuditLog, extractRequestInfo } from "./utils/auditLog";

const db = getFirestore();

type Role = "owner" | "coach" | "staff" | "member";

const ROLE_POWER: Record<Role, number> = {
  owner: 100,
  coach: 80,
  staff: 50,
  member: 10,
};

function hasPower(myRole: Role, required: Role): boolean {
  return ROLE_POWER[myRole] >= ROLE_POWER[required];
}

function isValidRole(role: string): role is Role {
  return role in ROLE_POWER;
}

interface ChangeMemberRoleRequest {
  teamId: string;
  targetUid: string;
  role: Role;
}

interface ChangeMemberRoleResponse {
  ok: boolean;
}

export const changeMemberRole = onCall(
  {
    region: "asia-northeast3",
    maxInstances: 10,
  },
  async (request): Promise<ChangeMemberRoleResponse> => {
    const { auth, data } = request;

    // 1️⃣ 인증 확인
    const uid = auth?.uid;
    if (!uid) {
      throw new HttpsError("unauthenticated", "AUTH_REQUIRED");
    }

    const { teamId, targetUid, role } = data as ChangeMemberRoleRequest;

    // 2️⃣ 입력 검증
    if (!teamId || !targetUid || !role) {
      throw new HttpsError("invalid-argument", "INVALID_INPUT");
    }

    if (!isValidRole(role)) {
      throw new HttpsError("invalid-argument", "INVALID_ROLE");
    }

    logger.info("🔥 [changeMemberRole] role 변경 시작", { uid, teamId, targetUid, role });

    // 3️⃣ 트랜잭션으로 role 변경
    try {
      await db.runTransaction(async (tx) => {
        const actorRef = db.collection("teams").doc(teamId).collection("members").doc(uid);
        const targetRef = db.collection("teams").doc(teamId).collection("members").doc(targetUid);

        const actorSnap = await tx.get(actorRef);
        const targetSnap = await tx.get(targetRef);

        if (!actorSnap.exists || !targetSnap.exists) {
          throw new HttpsError("not-found", "MEMBER_NOT_FOUND");
        }

        const actorRole = actorSnap.data()!.role as Role;
        const targetRole = targetSnap.data()!.role as Role;

        // ✅ 최소 조건: coach 이상만 가능
        if (!hasPower(actorRole, "coach")) {
          throw new HttpsError("permission-denied", "FORBIDDEN");
        }

        // ✅ 자기보다 높은 권한은 수정 불가
        if (!hasPower(actorRole, targetRole)) {
          throw new HttpsError("permission-denied", "CANNOT_EDIT_HIGHER_ROLE");
        }

        // ✅ owner는 owner만 수정 가능
        if (targetRole === "owner" && actorRole !== "owner") {
          throw new HttpsError("permission-denied", "OWNER_ONLY");
        }

        // ✅ 같은 role로 변경 시도 → 불필요
        if (targetRole === role) {
          throw new HttpsError("failed-precondition", "ALREADY_SAME_ROLE");
        }

        // 4️⃣ role 업데이트
        tx.update(targetRef, {
          role,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // 5️⃣ 역인덱스 업데이트
        const teamMemberRef = db.collection("team_members").doc(`${teamId}_${targetUid}`);
        const teamMemberSnap = await tx.get(teamMemberRef);
        if (teamMemberSnap.exists) {
          tx.update(teamMemberRef, {
            role,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }

        logger.info("✅ [changeMemberRole] role 변경 완료", {
          teamId,
          targetUid,
          oldRole: targetRole,
          newRole: role,
          actorUid: uid,
          actorRole,
        });
      });

      // 🔥 AuditLog 기록
      const requestInfo = extractRequestInfo((request as any).rawRequest || {});
      const actorMemberRef = db.doc(`teams/${teamId}/members/${uid}`);
      const actorMemberSnap = await actorMemberRef.get();
      const actorRole = (actorMemberSnap.data()?.role as Role) || "member";

      // 🔥 L-3: AuditLog 기록 (트랜잭션 성공 이후)
      await writeAuditLog({
        actorUid: uid,
        actorRole: actorRole,
        teamId,
        targetUid: targetUid,
        targetType: "member",
        action: "member.role.change",
        summary: `${actorRole} ${uid} changed member ${targetUid} role from ${targetRole} to ${role} in team ${teamId}`,
        metadata: {
          before: { role: targetRole },
          after: { role: role },
        },
        ua: requestInfo.userAgent,
        ip: requestInfo.ip,
      });

      return { ok: true };
    } catch (error: any) {
      logger.error("❌ [changeMemberRole] role 변경 실패", {
        uid,
        teamId,
        targetUid,
        error: error.message,
        stack: error.stack,
      });

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError("internal", "권한 변경 중 오류가 발생했습니다.");
    }
  }
);

