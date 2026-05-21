/**
 * 🔥 FINAL+ 단계: 결과 수정 모드 토글 Callable
 * 
 * 기능:
 * - 결과 수정 모드 활성화/비활성화
 * - 관리자 전용
 * - 토너먼트 경기 수정 시 필수
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { logger } from "firebase-functions/v2";

const db = admin.firestore();

interface ToggleResultEditModeRequest {
  associationId: string;
  tournamentId: string;
  enabled: boolean;
}

/**
 * 🔥 결과 수정 모드 토글 (관리자 전용)
 */
export const toggleResultEditModeCallable = functions
  .region("asia-northeast3")
  .https.onCall(async (data: ToggleResultEditModeRequest, context) => {
    // 🔥 인증 체크
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "로그인이 필요합니다."
      );
    }

    const { associationId, tournamentId, enabled } = data;
    const uid = context.auth.uid;

    // 🔥 입력 검증
    if (!associationId || !tournamentId || typeof enabled !== "boolean") {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "필수 파라미터가 누락되었습니다."
      );
    }

    logger.info(`[toggleResultEditMode] 시작`, {
      associationId,
      tournamentId,
      enabled,
      uid,
    });

    try {
      // 🔥 1. 관리자 권한 체크
      const associationRef = db.doc(`associations/${associationId}`);
      const associationSnap = await associationRef.get();

      if (!associationSnap.exists) {
        throw new functions.https.HttpsError(
          "not-found",
          "협회를 찾을 수 없습니다."
        );
      }

      const associationData = associationSnap.data()!;
      const adminUids = associationData.adminUids || {};

      if (!adminUids[uid]) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "협회 관리자만 결과 수정 모드를 변경할 수 있습니다."
        );
      }

      // 🔥 2. 대회 정보 조회
      const tournamentRef = db.doc(
        `associations/${associationId}/tournaments/${tournamentId}`
      );
      const tournamentSnap = await tournamentRef.get();

      if (!tournamentSnap.exists) {
        throw new functions.https.HttpsError(
          "not-found",
          "대회를 찾을 수 없습니다."
        );
      }

      // 🔥 3. 결과 수정 모드 업데이트
      await tournamentRef.update({
        resultEditEnabled: enabled,
        resultEditModeUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
        resultEditModeUpdatedBy: uid,
      });

      logger.info(`[toggleResultEditMode] 완료`, {
        tournamentId,
        enabled,
      });

      return {
        success: true,
        resultEditEnabled: enabled,
      };
    } catch (error: any) {
      logger.error(`[toggleResultEditMode] 오류`, {
        error: error?.message,
        stack: error?.stack,
      });

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError(
        "internal",
        `결과 수정 모드 변경 중 오류가 발생했습니다: ${error?.message}`
      );
    }
  });
