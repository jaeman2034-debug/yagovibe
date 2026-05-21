/**
 * 🔐 QR 초대 토큰 검증 Cloud Function (v1 LOCK)
 * 
 * 역할:
 * - inviteId로 초대 검증
 * - 팀 정보 반환 (QR에는 inviteId만 포함)
 * - 사용 가능 여부 확인
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions";

const db = getFirestore();

interface VerifyInviteRequest {
  inviteId: string;
}

interface VerifyInviteResponse {
  valid: boolean;
  teamId?: string;
  role?: string;
  teamName?: string;
  teamRegion?: string;
  teamSportType?: string;
  coachName?: string;
  error?: string;
}

export const verifyInvite = onCall(
  {
    region: "asia-northeast3",
    maxInstances: 10,
  },
  async (request): Promise<VerifyInviteResponse> => {
    const { data } = request;
    const { inviteId } = data as VerifyInviteRequest;

    // 1️⃣ 입력 검증
    if (!inviteId || !inviteId.trim()) {
      return {
        valid: false,
        error: "INVITE_REQUIRED",
      };
    }

    try {
      // 2️⃣ invite 조회
      const inviteRef = db.doc(`invites/${inviteId}`);
      const inviteSnap = await inviteRef.get();

      if (!inviteSnap.exists) {
        return {
          valid: false,
          error: "INVITE_NOT_FOUND",
        };
      }

      const invite = inviteSnap.data()!;

      // 3️⃣ 취소 확인
      if (invite.revoked === true) {
        return {
          valid: false,
          error: "INVITE_REVOKED",
        };
      }

      // 4️⃣ 만료 시간 확인
      const expiresAt = invite.expiresAt?.toDate();
      if (!expiresAt || expiresAt < new Date()) {
        return {
          valid: false,
          error: "INVITE_EXPIRED",
        };
      }

      // 5️⃣ 사용 횟수 확인
      if (
        typeof invite.maxUses === "number" &&
        typeof invite.usedCount === "number"
      ) {
        if (invite.usedCount >= invite.maxUses) {
          return {
            valid: false,
            error: "INVITE_USED_UP",
          };
        }
      }

      // 6️⃣ 팀 정보 조회
      const teamRef = db.doc(`teams/${invite.teamId}`);
      const teamSnap = await teamRef.get();

      if (!teamSnap.exists) {
        return {
          valid: false,
          error: "TEAM_NOT_FOUND",
        };
      }

      const teamData = teamSnap.data()!;

      // 7️⃣ 팀 상태 확인
      if (teamData.status === "inactive" || teamData.isDeleted === true) {
        return {
          valid: false,
          error: "TEAM_INACTIVE",
        };
      }

      // 8️⃣ 코치 정보 조회 (선택)
      let coachName: string | undefined;
      if (teamData.coachId) {
        const coachRef = db.doc(`users/${teamData.coachId}`);
        const coachSnap = await coachRef.get();
        if (coachSnap.exists) {
          coachName = coachSnap.data()?.displayName || coachSnap.data()?.name;
        }
      }

      logger.info("✅ [verifyInvite] 초대 검증 성공", {
        inviteId,
        teamId: invite.teamId,
        role: invite.role,
      });

      return {
        valid: true,
        teamId: invite.teamId,
        role: invite.role,
        teamName: teamData.name,
        teamRegion: teamData.region,
        teamSportType: teamData.sportType,
        coachName,
      };
    } catch (error: any) {
      logger.error("❌ [verifyInvite] 초대 검증 실패", error);
      return {
        valid: false,
        error: "VERIFY_ERROR",
      };
    }
  }
);

