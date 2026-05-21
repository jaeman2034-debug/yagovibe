/**
 * 🔐 QR 초대 토큰 검증 Cloud Function
 * 
 * 역할:
 * - QR 토큰 유효성 검증
 * - 팀 정보 반환
 * - 사용 가능 여부 확인
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions";

const db = getFirestore();

interface VerifyInviteTokenRequest {
  tokenId: string;
}

interface VerifyInviteTokenResponse {
  valid: boolean;
  teamId?: string;
  role?: string;
  teamName?: string;
  teamRegion?: string;
  teamSportType?: string;
  coachName?: string;
  error?: string;
}

export const verifyInviteToken = onCall(
  {
    region: "asia-northeast3",
    maxInstances: 10,
  },
  async (request): Promise<VerifyInviteTokenResponse> => {
    const { data } = request;
    const { tokenId } = data as VerifyInviteTokenRequest;

    // 1️⃣ 입력 검증
    if (!tokenId || !tokenId.trim()) {
      return {
        valid: false,
        error: "토큰 ID가 필요합니다.",
      };
    }

    try {
      // 2️⃣ 토큰 조회
      const tokenRef = db.doc(`invite_tokens/${tokenId}`);
      const tokenSnap = await tokenRef.get();

      if (!tokenSnap.exists) {
        return {
          valid: false,
          error: "유효하지 않은 초대입니다.",
        };
      }

      const tokenData = tokenSnap.data()!;

      // 3️⃣ 활성화 상태 확인
      if (!tokenData.isActive) {
        return {
          valid: false,
          error: "취소된 초대입니다.",
        };
      }

      // 4️⃣ 만료 시간 확인
      const expiresAt = tokenData.expiresAt?.toDate();
      if (!expiresAt || expiresAt < new Date()) {
        return {
          valid: false,
          error: "만료된 초대입니다.",
        };
      }

      // 5️⃣ 사용 횟수 확인 (온라인용)
      if (tokenData.maxUses && tokenData.usedCount >= tokenData.maxUses) {
        return {
          valid: false,
          error: "초대 사용 횟수를 초과했습니다.",
        };
      }

      // 6️⃣ 팀 정보 조회
      const teamRef = db.doc(`teams/${tokenData.teamId}`);
      const teamSnap = await teamRef.get();

      if (!teamSnap.exists) {
        return {
          valid: false,
          error: "팀을 찾을 수 없습니다.",
        };
      }

      const teamData = teamSnap.data()!;

      // 7️⃣ 팀 상태 확인
      if (teamData.status === "inactive" || teamData.isDeleted === true) {
        return {
          valid: false,
          error: "비활성화된 팀입니다.",
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

      logger.info("✅ [verifyInviteToken] 토큰 검증 성공", {
        tokenId,
        teamId: tokenData.teamId,
        role: tokenData.role,
      });

      return {
        valid: true,
        teamId: tokenData.teamId,
        role: tokenData.role,
        teamName: teamData.name,
        teamRegion: teamData.region,
        teamSportType: teamData.sportType,
        coachName,
      };
    } catch (error: any) {
      logger.error("❌ [verifyInviteToken] 토큰 검증 실패", error);
      return {
        valid: false,
        error: "토큰 검증 중 오류가 발생했습니다.",
      };
    }
  }
);

