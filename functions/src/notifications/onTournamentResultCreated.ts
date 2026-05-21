/**
 * 🔥 대회 결과 입력 시 알림 & 활동 로그 생성 (IMPLEMENTATION STEP 3 - FINAL)
 * 
 * 트리거: tournamentResults/{resultId} onCreate
 * 
 * 핵심 원칙:
 * - 결과 입력 = 팀원 전원에게 알림 + 로그
 * - 한 이벤트 → 알림 1개 + 로그 1개 (팀원 전원)
 * - 서버에서만 생성
 */

import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions/v2";

interface TournamentResult {
  tournamentId: string;
  teamId: string;
  rank?: number;
  score?: number;
  resultText?: string;
  seasonId?: string;
}

/**
 * 대회 결과 입력 시 알림 & 활동 로그 생성
 */
export const onTournamentResultCreated = onDocumentCreated(
  {
    region: "asia-northeast3",
    document: "tournamentResults/{resultId}",
  },
  async (event) => {
    const { admin } = await import("../firebaseAdmin");
    const db = admin.firestore();

    const resultId = event.params.resultId as string;
    const result = event.data?.data() as TournamentResult | undefined;

    if (!result || !result.tournamentId || !result.teamId) {
      logger.warn(`[onTournamentResultCreated] 결과 데이터 없음`, {
        resultId,
      });
      return;
    }

    // 🔥 C: 중복 트리거 방지 (idempotency 가드)
    const alreadyNotified = (result as any).notified === true;
    if (alreadyNotified) {
      logger.info(`[onTournamentResultCreated] 이미 처리됨 (중복 방지)`, { resultId });
      return;
    }

    const { tournamentId, teamId, rank, score, resultText, seasonId } = result;

    try {
      logger.info(`[onTournamentResultCreated] 대회 결과 입력 처리`, {
        resultId,
        tournamentId,
        teamId,
        rank,
        score,
        resultText,
      });

      // 🔹 대회 정보 조회
      // tournamentId만으로는 associationId를 알 수 없으므로, 
      // 간단화: tournamentId를 그대로 사용하거나 다른 방법 필요
      // 일단 tournamentId만으로 시도 (실제 구조에 맞게 수정 필요)
      let tournamentName = "대회";
      try {
        // 루트 레벨 tournaments 컬렉션 확인
        const tournamentRef = db.doc(`tournaments/${tournamentId}`);
        const tournamentSnap = await tournamentRef.get();
        if (tournamentSnap.exists) {
          tournamentName = tournamentSnap.data()?.name || tournamentSnap.data()?.title || "대회";
        }
      } catch (err) {
        logger.warn(`[onTournamentResultCreated] 대회 정보 조회 실패 (계속 진행):`, err);
      }

      // 🔹 팀 정보 조회
      const teamRef = db.doc(`teams/${teamId}`);
      const teamSnap = await teamRef.get();

      if (!teamSnap.exists) {
        logger.warn(`[onTournamentResultCreated] 팀 ${teamId} 없음`);
        return;
      }

      const teamData = teamSnap.data();
      
      // 팀 해체 상태 체크 (운영 안전 가드)
      if (teamData?.status === "DISBANDED") {
        logger.warn(`[onTournamentResultCreated] 해체된 팀 ${teamId}에 결과 입력 시도`);
        return;
      }

      const teamName = teamData?.name || "팀";
      const leaderId = teamData?.leaderId || teamData?.ownerUid;

      // 🔹 팀 멤버 조회
      // teams/{teamId}/members 서브컬렉션
      const membersRef = db.collection(`teams/${teamId}/members`);
      const membersSnap = await membersRef.get();
      const memberIds = membersSnap.docs.map((doc) => doc.id);

      // team_members 역인덱스
      const teamMembersRef = db.collection("team_members");
      const teamMembersQuery = teamMembersRef
        .where("teamId", "==", teamId)
        .where("status", "==", "active");
      const teamMembersSnap = await teamMembersQuery.get();
      const teamMemberIds = teamMembersSnap.docs.map((doc) => doc.data().uid);

      // 중복 제거하여 모든 멤버 ID 수집
      const allMemberIds = Array.from(
        new Set([...memberIds, ...teamMemberIds, leaderId].filter(Boolean))
      );

      if (allMemberIds.length === 0) {
        logger.warn(`[onTournamentResultCreated] 팀 ${teamId} 멤버 없음`);
        return;
      }

      // 결과 메시지 생성
      const resultMessage =
        resultText ||
        (rank ? `${rank}위 기록` : score ? `${score}점 기록` : "대회 결과가 기록되었습니다");

      // 🔔 알림 + 📜 로그 (팀원 전원) - 배치 처리
      const batch = db.batch();
      const now = admin.firestore.FieldValue.serverTimestamp();

      allMemberIds.forEach((userId) => {
        if (!userId) return;

        // Notification
        const notificationRef = db.collection("notifications").doc();
        batch.set(notificationRef, {
          userId,
          type: "TOURNAMENT_RESULT_RECORDED",
          title: "대회 결과 등록",
          message: `${tournamentName}에서 ${teamName}이 ${resultMessage}`,
          link: `/tournament/${tournamentId}`, // 실제 경로는 associationId 필요 시 수정
          isRead: false,
          createdAt: now,
        });

        // Activity Log
        const logRef = db.collection("activityLogs").doc();
        batch.set(logRef, {
          userId,
          category: "RESULT",
          action: rank ? `PLACED_${rank}` : "TOURNAMENT_RESULT_RECORDED",
          context: {
            tournamentId,
            teamId,
            seasonId,
            rank,
            score,
            resultText,
          },
          createdAt: now,
        });
      });

      await batch.commit();

      // 🔥 C: 중복 방지 플래그 설정
      await db.doc(`tournamentResults/${resultId}`).update({
        notified: true,
      });

      logger.info(`[onTournamentResultCreated] 알림 & 로그 생성 완료`, {
        resultId,
        teamId,
        memberCount: allMemberIds.length,
        tournamentName,
        resultMessage,
      });
    } catch (error: any) {
      logger.error(`[onTournamentResultCreated] 에러 발생:`, {
        resultId,
        tournamentId,
        teamId,
        error: error.message,
        stack: error.stack,
      });
      // 트리거 에러는 로그만 남기고 throw하지 않음
    }
  }
);
