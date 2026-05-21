/**
 * Booking Permission API
 * 대관 권한 조회 API 엔드포인트
 * 
 * 프론트엔드가 Firestore 직접 접근하지 않고 서버에서만 권한을 조회
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { resolveBookingPolicySimple } from "../policy/policyResolver";
import type { PolicyInput, PolicyResult } from "../policy/policyResolver";

/**
 * POST /api/booking/permission
 * 대관 권한 조회 API
 * 
 * @example
 * ```typescript
 * const getBookingPermission = httpsCallable(functions, "getBookingPermission");
 * const result = await getBookingPermission({
 *   associationId: "assoc-nowon-football",
 *   teamId: "team-nowon-fc",
 *   facilityId: "facility-army-academy"
 * });
 * ```
 */
export const getBookingPermission = onCall(
  {
    region: "asia-northeast3",
    cors: true,
  },
  async (req) => {
    const { associationId, teamId, facilityId } = req.data ?? {};
    const uid = req.auth?.uid;

    // 1. 인증 체크
    if (!uid) {
      throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    }

    // 2. 파라미터 검증
    if (!teamId || !facilityId) {
      throw new HttpsError(
        "invalid-argument",
        "teamId와 facilityId가 필요합니다."
      );
    }

    try {
      // 2.5. 팀 존재 및 초기화 상태 확인 (방어 로직)
      // 🔥 Firebase Admin 초기화 확인
      if (!admin.apps.length) {
        admin.initializeApp();
      }
      const db = admin.firestore();
      const teamDoc = await db.doc(`teams/${teamId}`).get();
      
      if (!teamDoc.exists) {
        logger.warn(`Team not found for booking permission: ${teamId}`);
        // 팀이 없으면 기본값 반환 (throw 하지 않음)
        return {
          canBook: false,
          canWaitlist: false,
          priority: "LOW",
          message: "팀 정보를 찾을 수 없습니다.",
          actionType: "VIEW_ONLY" as const,
          reasonCode: "TEAM_NOT_FOUND",
          showConversionCTA: false,
        };
      }
      
      const teamData = teamDoc.data()!;
      const teamStatus = teamData.status as string | undefined;
      
      // 🔥 팀이 아직 초기화되지 않았을 경우 (방금 생성된 팀)
      if (teamStatus !== "active") {
        logger.warn(`Team not yet active for booking permission: ${teamId}, status=${teamStatus}`);
        // 초기화 전 팀은 기본값 반환 (throw 하지 않음)
        return {
          canBook: false,
          canWaitlist: false,
          priority: "LOW",
          message: "팀 초기화 중입니다. 잠시 후 다시 시도해주세요.",
          actionType: "VIEW_ONLY" as const,
          reasonCode: "TEAM_NOT_INITIALIZED",
          showConversionCTA: false,
        };
      }

      // 3. Policy Resolver 호출 (단일 진실 소스)
      const result = await resolveBookingPolicySimple(teamId, facilityId);

      logger.info(`Booking permission resolved: teamId=${teamId}, facilityId=${facilityId}, actionType=${result.actionType}`);

      return result;
    } catch (error) {
      logger.error(`Error getting booking permission: ${error}`);
      
      // 🔥 Policy Engine 실패 시 기본값 반환 (팀 생성 성공과 분리)
      // ❗ 절대 throw 하지 않음 - 권한 체크 실패는 앱을 막지 않음
      logger.warn(`⚠️ [getBookingPermission] Policy Engine 실패, 기본값 반환: teamId=${teamId}, facilityId=${facilityId}`);
      
      // 기본값: 비회원팀 권한 (가장 제한적)
      return {
        canBook: false,
        canWaitlist: true,
        priority: "LOW",
        message: "권한 정보 확인 중입니다. 잠시 후 다시 시도해주세요.",
        actionType: "VIEW_ONLY" as const,
        reasonCode: "POLICY_CHECK_FAILED",
        showConversionCTA: false,
      };
    }
  }
);

