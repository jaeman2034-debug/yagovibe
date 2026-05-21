/**
 * 🔥 STEP 6: 팀 체크인 상태 업데이트 Callable
 * 
 * 대회 당일 팀/선수 출석 체크를 빠르게 처리
 * 조 추첨/명단 확정 이후 데이터 기준으로만 운영
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { logger } from "firebase-functions/v2";

const db = admin.firestore();

export type TeamCheckinStatus = 
  | "NOT_CHECKED_IN" 
  | "CHECKED_IN" 
  | "LATE" 
  | "NO_SHOW" 
  | "DISQUALIFIED";

interface UpdateTeamCheckinStatusRequest {
  associationId: string;
  tournamentId: string;
  teamId: string;
  status: TeamCheckinStatus;
  note?: string;
}

/**
 * 🔥 팀 체크인 상태 업데이트 (관리자 전용)
 */
export const updateTeamCheckinStatusCallable = functions
  .region("asia-northeast3")
  .https.onCall(async (data: UpdateTeamCheckinStatusRequest, context) => {
    // 🔥 인증 체크
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "로그인이 필요합니다."
      );
    }

    const { associationId, tournamentId, teamId, status, note } = data;
    const uid = context.auth.uid;

    // 🔥 입력 검증
    if (!associationId || !tournamentId || !teamId || !status) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "필수 파라미터가 누락되었습니다."
      );
    }

    // 🔥 허용된 status 값 체크
    const validStatuses: TeamCheckinStatus[] = [
      "NOT_CHECKED_IN",
      "CHECKED_IN",
      "LATE",
      "NO_SHOW",
      "DISQUALIFIED",
    ];
    if (!validStatuses.includes(status)) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        `허용되지 않은 status입니다. (${validStatuses.join(", ")}만 가능)`
      );
    }

    logger.info(`[updateTeamCheckinStatus] 시작`, {
      associationId,
      tournamentId,
      teamId,
      status,
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
          "협회 관리자만 체크인 상태를 변경할 수 있습니다."
        );
      }

      // 🔥 2. 대회 정보 조회 및 Phase 체크
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

      const tournament = tournamentSnap.data()!;
      const currentPhase = tournament.tournamentPhase;

      // 🔥 체크인 가능 Phase: DRAW_DONE 이후 (CHECKIN_OPEN 또는 MATCHES_RUNNING)
      const allowedPhases = ["DRAW_DONE", "CHECKIN_OPEN", "MATCHES_RUNNING"];
      if (!allowedPhases.includes(currentPhase)) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          `체크인은 조 추첨 완료 후 가능합니다. (현재: ${currentPhase})`
        );
      }

      // 🔥 MATCHES_RUNNING 단계에서는 체크인 변경 제한 (운영 정책)
      if (currentPhase === "MATCHES_RUNNING" && status === "NOT_CHECKED_IN") {
        throw new functions.https.HttpsError(
          "failed-precondition",
          "경기 진행 중에는 체크인 취소가 불가능합니다."
        );
      }

      // 🔥 3. 팀 정보 조회 및 검증
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

      const team = teamSnap.data()!;

      // 🔥 승인된 팀이고 명단이 잠겨 있는지 확인 (운영 정책)
      if (team.status !== "APPROVED") {
        throw new functions.https.HttpsError(
          "failed-precondition",
          "승인된 팀만 체크인할 수 있습니다."
        );
      }

      if (!team.rosterLocked) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          "명단이 확정된 팀만 체크인할 수 있습니다."
        );
      }

      // 🔥 4. 체크인 문서 업데이트/생성
      const checkinRef = db.doc(
        `associations/${associationId}/tournaments/${tournamentId}/checkins/teams/${teamId}`
      );

      const FieldValue = admin.firestore.FieldValue;
      const updateData: any = {
        status,
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: uid,
      };

      // 체크인 완료 시 시간 기록
      if (status === "CHECKED_IN" || status === "LATE") {
        // 기존 체크인 시간이 없으면 기록
        const existingCheckin = await checkinRef.get();
        if (!existingCheckin.exists || !existingCheckin.data()?.checkedInAt) {
          updateData.checkedInAt = FieldValue.serverTimestamp();
          updateData.checkedInBy = uid;
        }
      }

      // 메모 추가
      if (note) {
        updateData.note = note;
      }

      await checkinRef.set(updateData, { merge: true });

      logger.info(`[updateTeamCheckinStatus] 완료`, {
        teamId,
        status,
        teamName: team.teamName || team.name,
      });

      return {
        success: true,
        teamId,
        status,
        checkedInAt: status === "CHECKED_IN" || status === "LATE" 
          ? admin.firestore.FieldValue.serverTimestamp() 
          : null,
      };
    } catch (error: any) {
      logger.error(`[updateTeamCheckinStatus] 오류`, {
        error: error?.message,
        stack: error?.stack,
      });

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError(
        "internal",
        `체크인 상태 업데이트 중 오류가 발생했습니다: ${error?.message}`
      );
    }
  });
