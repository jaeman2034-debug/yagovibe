/**
 * 🔥 팀 자진 탈퇴 Cloud Function (J-1)
 * 
 * 규칙:
 * - owner는 다른 owner 지정 전 탈퇴 불가
 * - 탈퇴 시 seatUsed -1
 * - invites / audit 건드리지 않음
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import * as admin from "firebase-admin";
import { writeAuditLog, extractRequestInfo } from "./utils/auditLog";

const db = getFirestore();

interface LeaveTeamRequest {
  teamId: string;
}

export const leaveTeam = onCall(
  {
    region: "asia-northeast3",
    maxInstances: 10,
  },
  async (request): Promise<{ ok: boolean }> => {
    const { auth, data } = request;

    // 1️⃣ 인증 확인
    if (!auth || !auth.uid) {
      logger.warn("❌ [leaveTeam] 인증되지 않은 요청");
      throw new HttpsError("unauthenticated", "AUTH_REQUIRED");
    }

    const uid = auth.uid;
    const { teamId } = data as LeaveTeamRequest;

    if (!teamId || !teamId.trim()) {
      throw new HttpsError("invalid-argument", "TEAM_ID_REQUIRED");
    }

    logger.info("🔥 [leaveTeam] 팀 탈퇴 시작", { uid, teamId });

    // 2️⃣ 트랜잭션으로 탈퇴 처리
    try {
      await db.runTransaction(async (transaction) => {
        const teamRef = db.collection("teams").doc(teamId);
        const memberRef = teamRef.collection("members").doc(uid);

        const [teamSnap, memberSnap] = await Promise.all([
          transaction.get(teamRef),
          transaction.get(memberRef),
        ]);

        if (!memberSnap.exists) {
          throw new HttpsError("not-found", "NOT_MEMBER");
        }
        if (!teamSnap.exists) {
          throw new HttpsError("not-found", "TEAM_NOT_FOUND");
        }

        const memberData = memberSnap.data()!;
        const role = memberData.role;
        const teamData = teamSnap.data() || {};
        const currentSeatUsedRaw = Number((teamData as { seatUsed?: unknown }).seatUsed);
        const currentSeatUsed = Number.isFinite(currentSeatUsedRaw) ? currentSeatUsedRaw : 0;
        const nextSeatUsed = Math.max(0, currentSeatUsed - 1);

        // 🔥 J-0: owner는 다른 owner 지정 전 탈퇴 불가
        if (role === "owner") {
          logger.warn("⚠️ [leaveTeam] owner 탈퇴 시도", { uid, teamId });
          throw new HttpsError("failed-precondition", "OWNER_CANNOT_LEAVE");
        }

        // 음수 seatUsed 방지: 최소 0으로 clamp
        transaction.delete(memberRef);
        transaction.update(teamRef, {
          seatUsed: nextSeatUsed,
        });

        logger.info("✅ [leaveTeam] 멤버 삭제 및 좌석 차감", {
          uid,
          teamId,
          role,
          beforeSeatUsed: currentSeatUsed,
          afterSeatUsed: nextSeatUsed,
        });
      });

      // 🔥 L-3: AuditLog 기록 (트랜잭션 성공 이후)
      const requestInfo = extractRequestInfo((request as any).rawRequest || {});
      await writeAuditLog({
        actorUid: uid,
        actorRole: "member",
        teamId,
        targetUid: uid,
        targetType: "member",
        action: "member.leave",
        summary: `Member ${uid} left team ${teamId} (self leave)`,
        metadata: {
          selfLeave: true,
        },
        ua: requestInfo.userAgent,
        ip: requestInfo.ip,
      });

      logger.info("✅ [leaveTeam] 팀 탈퇴 완료", { uid, teamId });

      return { ok: true };
    } catch (error: any) {
      logger.error("❌ [leaveTeam] 팀 탈퇴 실패", {
        uid,
        teamId,
        error: error.message,
        code: error.code,
      });

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError("internal", "팀 탈퇴 중 오류가 발생했습니다.");
    }
  }
);

