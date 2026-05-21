/**
 * 🔥 현재 팀 컨텍스트 설정 Cloud Function (K-2)
 * 
 * 팀 전환의 유일한 통로
 * users/{uid}의 lastTeamId 업데이트
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import * as admin from "firebase-admin";

const db = getFirestore();

interface SetActiveTeamRequest {
  teamId: string;
}

export const setActiveTeam = onCall(
  {
    region: "asia-northeast3",
    maxInstances: 10,
  },
  async (request): Promise<{ ok: boolean }> => {
    const { auth, data } = request;

    // 1️⃣ 인증 확인
    if (!auth || !auth.uid) {
      logger.warn("❌ [setActiveTeam] 인증되지 않은 요청");
      throw new HttpsError("unauthenticated", "AUTH_REQUIRED");
    }

    const uid = auth.uid;
    const { teamId } = data as SetActiveTeamRequest;

    if (!teamId || !teamId.trim()) {
      throw new HttpsError("invalid-argument", "TEAM_ID_REQUIRED");
    }

    logger.info("🔥 [setActiveTeam] 팀 컨텍스트 설정 시작", { uid, teamId });

    // 2️⃣ 멤버십 확인
    try {
      const memberRef = db.collection("teams").doc(teamId).collection("members").doc(uid);
      const memberSnap = await memberRef.get();

      if (!memberSnap.exists) {
        logger.warn("⚠️ [setActiveTeam] 팀 멤버 아님", { uid, teamId });
        throw new HttpsError("permission-denied", "NOT_TEAM_MEMBER");
      }

      // 3️⃣ 팀 삭제 확인
      const teamRef = db.collection("teams").doc(teamId);
      const teamSnap = await teamRef.get();

      if (!teamSnap.exists) {
        throw new HttpsError("not-found", "TEAM_NOT_FOUND");
      }

      const teamData = teamSnap.data()!;
      if (teamData.isDeleted === true) {
        throw new HttpsError("failed-precondition", "TEAM_DELETED");
      }

      // 4️⃣ users/{uid} 업데이트 (K-1)
      await db.collection("users").doc(uid).update({
        lastTeamId: teamId,
        lastTeamAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      logger.info("✅ [setActiveTeam] 팀 컨텍스트 설정 완료", { uid, teamId });

      return { ok: true };
    } catch (error: any) {
      logger.error("❌ [setActiveTeam] 팀 컨텍스트 설정 실패", {
        uid,
        teamId,
        error: error.message,
        code: error.code,
      });

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError("internal", "팀 컨텍스트 설정 중 오류가 발생했습니다.");
    }
  }
);

