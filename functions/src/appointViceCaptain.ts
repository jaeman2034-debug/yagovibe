/**
 * 🔥 부팀장 임명 Cloud Function
 * 
 * 역할:
 * - 팀장이 팀원을 부팀장으로 임명
 * - 부팀장은 운영 보조 권한 (가입 승인, 공지 관리 등)
 * - 팀장 단일성 유지 (teams.ownerUid 변경 안 함)
 * 
 * 규칙:
 * - 팀장만 부팀장 임명 가능
 * - 대상은 MEMBER여야 함
 * - 부팀장은 여러 명 가능
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import * as admin from "firebase-admin";

const db = getFirestore();

interface AppointViceCaptainRequest {
  teamId: string;
  targetUid: string;
}

export const appointViceCaptain = onCall(
  {
    region: "asia-northeast3",
    maxInstances: 10,
  },
  async (request): Promise<{ ok: boolean }> => {
    const { auth, data } = request;

    // 1️⃣ 인증 확인
    if (!auth || !auth.uid) {
      logger.warn("❌ [appointViceCaptain] 인증되지 않은 요청");
      throw new HttpsError("unauthenticated", "AUTH_REQUIRED");
    }

    const uid = auth.uid;
    const { teamId, targetUid } = data as AppointViceCaptainRequest;

    if (!teamId || !targetUid) {
      throw new HttpsError("invalid-argument", "INVALID_INPUT");
    }

    if (uid === targetUid) {
      throw new HttpsError("invalid-argument", "CANNOT_APPOINT_SELF");
    }

    logger.info("🔥 [appointViceCaptain] 부팀장 임명 시작", { uid, teamId, targetUid });

    // 2️⃣ 트랜잭션으로 부팀장 임명
    try {
      await db.runTransaction(async (transaction) => {
        // 2-1. 팀 정보 확인
        const teamRef = db.doc(`teams/${teamId}`);
        const teamSnap = await transaction.get(teamRef);

        if (!teamSnap.exists) {
          throw new HttpsError("not-found", "TEAM_NOT_FOUND");
        }

        const teamData = teamSnap.data()!;
        const ownerUid = teamData.ownerUid;

        // 2-2. 호출자가 팀장인지 확인
        if (uid !== ownerUid) {
          const callerMemberRef = db.doc(`teams/${teamId}/members/${uid}`);
          const callerMemberSnap = await transaction.get(callerMemberRef);
          
          if (!callerMemberSnap.exists) {
            throw new HttpsError("permission-denied", "NOT_TEAM_MEMBER");
          }

          const callerMemberData = callerMemberSnap.data()!;
          const callerRole = callerMemberData.role;
          const callerAccessLevel = callerMemberData.accessLevel;

          // 팀장 또는 부팀장만 임명 가능 (부팀장은 다른 부팀장 임명 불가)
          if (uid !== ownerUid && callerRole !== "owner" && callerAccessLevel !== "OWNER") {
            throw new HttpsError("permission-denied", "CAPTAIN_ONLY");
          }
        }

        // 2-3. 대상 멤버 확인
        const targetMemberRef = db.doc(`teams/${teamId}/members/${targetUid}`);
        const targetMemberSnap = await transaction.get(targetMemberRef);

        if (!targetMemberSnap.exists) {
          throw new HttpsError("not-found", "MEMBER_NOT_FOUND");
        }

        const targetMemberData = targetMemberSnap.data()!;
        const currentRole = targetMemberData.role;
        const currentAccessLevel = targetMemberData.accessLevel;

        // 이미 부팀장이면 스킵
        if (currentRole === "vice" || currentRole === "부팀장" || currentAccessLevel === "ADMIN") {
          logger.warn("⚠️ [appointViceCaptain] 이미 부팀장", { teamId, targetUid });
          return; // 성공으로 처리 (idempotent)
        }

        // 2-4. 부팀장으로 임명
        transaction.update(targetMemberRef, {
          role: "vice",
          accessLevel: "ADMIN", // 관리 권한 부여
          updatedAt: FieldValue.serverTimestamp(),
        });

        logger.info("✅ [appointViceCaptain] 부팀장 임명 완료", {
          teamId,
          targetUid,
          oldRole: currentRole,
          newRole: "vice",
        });
      });

      // 3️⃣ 알림 발송
      try {
        const teamSnap = await db.doc(`teams/${teamId}`).get();
        const teamName = teamSnap.exists ? (teamSnap.data()?.name || "팀") : "팀";

        const userSnap = await db.doc(`users/${targetUid}`).get();
        const userName = userSnap.exists 
          ? (userSnap.data()?.displayName || userSnap.data()?.name || targetUid)
          : targetUid;

        const notificationRef = db.collection("notifications").doc();
        await notificationRef.set({
          userId: targetUid,
          type: "TEAM_CAPTAIN_DELEGATED", // 재사용 (부팀장 임명용)
          teamId,
          title: "부팀장으로 임명되었어요",
          message: `🛡️ ${teamName}의 부팀장으로 임명되었어요. 팀 운영을 도와주세요.`,
          link: `/me/team/${teamId}/manage`,
          isRead: false,
          createdAt: FieldValue.serverTimestamp(),
        });

        logger.info("✅ [appointViceCaptain] 알림 발송 완료", { targetUid, teamId });
      } catch (notifError) {
        logger.warn("⚠️ [appointViceCaptain] 알림 발송 실패 (무시)", { error: notifError });
      }

      logger.info("✅ [appointViceCaptain] 부팀장 임명 완료", { uid, teamId, targetUid });

      return { ok: true };
    } catch (error: any) {
      logger.error("❌ [appointViceCaptain] 부팀장 임명 실패", {
        uid,
        teamId,
        targetUid,
        error: error.message,
        code: error.code,
      });

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError("internal", "부팀장 임명 중 오류가 발생했습니다.");
    }
  }
);
