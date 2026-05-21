/**
 * 🔥 초대 취소 Cloud Function (E-4)
 * 
 * 코치/스태프가 초대를 취소할 수 있음
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import * as admin from "firebase-admin";
import { writeInviteAuditLog } from "./inviteAuditLog";
import { extractRequestInfo, writeAuditLog } from "./utils/auditLog";

const db = getFirestore();

interface RevokeInviteRequest {
  inviteId: string;
}

interface RevokeInviteResponse {
  ok: boolean;
  inviteId: string;
}

export const revokeInvite = onCall(
  {
    region: "asia-northeast3",
    maxInstances: 10,
  },
  async (request): Promise<RevokeInviteResponse> => {
    const { auth, data } = request;

    // 1️⃣ 인증 확인
    const uid = auth?.uid;
    if (!uid) {
      throw new HttpsError("unauthenticated", "AUTH_REQUIRED");
    }

    const { inviteId } = data as RevokeInviteRequest;

    if (!inviteId || !inviteId.trim()) {
      throw new HttpsError("invalid-argument", "INVITE_ID_REQUIRED");
    }

    // 2️⃣ invite 조회
    const inviteRef = db.doc(`invites/${inviteId}`);
    const inviteSnap = await inviteRef.get();

    if (!inviteSnap.exists) {
      throw new HttpsError("not-found", "INVITE_NOT_FOUND");
    }

    const invite = inviteSnap.data()!;
    const teamId = invite.teamId;

    // 3️⃣ 생성자 권한 확인 (본인이 생성한 초대만 취소 가능)
    if (invite.createdByUid !== uid) {
      // 팀 멤버 권한 확인 (coach/staff면 다른 사람 초대도 취소 가능)
      const memberRef = db.doc(`teams/${teamId}/members/${uid}`);
      const memberSnap = await memberRef.get();

      if (!memberSnap.exists) {
        throw new HttpsError("permission-denied", "NOT_TEAM_MEMBER");
      }

      const memberRole = memberSnap.data()?.role;
      if (memberRole !== "coach" && memberRole !== "staff") {
        throw new HttpsError("permission-denied", "INVITE_REVOKE_FORBIDDEN");
      }
    }

    // 4️⃣ 이미 취소된 경우
    if (invite.revoked === true) {
      return {
        ok: true,
        inviteId,
      };
    }

    // 5️⃣ 초대 취소
    await inviteRef.update({
      revoked: true,
      revokedAt: admin.firestore.Timestamp.now(),
      revokedByUid: uid,
    });

    // 🔥 E-5: 초대 취소 로그 기록 (초대 전용)
    const requestInfo = extractRequestInfo((request as any).rawRequest || {});
    await writeInviteAuditLog({
      inviteId,
      event: "revoked",
      uid,
      ua: requestInfo.userAgent,
      ip: requestInfo.ip,
      timestamp: admin.firestore.Timestamp.now(),
      metadata: {
        teamId,
        createdByUid: invite.createdByUid,
      },
    });

    // 🔥 L-3: AuditLog 기록 (트랜잭션 성공 이후)
    const memberRole = invite.createdByUid === uid ? "coach" : (await db.doc(`teams/${teamId}/members/${uid}`).get()).data()?.role || "coach";
    await writeAuditLog({
      actorUid: uid,
      actorRole: memberRole,
      teamId,
      targetType: "invite",
      action: "invite.revoke",
      summary: `${memberRole} ${uid} revoked invite ${inviteId} for team ${teamId}`,
      metadata: {
        inviteId,
        createdByUid: invite.createdByUid,
      },
      ua: requestInfo.userAgent,
      ip: requestInfo.ip,
    });

    logger.info("✅ [revokeInvite] 초대 취소 완료", {
      inviteId,
      uid,
      teamId,
    });

    return {
      ok: true,
      inviteId,
    };
  }
);

