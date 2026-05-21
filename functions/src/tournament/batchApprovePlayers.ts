/**
 * 🔥 선수 일괄 승인 Cloud Function
 * 
 * 사무국 관리자가 검증된 선수들을 일괄 승인
 */

import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";

const db = admin.firestore();

export const batchApprovePlayersCallable = onCall(
  {
    region: "asia-northeast3",
    cors: true,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    }

    const { associationId, tournamentId, playerIds } = request.data || {};

    if (!associationId || !tournamentId || !playerIds || !Array.isArray(playerIds) || playerIds.length === 0) {
      throw new HttpsError("invalid-argument", "필수 인자가 누락되었습니다.");
    }

    // 관리자 권한 확인
    const callerUid = request.auth.uid;
    const associationRef = db.collection("associations").doc(associationId);
    const associationSnap = await associationRef.get();

    if (!associationSnap.exists) {
      throw new HttpsError("not-found", "협회를 찾을 수 없습니다.");
    }

    const associationData = associationSnap.data();
    const isAdmin =
      (associationData?.adminUids && associationData.adminUids.includes(callerUid)) ||
      (request.auth.token.role === "ADMIN" && request.auth.token.associationId === associationId);

    if (!isAdmin) {
      throw new HttpsError("permission-denied", "관리자 권한이 없습니다.");
    }

    const now = admin.firestore.Timestamp.now();
    const batch = db.batch();

    // 각 선수 승인 처리
    for (const playerId of playerIds) {
      const playerRef = db
        .collection("associations")
        .doc(associationId)
        .collection("tournaments")
        .doc(tournamentId)
        .collection("players")
        .doc(playerId);

      const playerSnap = await playerRef.get();
      
      if (!playerSnap.exists) {
        console.warn(`선수 문서를 찾을 수 없습니다: ${playerId}`);
        continue;
      }

      const playerData = playerSnap.data();
      
      // pending 상태만 승인 가능
      if (playerData?.approvalStatus !== "pending") {
        console.warn(`승인 불가능한 상태입니다: ${playerId} (현재 상태: ${playerData?.approvalStatus})`);
        continue;
      }

      // 기존 승인 로그 가져오기
      const existingLog = playerData?.approvalLog || [];
      
      batch.update(playerRef, {
        approvalStatus: "approved",
        approvedAt: now,
        approvedByUid: callerUid,
        eligibleForMatch: true, // 🔥 커서 지시문 4️⃣: 승인된 선수만 출전 가능
        updatedAt: now,
        // 🔥 커서 지시문 5️⃣: 승인 로그 기록
        approvalLog: [
          ...existingLog,
          {
            action: "approved",
            byUid: callerUid,
            at: now,
          },
        ],
      });
    }

    await batch.commit();

    return {
      success: true,
      message: `${playerIds.length}명의 선수가 승인되었습니다.`,
      approvedCount: playerIds.length,
    };
  }
);

