/**
 * 🔥 팀 멤버 강퇴 Cloud Function (J-2)
 * 
 * 규칙:
 * - coach 이상만 가능
 * - 자기보다 권한 높은 멤버 강퇴 불가
 * - owner 강퇴 ❌
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import * as admin from "firebase-admin";
/** 허브·레거시 role 문자열 → 추방 권한 점수 (높을수록 강함) */
function removalRolePower(roleRaw: unknown): number {
  const r = String(roleRaw ?? "member")
    .trim()
    .toLowerCase();
  if (r === "owner" || r === "admin") return 100;
  if (r === "coach" || r === "manager") return 80;
  if (r === "staff") return 50;
  if (r === "vice" || r === "부팀장") return 45;
  return 10;
}
import { writeAuditLog, extractRequestInfo } from "./utils/auditLog";

const db = getFirestore();

interface RemoveMemberRequest {
  teamId: string;
  targetUid: string;
}

export const removeMember = onCall(
  {
    region: "asia-northeast3",
    maxInstances: 10,
  },
  async (request): Promise<{ ok: boolean }> => {
    const { auth, data } = request;

    // 1️⃣ 인증 확인
    if (!auth || !auth.uid) {
      logger.warn("❌ [removeMember] 인증되지 않은 요청");
      throw new HttpsError("unauthenticated", "AUTH_REQUIRED");
    }

    const uid = auth.uid;
    const { teamId, targetUid } = data as RemoveMemberRequest;

    if (!teamId || !targetUid) {
      throw new HttpsError("invalid-argument", "INVALID_INPUT");
    }

    logger.info("🔥 [removeMember] 멤버 강퇴 시작", { uid, teamId, targetUid });

    let actorRoleLabel = "unknown";
    let targetRoleLabel = "unknown";

    // 2️⃣ 트랜잭션으로 강퇴 처리
    try {
      await db.runTransaction(async (transaction) => {
        const actorRef = db.collection("teams").doc(teamId).collection("members").doc(uid);
        const targetRef = db.collection("teams").doc(teamId).collection("members").doc(targetUid);
        const teamRef = db.collection("teams").doc(teamId);

        const [actorSnap, targetSnap, teamSnap] = await Promise.all([
          transaction.get(actorRef),
          transaction.get(targetRef),
          transaction.get(teamRef),
        ]);

        if (!actorSnap.exists || !targetSnap.exists) {
          throw new HttpsError("not-found", "MEMBER_NOT_FOUND");
        }
        if (!teamSnap.exists) {
          throw new HttpsError("not-found", "TEAM_NOT_FOUND");
        }

        const actorRoleRaw = actorSnap.data()!.role;
        const targetRoleRaw = targetSnap.data()!.role;
        actorRoleLabel = String(actorRoleRaw ?? "member");
        targetRoleLabel = String(targetRoleRaw ?? "member");
        const teamData = teamSnap.data() || {};
        const currentSeatUsedRaw = Number((teamData as { seatUsed?: unknown }).seatUsed);
        const currentSeatUsed = Number.isFinite(currentSeatUsedRaw) ? currentSeatUsedRaw : 0;
        const nextSeatUsed = Math.max(0, currentSeatUsed - 1);

        const actorPower = removalRolePower(actorRoleRaw);
        const targetPower = removalRolePower(targetRoleRaw);
        const targetLc = targetRoleLabel.trim().toLowerCase();

        // 🔥 J-2: coach(80점) 이상만 가능
        if (actorPower < 80) {
          throw new HttpsError("permission-denied", "FORBIDDEN");
        }

        // 🔥 J-2: 자기보다 권한 높은 멤버 강퇴 불가
        if (actorPower < targetPower) {
          throw new HttpsError("permission-denied", "CANNOT_REMOVE_HIGHER");
        }

        // 🔥 J-2: 팀장·관리자 역할 강퇴 ❌
        if (targetLc === "owner" || targetLc === "admin") {
          throw new HttpsError("failed-precondition", "CANNOT_REMOVE_OWNER");
        }

        // 음수 seatUsed 방지: 최소 0으로 clamp
        transaction.delete(targetRef);
        transaction.update(teamRef, {
          seatUsed: nextSeatUsed,
        });

        logger.info("✅ [removeMember] 멤버 삭제 및 좌석 차감", {
          uid,
          teamId,
          targetUid,
          actorRole: actorRoleLabel,
          targetRole: targetRoleLabel,
          beforeSeatUsed: currentSeatUsed,
          afterSeatUsed: nextSeatUsed,
        });
      });

      // 🔥 L-3: AuditLog 기록 (트랜잭션 성공 이후)
      const requestInfo = extractRequestInfo((request as any).rawRequest || {});
      await writeAuditLog({
        actorUid: uid,
        actorRole: actorRoleLabel,
        teamId,
        targetUid,
        targetType: "member",
        action: "member.remove",
        summary: `${actorRoleLabel} ${uid} removed member ${targetUid} from team ${teamId}`,
        metadata: {
          removedBy: uid,
          targetRole: targetRoleLabel,
        },
        ua: requestInfo.userAgent,
        ip: requestInfo.ip,
      });

      // 🔥 알림 생성: 추방된 팀원에게 알림
      try {
        const teamSnap = await db.collection("teams").doc(teamId).get();
        const teamName = teamSnap.exists ? (teamSnap.data()?.name || "팀") : "팀";
        
        const notificationRef = db.collection("notifications").doc();
        await notificationRef.set({
          userId: targetUid,
          type: "TEAM_MEMBER_REMOVED",
          teamId,
          title: "팀에서 제외되었어요",
          message: `ℹ️ ${teamName}에서 제외되었어요. 다른 팀에 가입하거나 새 팀을 만들 수 있어요.`,
          link: "/me", // 🔥 /me로 이동하여 P1 상태로 자연 복귀
          isRead: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        logger.info("✅ [removeMember] 알림 생성 완료", { targetUid, teamId });
      } catch (notifError) {
        logger.warn("⚠️ [removeMember] 알림 생성 실패 (무시)", { error: notifError });
        // 알림 실패는 전체 작업을 실패시키지 않음
      }

      logger.info("✅ [removeMember] 멤버 강퇴 완료", { uid, teamId, targetUid });

      return { ok: true };
    } catch (error: any) {
      logger.error("❌ [removeMember] 멤버 강퇴 실패", {
        uid,
        teamId,
        targetUid,
        error: error.message,
        code: error.code,
      });

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError("internal", "멤버 강퇴 중 오류가 발생했습니다.");
    }
  }
);

