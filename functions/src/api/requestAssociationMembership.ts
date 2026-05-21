/**
 * 🔥 협회 회원 신청 Callable 함수 (노원 실전)
 * 
 * STEP 2에서 "노원구 축구협회 회원으로 신청" 클릭 시 호출
 * 
 * 플로우:
 * 1. 팀 상태 확인 (non-member만 신청 가능)
 * 2. 팀 상태 업데이트 (membership: "pending", associationId 설정)
 * 3. membershipRequests 문서 생성
 * 4. Transaction으로 원자적 처리
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import * as admin from "firebase-admin";

const db = getFirestore();

interface RequestMembershipRequest {
  teamId: string;
  associationId: string; // "assoc-nowon-football"
  memo?: string; // 선택적 메모
}

interface RequestMembershipResponse {
  success: boolean;
  requestId: string;
  message: string;
}

export const requestAssociationMembership = onCall(
  {
    region: "asia-northeast3",
    maxInstances: 10,
  },
  async (request): Promise<RequestMembershipResponse> => {
    const { auth, data } = request;

    // 1️⃣ 인증 확인
    if (!auth || !auth.uid) {
      logger.warn("❌ [requestAssociationMembership] 인증되지 않은 요청");
      throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    }

    const uid = auth.uid;
    const { teamId, associationId, memo } = data as RequestMembershipRequest;

    // 2️⃣ 입력 검증
    if (!teamId || !teamId.trim()) {
      throw new HttpsError("invalid-argument", "팀 ID가 필요합니다.");
    }
    if (!associationId || !associationId.trim()) {
      throw new HttpsError("invalid-argument", "협회 ID가 필요합니다.");
    }

    logger.info("🔥 [requestAssociationMembership] 회원 신청 시작", {
      uid,
      teamId,
      associationId,
    });

    // 3️⃣ 트랜잭션으로 팀 상태 업데이트 + 신청 문서 생성
    try {
      const result = await db.runTransaction(async (transaction) => {
        // 3-1. 팀 문서 조회
        const teamRef = db.doc(`teams/${teamId}`);
        const teamSnap = await transaction.get(teamRef);

        if (!teamSnap.exists) {
          throw new HttpsError("not-found", "팀을 찾을 수 없습니다.");
        }

        const teamData = teamSnap.data()!;

        // 3-2. 권한 확인 (팀 소유자만 신청 가능)
        if (teamData.ownerUid !== uid) {
          logger.warn("⚠️ [requestAssociationMembership] 권한 없음", {
            uid,
            teamId,
            ownerUid: teamData.ownerUid,
          });
          throw new HttpsError(
            "permission-denied",
            "팀 소유자만 회원 신청이 가능합니다."
          );
        }

        // 3-3. 상태 확인 (non-member만 신청 가능)
        const currentMembership = teamData.membership || "non-member";
        if (currentMembership !== "non-member") {
          logger.warn("⚠️ [requestAssociationMembership] 잘못된 상태", {
            teamId,
            currentMembership,
          });
          throw new HttpsError(
            "failed-precondition",
            `현재 상태(${currentMembership})에서는 회원 신청이 불가능합니다.`
          );
        }

        // 3-4. 중복 신청 확인
        const existingRequestQuery = db
          .collection("membershipRequests")
          .where("teamId", "==", teamId)
          .where("associationId", "==", associationId)
          .where("status", "==", "pending")
          .limit(1);

        const existingRequestSnap = await transaction.get(existingRequestQuery);
        if (!existingRequestSnap.empty) {
          throw new HttpsError(
            "already-exists",
            "이미 승인 대기 중인 신청이 있습니다."
          );
        }

        // 3-5. 팀 상태 업데이트
        transaction.update(teamRef, {
          membership: "pending",
          associationId,
          updatedAt: FieldValue.serverTimestamp(),
        });

        logger.info("✅ [requestAssociationMembership] 팀 상태 업데이트", {
          teamId,
          fromMembership: currentMembership,
          toMembership: "pending",
          associationId,
        });

        // 3-6. membershipRequests 문서 생성 (노원 실전: 승인 히스토리용)
        const requestRef = db.collection("membershipRequests").doc();
        const requestId = requestRef.id;

        const requestData = {
          teamId,
          associationId,
          status: "pending", // pending | approved | rejected
          requestedAt: FieldValue.serverTimestamp(),
          requestedBy: uid,
          memo: memo?.trim() || null,
        };

        transaction.set(requestRef, requestData);

        logger.info("✅ [requestAssociationMembership] 신청 문서 생성", {
          requestId,
          teamId,
          associationId,
        });

        return {
          success: true,
          requestId,
          message: "회원 신청이 완료되었습니다.",
        };
      });

      return result;
    } catch (error: any) {
      logger.error("❌ [requestAssociationMembership] 회원 신청 실패", {
        error: error.message,
        teamId,
        associationId,
      });

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError(
        "internal",
        "회원 신청 중 오류가 발생했습니다. 다시 시도해주세요."
      );
    }
  }
);

