/**
 * 🔥 팀 삭제 Cloud Function (J-4)
 * 
 * 규칙:
 * - owner만 가능
 * - 물리 삭제 X → soft delete
 * - 데이터 복구 가능성 유지
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import * as admin from "firebase-admin";
import { writeAuditLog, extractRequestInfo } from "./utils/auditLog";

const db = getFirestore();

interface DeleteTeamRequest {
  teamId: string;
}

export const deleteTeam = onCall(
  {
    region: "asia-northeast3",
    maxInstances: 10,
  },
  async (request): Promise<{ ok: boolean }> => {
    const { auth, data } = request;

    // 1️⃣ 인증 확인
    if (!auth || !auth.uid) {
      logger.warn("❌ [deleteTeam] 인증되지 않은 요청");
      throw new HttpsError("unauthenticated", "AUTH_REQUIRED");
    }

    const uid = auth.uid;
    const { teamId } = data as DeleteTeamRequest;

    if (!teamId || !teamId.trim()) {
      throw new HttpsError("invalid-argument", "TEAM_ID_REQUIRED");
    }

    logger.info("🔥 [deleteTeam] 팀 삭제 시작", { uid, teamId });

    // 2️⃣ Owner 권한 확인
    try {
      const ownerRef = db.collection("teams").doc(teamId).collection("members").doc(uid);
      const ownerSnap = await ownerRef.get();

      if (!ownerSnap.exists || ownerSnap.data()!.role !== "owner") {
        logger.warn("⚠️ [deleteTeam] Owner 권한 없음", { uid, teamId });
        throw new HttpsError("permission-denied", "OWNER_ONLY");
      }

      // 3️⃣ Soft Delete (물리 삭제 X)
      const teamRef = db.collection("teams").doc(teamId);
      await teamRef.update({
        deletedAt: admin.firestore.FieldValue.serverTimestamp(),
        isDeleted: true,
        status: "deleted",
      });

      // 🔥 L-3: AuditLog 기록 (트랜잭션 성공 이후)
      const requestInfo = extractRequestInfo((request as any).rawRequest || {});
      await writeAuditLog({
        actorUid: uid,
        actorRole: "owner",
        teamId,
        targetType: "team",
        action: "team.delete",
        summary: `Owner ${uid} deleted team ${teamId} (soft delete)`,
        metadata: {
          softDelete: true,
        },
        ua: requestInfo.userAgent,
        ip: requestInfo.ip,
      });

      logger.info("✅ [deleteTeam] 팀 삭제 완료 (soft delete)", { uid, teamId });

      return { ok: true };
    } catch (error: any) {
      logger.error("❌ [deleteTeam] 팀 삭제 실패", {
        uid,
        teamId,
        error: error.message,
        code: error.code,
      });

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError("internal", "팀 삭제 중 오류가 발생했습니다.");
    }
  }
);

