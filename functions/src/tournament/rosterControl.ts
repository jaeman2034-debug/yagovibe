/**
 * 🔥 팀원 등록 제어 Cloud Functions (천재 모드)
 * 
 * 기능:
 * - 팀원 등록 기간 시작 (tournamentPhase = "ROSTER_OPEN")
 * - 팀원 등록 잠금 (team.rosterLocked = true, tournamentPhase = "ROSTER_LOCKED")
 * - 개별 팀 잠금/해제
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { logger } from "firebase-functions/v2";

const db = admin.firestore();

/**
 * 🔥 팀원 등록 기간 시작 (관리자 전용)
 */
export const openRosterPeriodCallable = functions
  .region("asia-northeast3")
  .https.onCall(async (data, context) => {
    // 🔥 인증 체크
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "로그인이 필요합니다."
      );
    }

    const { associationId, tournamentId } = data;

    // 🔥 입력 검증
    if (!associationId || !tournamentId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "필수 파라미터가 누락되었습니다."
      );
    }

    const uid = context.auth.uid;

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
          "협회 관리자만 팀원 등록 기간을 시작할 수 있습니다."
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

      // 🔥 3. tournamentPhase를 ROSTER_OPEN으로 변경
      await tournamentRef.update({
        tournamentPhase: "ROSTER_OPEN",
        rosterOpenedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      logger.info("[openRosterPeriod] ✅ 팀원 등록 기간 시작", {
        associationId,
        tournamentId,
        uid,
      });

      return {
        success: true,
        message: "팀원 등록 기간이 시작되었습니다.",
      };
    } catch (error: any) {
      logger.error("[openRosterPeriod] ❌ 오류 발생", {
        errorCode: error?.code,
        errorMessage: error?.message,
        associationId,
        tournamentId,
        uid,
      });

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError(
        "internal",
        `팀원 등록 기간 시작 중 오류가 발생했습니다: ${error?.message || "알 수 없는 오류"}`
      );
    }
  });

/**
 * 🔥 팀원 등록 잠금 (관리자 전용)
 * - 모든 팀의 rosterLocked = true
 * - tournamentPhase = "ROSTER_LOCKED"
 */
export const lockRosterPeriodCallable = functions
  .region("asia-northeast3")
  .https.onCall(async (data, context) => {
    // 🔥 인증 체크
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "로그인이 필요합니다."
      );
    }

    const { associationId, tournamentId } = data;

    // 🔥 입력 검증
    if (!associationId || !tournamentId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "필수 파라미터가 누락되었습니다."
      );
    }

    const uid = context.auth.uid;

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
          "협회 관리자만 팀원 등록을 잠글 수 있습니다."
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

      // 🔥 3. 모든 팀의 rosterLocked = true 설정
      const teamsRef = db.collection(
        `associations/${associationId}/tournaments/${tournamentId}/teams`
      );
      const teamsSnap = await teamsRef.get();

      const batch = db.batch();
      let lockedCount = 0;

      teamsSnap.docs.forEach((teamDoc) => {
        const teamData = teamDoc.data();
        // 이미 잠금 상태가 아닌 경우만 업데이트
        if (teamData.rosterLocked !== true) {
          batch.update(teamDoc.ref, {
            rosterLocked: true,
            rosterLockedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          lockedCount++;
        }
      });

      if (lockedCount > 0) {
        await batch.commit();
      }

      // 🔥 4. tournamentPhase를 ROSTER_LOCKED로 변경
      await tournamentRef.update({
        tournamentPhase: "ROSTER_LOCKED",
        rosterLockedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      logger.info("[lockRosterPeriod] ✅ 팀원 등록 잠금 완료", {
        associationId,
        tournamentId,
        uid,
        lockedTeamsCount: lockedCount,
        totalTeamsCount: teamsSnap.size,
      });

      return {
        success: true,
        message: `팀원 등록이 잠겼습니다. (${lockedCount}개 팀 잠금)`,
        lockedTeamsCount: lockedCount,
      };
    } catch (error: any) {
      logger.error("[lockRosterPeriod] ❌ 오류 발생", {
        errorCode: error?.code,
        errorMessage: error?.message,
        associationId,
        tournamentId,
        uid,
      });

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError(
        "internal",
        `팀원 등록 잠금 중 오류가 발생했습니다: ${error?.message || "알 수 없는 오류"}`
      );
    }
  });

/**
 * 🔥 개별 팀 잠금/해제 (관리자 전용)
 */
export const toggleTeamRosterLockCallable = functions
  .region("asia-northeast3")
  .https.onCall(async (data, context) => {
    // 🔥 인증 체크
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "로그인이 필요합니다."
      );
    }

    const { associationId, tournamentId, teamId, lock } = data;

    // 🔥 입력 검증
    if (!associationId || !tournamentId || !teamId || typeof lock !== "boolean") {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "필수 파라미터가 누락되었습니다."
      );
    }

    const uid = context.auth.uid;

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
          "협회 관리자만 팀 잠금을 변경할 수 있습니다."
        );
      }

      // 🔥 2. 팀 정보 조회
      const teamRef = db.doc(
        `associations/${associationId}/tournaments/${tournamentId}/teams/${teamId}`
      );
      const teamSnap = await teamRef.get();

      if (!teamSnap.exists) {
        throw new functions.https.HttpsError(
          "not-found",
          "팀을 찾을 수 없습니다."
        );
      }

      // 🔥 3. 잠금 상태 변경
      const updateData: any = {
        rosterLocked: lock,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      if (lock) {
        updateData.rosterLockedAt = admin.firestore.FieldValue.serverTimestamp();
      } else {
        updateData.rosterUnlockedAt = admin.firestore.FieldValue.serverTimestamp();
      }

      await teamRef.update(updateData);

      logger.info("[toggleTeamRosterLock] ✅ 팀 잠금 상태 변경", {
        associationId,
        tournamentId,
        teamId,
        lock,
        uid,
      });

      return {
        success: true,
        message: lock ? "팀이 잠겼습니다." : "팀 잠금이 해제되었습니다.",
        rosterLocked: lock,
      };
    } catch (error: any) {
      logger.error("[toggleTeamRosterLock] ❌ 오류 발생", {
        errorCode: error?.code,
        errorMessage: error?.message,
        associationId,
        tournamentId,
        teamId,
        lock,
        uid,
      });

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError(
        "internal",
        `팀 잠금 상태 변경 중 오류가 발생했습니다: ${error?.message || "알 수 없는 오류"}`
      );
    }
  });
