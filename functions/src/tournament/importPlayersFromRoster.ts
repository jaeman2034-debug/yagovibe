/**
 * 🔥 선수 명단 일괄 저장 Cloud Function
 * 
 * 연령 자동 분류 결과를 Firestore에 저장
 * 팀 관리자가 호출, 실제 write는 Admin SDK로 처리
 */

import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";

const db = admin.firestore();

export const importPlayersFromRoster = onCall(
  {
    region: "asia-northeast3",
    cors: true,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    }

    const { assocId, tournamentId, teamId, teamName, players } = request.data || {};
    const uid = request.auth.uid;

    if (!assocId || !tournamentId || !players || !Array.isArray(players) || players.length === 0) {
      throw new HttpsError("invalid-argument", "필수 인자가 누락되었습니다.");
    }

    if (!teamId || !teamName) {
      throw new HttpsError("invalid-argument", "teamId와 teamName이 필요합니다.");
    }

    try {
      const batch = db.batch();
      const now = admin.firestore.Timestamp.now();

      // 선수 ID 생성 헬퍼
      const generatePlayerId = (player: any, index: number): string => {
        const namePart = (player.name || "").replace(/\s/g, "");
        const yearPart = player.birthYear?.toString() || "unknown";
        const indexPart = index.toString().padStart(3, "0");
        return `${namePart}_${yearPart}_${indexPart}`;
      };

      players.forEach((p: any, index: number) => {
        const playerId = generatePlayerId(p, index);
        const ref = db
          .collection("associations")
          .doc(assocId)
          .collection("tournaments")
          .doc(tournamentId)
          .collection("players")
          .doc(playerId);

        batch.set(ref, {
          teamId,
          teamName,

          name: p.name,
          birthDateRaw: p.birthDateRaw || "",
          birthDateISO: p.birthDateISO || null,
          birthYear: p.birthYear || null,

          position: p.position || null,
          phone: p.phone || null,
          jerseyNo: p.jerseyNo || null,
          memo: p.memo || null,

          // 🔥 자동 판별 결과 (절대 수정하지 않음)
          ageCheck: {
            eligible: p.ageCheck?.eligible ?? null,
            reason: p.ageCheck?.reason || "BIRTH_MISSING",
          },

          // 🔐 행정 상태
          approvalStatus: "pending",
          approvedByUid: null,
          approvedAt: null,

          createdByUid: uid,
          createdAt: now,
          updatedAt: now,
        });
      });

      await batch.commit();

      return {
        success: true,
        count: players.length,
        message: `${players.length}명의 선수가 저장되었습니다.`,
      };
    } catch (error: any) {
      console.error("선수 명단 저장 실패:", error);
      throw new HttpsError(
        "internal",
        `저장 실패: ${error.message || "알 수 없는 오류"}`
      );
    }
  }
);

