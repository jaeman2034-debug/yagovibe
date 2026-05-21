/**
 * 🔥 부팀장 해제 Cloud Function
 * 
 * 역할:
 * - 팀장이 부팀장을 일반 팀원으로 되돌림
 * - 부팀장 권한 제거
 * 
 * 규칙:
 * - 팀장만 부팀장 해제 가능
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import * as admin from "firebase-admin";

const db = getFirestore();

interface RemoveViceCaptainRequest {
  teamId: string;
  targetUid: string;
}

export const removeViceCaptain = onCall(
  {
    region: "asia-northeast3",
    maxInstances: 10,
  },
  async (request): Promise<{ ok: boolean }> => {
    const { auth, data } = request;

    // 1️⃣ 인증 확인
    if (!auth || !auth.uid) {
      logger.warn("❌ [removeViceCaptain] 인증되지 않은 요청");
      throw new HttpsError("unauthenticated", "AUTH_REQUIRED");
    }

    const uid = auth.uid;
    const { teamId, targetUid } = data as RemoveViceCaptainRequest;

    if (!teamId || !targetUid) {
      throw new HttpsError("invalid-argument", "INVALID_INPUT");
    }

    logger.info("🔥 [removeViceCaptain] 부팀장 해제 시작", { uid, teamId, targetUid });

    // 2️⃣ 트랜잭션으로 부팀장 해제
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
          throw new HttpsError("permission-denied", "CAPTAIN_ONLY");
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

        // 부팀장이 아니면 스킵
        if (currentRole !== "vice" && currentRole !== "부팀장" && currentAccessLevel !== "ADMIN") {
          logger.warn("⚠️ [removeViceCaptain] 부팀장 아님", { teamId, targetUid });
          return; // 성공으로 처리 (idempotent)
        }

        // 2-4. 일반 팀원으로 되돌림
        transaction.update(targetMemberRef, {
          role: "member",
          accessLevel: "STAFF", // 기본 권한으로 변경
          updatedAt: FieldValue.serverTimestamp(),
        });

        logger.info("✅ [removeViceCaptain] 부팀장 해제 완료", {
          teamId,
          targetUid,
          oldRole: currentRole,
          newRole: "member",
        });
      });

      logger.info("✅ [removeViceCaptain] 부팀장 해제 완료", { uid, teamId, targetUid });

      return { ok: true };
    } catch (error: any) {
      logger.error("❌ [removeViceCaptain] 부팀장 해제 실패", {
        uid,
        teamId,
        targetUid,
        error: error.message,
        code: error.code,
      });

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError("internal", "부팀장 해제 중 오류가 발생했습니다.");
    }
  }
);
