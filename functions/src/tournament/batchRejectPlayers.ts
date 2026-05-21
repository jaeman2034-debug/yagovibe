/**
 * 🔥 선수 일괄 반려 Cloud Function
 * 
 * 커서 지시문 3️⃣ 기반:
 * - 검수 결과는 승인/검수중/반려 중 하나로 결정
 * - 반려 시 사유 필수
 */

import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";

const db = admin.firestore();

export const batchRejectPlayersCallable = onCall(
  {
    region: "asia-northeast3",
    cors: true,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    }

    const { associationId, tournamentId, playerIds, reason } = request.data || {};

    if (!associationId || !tournamentId || !playerIds || !Array.isArray(playerIds) || playerIds.length === 0) {
      throw new HttpsError("invalid-argument", "필수 인자가 누락되었습니다.");
    }

    if (!reason || typeof reason !== "string" || reason.trim().length === 0) {
      throw new HttpsError("invalid-argument", "반려 사유는 필수입니다.");
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
    let rejectedCount = 0;

    // 각 선수 반려 처리
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
      
      // pending 또는 approved 상태만 반려 가능
      if (playerData?.approvalStatus === "rejected") {
        console.warn(`이미 반려된 선수입니다: ${playerId}`);
        continue;
      }

      // 기존 승인 로그 가져오기
      const existingLog = playerData?.approvalLog || [];

      batch.update(playerRef, {
        approvalStatus: "rejected",
        rejectionReason: reason.trim(),
        eligibleForMatch: false, // 🔥 커서 지시문 4️⃣: 반려된 선수는 출전 불가
        updatedAt: now,
        // 🔥 커서 지시문 5️⃣: 승인 로그 기록
        approvalLog: [
          ...existingLog,
          {
            action: "rejected",
            byUid: callerUid,
            at: now,
            reason: reason.trim(),
          },
        ],
      });
      
      rejectedCount++;
    }

    await batch.commit();

    return {
      success: true,
      message: `${rejectedCount}명의 선수가 반려되었습니다.`,
      rejectedCount,
    };
  }
);

