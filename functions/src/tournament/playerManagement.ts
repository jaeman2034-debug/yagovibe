/**
 * 🔥 팀원(선수) 관리 Cloud Functions (천재 모드)
 * 
 * 기능:
 * - 팀원 추가 (중복 체크 포함)
 * - 팀원 삭제
 * - 팀원 목록 조회
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { logger } from "firebase-functions/v2";

const db = admin.firestore();

/**
 * 🔥 팀원 추가 (중복 체크 포함)
 */
export const addPlayerCallable = functions
  .region("asia-northeast3")
  .https.onCall(async (data, context) => {
    // 🔥 인증 체크
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "로그인이 필요합니다."
      );
    }

    const { associationId, tournamentId, teamId, playerData } = data;

    // 🔥 입력 검증
    if (!associationId || !tournamentId || !teamId || !playerData) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "필수 파라미터가 누락되었습니다."
      );
    }

    if (!playerData.name || !playerData.birthYear) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "이름과 출생년도는 필수입니다."
      );
    }

    const uid = context.auth.uid;

    try {
      // 🔥 1. 팀 정보 조회 (권한 + 상태 체크)
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

      const teamData = teamSnap.data()!;

      // 🔥 2. 팀 대표 권한 체크
      if (teamData.captainUid !== uid) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "팀 대표만 팀원을 추가할 수 있습니다."
        );
      }

      // 🔥 3. 대회 phase 체크
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

      const tournamentData = tournamentSnap.data()!;

      if (tournamentData.tournamentPhase !== "ROSTER_OPEN") {
        throw new functions.https.HttpsError(
          "failed-precondition",
          "팀원 등록 기간이 아닙니다."
        );
      }

      // 🔥 4. 팀 잠금 체크
      if (teamData.rosterLocked === true) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          "팀원 등록이 잠겨 있습니다."
        );
      }

      // 🔥 5. 중복 체크 (같은 팀 내 name + birthYear)
      const playersRef = db.collection(
        `associations/${associationId}/tournaments/${tournamentId}/teams/${teamId}/players`
      );
      const duplicateQuery = await playersRef
        .where("name", "==", playerData.name)
        .where("birthYear", "==", playerData.birthYear)
        .get();

      if (!duplicateQuery.empty) {
        throw new functions.https.HttpsError(
          "already-exists",
          "이미 등록된 선수입니다. (이름 + 출생년도 중복)"
        );
      }

      // 🔥 6. (옵션) 최소/최대 인원 제한 체크
      const currentPlayersSnap = await playersRef.get();
      const currentCount = currentPlayersSnap.size;
      
      // 최대 인원 제한 (예: 25명, 필요시 tournament 설정에서 가져오기)
      const maxPlayers = tournamentData.maxPlayersPerTeam || 25;
      if (currentCount >= maxPlayers) {
        throw new functions.https.HttpsError(
          "resource-exhausted",
          `팀원은 최대 ${maxPlayers}명까지 등록 가능합니다. (현재: ${currentCount}명)`
        );
      }

      // 🔥 6. 팀원 추가
      const newPlayerRef = playersRef.doc();
      const playerDoc = {
        teamId: teamId,
        name: playerData.name,
        birthYear: playerData.birthYear,
        position: playerData.position || null,
        phone: playerData.phone || null,
        jerseyNo: playerData.jerseyNo || null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        createdBy: uid,
      };

      await newPlayerRef.set(playerDoc);

      // 🔥 7. (옵션) team.rosterCount 증가 (캐시 카운트)
      try {
        await teamRef.update({
          rosterCount: admin.firestore.FieldValue.increment(1),
        });
      } catch (countError: any) {
        // 카운트 업데이트 실패해도 팀원 추가는 성공
        logger.warn("[addPlayer] ⚠️ rosterCount 업데이트 실패 (팀원 추가는 성공)", {
          error: countError?.message,
        });
      }

      logger.info("[addPlayer] ✅ 팀원 추가 완료", {
        associationId,
        tournamentId,
        teamId,
        playerId: newPlayerRef.id,
        playerName: playerData.name,
        currentCount: currentCount + 1,
      });

      return {
        success: true,
        playerId: newPlayerRef.id,
        message: "팀원이 추가되었습니다.",
        currentCount: currentCount + 1,
      };
    } catch (error: any) {
      logger.error("[addPlayer] ❌ 오류 발생", {
        errorCode: error?.code,
        errorMessage: error?.message,
        associationId,
        tournamentId,
        teamId,
        uid,
      });

      // 🔥 이미 HttpsError면 그대로 throw
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      // 🔥 그 외는 internal로 변환
      throw new functions.https.HttpsError(
        "internal",
        `팀원 추가 중 오류가 발생했습니다: ${error?.message || "알 수 없는 오류"}`
      );
    }
  });

/**
 * 🔥 팀원 삭제
 */
export const removePlayerCallable = functions
  .region("asia-northeast3")
  .https.onCall(async (data, context) => {
    // 🔥 인증 체크
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "로그인이 필요합니다."
      );
    }

    const { associationId, tournamentId, teamId, playerId } = data;

    // 🔥 입력 검증
    if (!associationId || !tournamentId || !teamId || !playerId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "필수 파라미터가 누락되었습니다."
      );
    }

    const uid = context.auth.uid;

    try {
      // 🔥 1. 팀 정보 조회 (권한 + 상태 체크)
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

      const teamData = teamSnap.data()!;

      // 🔥 2. 팀 대표 권한 체크
      if (teamData.captainUid !== uid) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "팀 대표만 팀원을 삭제할 수 있습니다."
        );
      }

      // 🔥 3. 대회 phase 체크
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

      const tournamentData = tournamentSnap.data()!;

      if (tournamentData.tournamentPhase !== "ROSTER_OPEN") {
        throw new functions.https.HttpsError(
          "failed-precondition",
          "팀원 등록 기간이 아닙니다."
        );
      }

      // 🔥 4. 팀 잠금 체크
      if (teamData.rosterLocked === true) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          "팀원 등록이 잠겨 있습니다."
        );
      }

      // 🔥 5. 팀원 삭제
      const playerRef = db.doc(
        `associations/${associationId}/tournaments/${tournamentId}/teams/${teamId}/players/${playerId}`
      );
      const playerSnap = await playerRef.get();

      if (!playerSnap.exists) {
        throw new functions.https.HttpsError(
          "not-found",
          "팀원을 찾을 수 없습니다."
        );
      }

      await playerRef.delete();

      // 🔥 6. (옵션) team.rosterCount 감소 (캐시 카운트)
      try {
        await teamRef.update({
          rosterCount: admin.firestore.FieldValue.increment(-1),
        });
      } catch (countError: any) {
        // 카운트 업데이트 실패해도 팀원 삭제는 성공
        logger.warn("[removePlayer] ⚠️ rosterCount 업데이트 실패 (팀원 삭제는 성공)", {
          error: countError?.message,
        });
      }

      logger.info("[removePlayer] ✅ 팀원 삭제 완료", {
        associationId,
        tournamentId,
        teamId,
        playerId,
        uid,
      });

      return {
        success: true,
        message: "팀원이 삭제되었습니다.",
      };
    } catch (error: any) {
      logger.error("[removePlayer] ❌ 오류 발생", {
        errorCode: error?.code,
        errorMessage: error?.message,
        associationId,
        tournamentId,
        teamId,
        playerId,
        uid,
      });

      // 🔥 이미 HttpsError면 그대로 throw
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      // 🔥 그 외는 internal로 변환
      throw new functions.https.HttpsError(
        "internal",
        `팀원 삭제 중 오류가 발생했습니다: ${error?.message || "알 수 없는 오류"}`
      );
    }
  });
