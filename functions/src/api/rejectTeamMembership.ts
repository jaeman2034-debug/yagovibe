/**
 * 🔥 협회 회원 신청 거절 (협회 관리자 전용)
 * 
 * 노원구 축구협회 관리자가 회원 신청을 거절
 * 
 * 플로우:
 * 1. 팀 상태 확인 (pending만 거절 가능)
 * 2. 팀 상태 되돌림 (membership: "non-member", associationId: null)
 * 3. membershipRequests 문서 업데이트 (status: "rejected")
 * 4. Transaction으로 원자적 처리
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { logger } from "firebase-functions";

const db = getFirestore();

interface RejectTeamMembershipRequest {
  teamId: string;
  associationId: string;
  rejectionReason?: string; // 선택적 거절 사유
}

interface RejectTeamMembershipResponse {
  success: boolean;
  message: string;
}

export const rejectTeamMembership = onCall(
  {
    region: "asia-northeast3",
    maxInstances: 10,
  },
  async (request): Promise<RejectTeamMembershipResponse> => {
    const { auth, data } = request;

    // 1️⃣ 인증 확인
    if (!auth || !auth.uid) {
      logger.warn("❌ [rejectTeamMembership] 인증되지 않은 요청");
      throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    }

    const { teamId, associationId, rejectionReason } = data as RejectTeamMembershipRequest;
    const rejectorUid = auth.uid;

    // 2️⃣ 입력 검증
    if (!teamId || !teamId.trim()) {
      throw new HttpsError("invalid-argument", "팀 ID가 필요합니다.");
    }
    if (!associationId || !associationId.trim()) {
      throw new HttpsError("invalid-argument", "협회 ID가 필요합니다.");
    }

    logger.info("🔥 [rejectTeamMembership] 회원 신청 거절 시작", {
      rejectorUid,
      teamId,
      associationId,
    });

    // 3️⃣ 트랜잭션으로 팀 상태 되돌림 + 신청 문서 업데이트
    try {
      await db.runTransaction(async (transaction) => {
        // 3-1. 팀 문서 조회
        const teamRef = db.doc(`teams/${teamId}`);
        const teamSnap = await transaction.get(teamRef);

        if (!teamSnap.exists) {
          throw new HttpsError("not-found", "팀을 찾을 수 없습니다.");
        }

        const teamData = teamSnap.data()!;

        // 3-2. 상태 확인 (pending만 거절 가능)
        const currentMembership = teamData.membership || "non-member";
        if (currentMembership !== "pending") {
          logger.warn("⚠️ [rejectTeamMembership] 거절 불가능한 상태", {
            teamId,
            currentMembership,
          });
          throw new HttpsError(
            "failed-precondition",
            `현재 상태(${currentMembership})에서는 거절이 불가능합니다.`
          );
        }

        // 3-3. 팀 상태 되돌림 (non-member로 복구)
        transaction.update(teamRef, {
          membership: "non-member",
          associationId: null,
          updatedAt: FieldValue.serverTimestamp(),
        });

        logger.info("✅ [rejectTeamMembership] 팀 상태 되돌림", {
          teamId,
          fromMembership: currentMembership,
          toMembership: "non-member",
        });

        // 3-4. membershipRequests 문서 업데이트
        const requestsQuery = db
          .collection("membershipRequests")
          .where("teamId", "==", teamId)
          .where("associationId", "==", associationId)
          .where("status", "==", "pending")
          .limit(1);

        const requestsSnap = await transaction.get(requestsQuery);

        if (!requestsSnap.empty) {
          const requestDoc = requestsSnap.docs[0];
          transaction.update(requestDoc.ref, {
            status: "rejected",
            reviewedAt: FieldValue.serverTimestamp(),
            reviewedBy: rejectorUid,
            rejectionReason: rejectionReason?.trim() || null,
          });

          logger.info("✅ [rejectTeamMembership] 신청 문서 업데이트", {
            requestId: requestDoc.id,
          });
        } else {
          logger.warn("⚠️ [rejectTeamMembership] 신청 문서 없음", {
            teamId,
            associationId,
          });
        }
      });

      return {
        success: true,
        message: "회원 신청이 거절되었습니다.",
      };
    } catch (error: any) {
      logger.error("❌ [rejectTeamMembership] 거절 실패", {
        error: error.message,
        teamId,
        associationId,
      });

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError(
        "internal",
        "회원 신청 거절 중 오류가 발생했습니다. 다시 시도해주세요."
      );
    }
  }
);

