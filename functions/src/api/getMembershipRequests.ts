/**
 * 🔥 협회 회원 신청 목록 조회 (협회 관리자 전용)
 * 
 * 노원구 축구협회 관리자가 승인 대기 중인 신청 팀 목록을 조회
 * 
 * 보안:
 * - 협회 관리자만 호출 가능 (추후 권한 체크 추가)
 * - 해당 협회의 신청만 조회
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions";

const db = getFirestore();

interface GetMembershipRequestsRequest {
  associationId: string;
  status?: "pending" | "approved" | "rejected"; // 필터 (기본값: "pending")
}

interface MembershipRequestInfo {
  requestId: string;
  teamId: string;
  teamName: string;
  region: string;
  requestedAt: any; // Timestamp
  requestedBy: string;
  memo?: string;
}

interface GetMembershipRequestsResponse {
  success: boolean;
  requests: MembershipRequestInfo[];
  count: number;
}

export const getMembershipRequests = onCall(
  {
    region: "asia-northeast3",
    maxInstances: 10,
  },
  async (request): Promise<GetMembershipRequestsResponse> => {
    const { auth, data } = request;

    // 1️⃣ 인증 확인
    if (!auth || !auth.uid) {
      logger.warn("❌ [getMembershipRequests] 인증되지 않은 요청");
      throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    }

    const { associationId, status = "pending" } = data as GetMembershipRequestsRequest;

    // 2️⃣ 입력 검증
    if (!associationId || !associationId.trim()) {
      throw new HttpsError("invalid-argument", "협회 ID가 필요합니다.");
    }

    logger.info("🔥 [getMembershipRequests] 신청 목록 조회", {
      associationId,
      status,
    });

    try {
      // 3️⃣ membershipRequests 쿼리
      const requestsQuery = db
        .collection("membershipRequests")
        .where("associationId", "==", associationId)
        .where("status", "==", status)
        .orderBy("requestedAt", "desc");

      const requestsSnap = await requestsQuery.get();

      if (requestsSnap.empty) {
        return {
          success: true,
          requests: [],
          count: 0,
        };
      }

      // 4️⃣ 팀 정보 조회 (병렬)
      const teamIds = requestsSnap.docs.map((doc) => doc.data().teamId);
      const teamDocs = await Promise.all(
        teamIds.map((teamId) => db.doc(`teams/${teamId}`).get())
      );

      // 5️⃣ 팀 정보 매핑
      const teamMap = new Map<string, any>();
      teamDocs.forEach((teamDoc) => {
        if (teamDoc.exists) {
          teamMap.set(teamDoc.id, teamDoc.data());
        }
      });

      // 6️⃣ 결과 구성
      const requests: MembershipRequestInfo[] = requestsSnap.docs
        .map((doc) => {
          const requestData = doc.data();
          const teamId = requestData.teamId;
          const teamData = teamMap.get(teamId);

          if (!teamData) {
            logger.warn("⚠️ [getMembershipRequests] 팀 정보 없음", { teamId });
            return null;
          }

          return {
            requestId: doc.id,
            teamId,
            teamName: teamData.name || "이름 없음",
            region: teamData.region || "지역 없음",
            requestedAt: requestData.requestedAt,
            requestedBy: requestData.requestedBy || "",
            memo: requestData.memo || undefined,
          };
        })
        .filter((req): req is MembershipRequestInfo => req !== null);

      logger.info("✅ [getMembershipRequests] 신청 목록 조회 완료", {
        associationId,
        count: requests.length,
      });

      return {
        success: true,
        requests,
        count: requests.length,
      };
    } catch (error: any) {
      logger.error("❌ [getMembershipRequests] 조회 실패", {
        error: error.message,
        associationId,
      });

      throw new HttpsError(
        "internal",
        "신청 목록 조회 중 오류가 발생했습니다. 다시 시도해주세요."
      );
    }
  }
);

