/**
 * 🔥 심판 역할 설정 (Custom Claims)
 * Phase 1-4: 심판 Role Rules
 * 
 * - ADMIN이 심판에게 역할 부여
 * - Custom Claims를 통해 권한 관리
 * - Firestore Rules에서 검증
 * 
 * 역할 구조:
 * - role: "ADMIN" | "REFEREE" (전역 역할)
 * - tournamentRoles: { [tournamentId]: "REFEREE" } (토너먼트별 역할, 선택적)
 */

import * as admin from "firebase-admin";
import { onCall } from "firebase-functions/v2/https";

/**
 * 심판 역할 설정 (전역 역할)
 * ADMIN만 호출 가능
 */
export const setRefereeRole = onCall(
  { region: "asia-northeast3" },
  async (request) => {
    const { uid, role } = request.data;

    // 인증 확인
    if (!request.auth) {
      throw new Error("UNAUTHENTICATED");
    }

    const callerUid = request.auth.uid;

    // TODO: ADMIN 권한 확인 (associations/{associationId}/adminUids 체크)
    // 일단은 로그인만 확인
    void callerUid;

    if (!uid || !role) {
      throw new Error("MISSING_PARAMS");
    }

    // 역할 검증
    const validRoles = ["REFEREE", "ADMIN"];
    if (!validRoles.includes(role)) {
      throw new Error("INVALID_ROLE");
    }

    // Custom Claims 설정 (전역 역할)
    const user = await admin.auth().getUser(uid);
    const currentClaims = user.customClaims || {};

    await admin.auth().setCustomUserClaims(uid, {
      ...currentClaims,
      role, // 전역 역할
    });

    return { ok: true, uid, role };
  }
);

/**
 * 심판 역할 제거
 */
export const removeRefereeRole = onCall(
  { region: "asia-northeast3" },
  async (request) => {
    const { uid } = request.data;

    if (!request.auth) {
      throw new Error("UNAUTHENTICATED");
    }

    if (!uid) {
      throw new Error("MISSING_PARAMS");
    }

    const user = await admin.auth().getUser(uid);
    const currentClaims = user.customClaims || {};

    // role 제거
    const { role, ...restClaims } = currentClaims;

    await admin.auth().setCustomUserClaims(uid, restClaims);

    return { ok: true, uid };
  }
);

