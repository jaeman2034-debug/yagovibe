/**
 * 🔥 대회 참가 승인 시 알림 & 활동 로그 생성 (IMPLEMENTATION STEP 2)
 * 
 * 트리거: associations/{associationId}/tournaments/{tournamentId}/applications/{applicationId}
 * status가 'PENDING'에서 'APPROVED'로 변경 시
 * 
 * 핵심 원칙:
 * - 한 이벤트 → 알림 1개 + 로그 1개 (팀장 + 팀원 모두)
 * - 서버에서만 생성
 */

import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions/v2";

interface TournamentApplication {
  tournamentId: string;
  associationId: string;
  teamId: string;
  teamName: string;
  leaderId?: string;
  seasonId?: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "HOLD";
}

/**
 * 대회 참가 승인 시 알림 & 활동 로그 생성
 */
export const onTournamentApplicationApproved = onDocumentUpdated(
  {
    region: "asia-northeast3",
    document: "associations/{associationId}/tournaments/{tournamentId}/applications/{applicationId}",
  },
  async (event) => {
    const { admin } = await import("../firebaseAdmin");
    const db = admin.firestore();

    const associationId = event.params.associationId as string;
    const tournamentId = event.params.tournamentId as string;
    const applicationId = event.params.applicationId as string;

    const before = event.data?.before?.data() as TournamentApplication | undefined;
    const after = event.data?.after?.data() as TournamentApplication | undefined;

    // 승인 상태로 변경된 경우만 처리
    if (
      !before ||
      !after ||
      before.status !== "PENDING" ||
      after.status !== "APPROVED"
    ) {
      return;
    }

    // 🔥 C: 중복 트리거 방지 (idempotency 가드)
    const alreadyNotified = (after as any).notified === true;
    if (alreadyNotified) {
      logger.info(`[onTournamentApplicationApproved] 이미 처리됨 (중복 방지)`, { applicationId });
      return;
    }

    const { teamId, teamName, leaderId, seasonId } = after;

    if (!leaderId) {
      logger.warn(`[onTournamentApplicationApproved] leaderId 없음`, {
        applicationId,
        teamId,
      });
      return;
    }

    try {
      logger.info(`[onTournamentApplicationApproved] 대회 참가 승인 처리`, {
        applicationId,
        associationId,
        tournamentId,
        teamId,
        leaderId,
      });

      // 🔹 대회 정보 조회
      const tournamentRef = db.doc(
        `associations/${associationId}/tournaments/${tournamentId}`
      );
      const tournamentSnap = await tournamentRef.get();
      const tournamentName = tournamentSnap.exists
        ? tournamentSnap.data()?.name || tournamentSnap.data()?.title
        : "대회";

      // 🔹 팀 정보 조회 (멤버 목록)
      const teamRef = db.doc(`teams/${teamId}`);
      const teamSnap = await teamRef.get();
      const teamData = teamSnap.exists ? teamSnap.data() : null;
      
      // 팀 멤버 조회 (teams/{teamId}/members 서브컬렉션 또는 team_members 컬렉션)
      const membersRef = db.collection(`teams/${teamId}/members`);
      const membersSnap = await membersRef.get();
      const memberIds = membersSnap.docs.map((doc) => doc.id);

      // team_members 컬렉션에서도 조회 (역인덱스)
      const teamMembersRef = db.collection("team_members");
      const teamMembersQuery = teamMembersRef.where("teamId", "==", teamId).where("status", "==", "active");
      const teamMembersSnap = await teamMembersQuery.get();
      const teamMemberIds = teamMembersSnap.docs.map((doc) => doc.data().uid);

      // 중복 제거하여 모든 멤버 ID 수집
      const allMemberIds = Array.from(new Set([...memberIds, ...teamMemberIds, leaderId]));

      const now = admin.firestore.FieldValue.serverTimestamp();

      // 1️⃣ 팀장 알림
      const leaderNotificationRef = db.collection("notifications").doc();
      await leaderNotificationRef.set({
        userId: leaderId,
        type: "TOURNAMENT_APPROVED",
        title: "대회 참가 확정",
        message: `${teamName} 팀이 ${tournamentName} 참가가 확정되었어요`,
        link: `/association/${associationId}/tournament/${tournamentId}`,
        isRead: false,
        createdAt: now,
      });

      // 2️⃣ 팀장 활동 로그
      const leaderLogRef = db.collection("activityLogs").doc();
      await leaderLogRef.set({
        userId: leaderId,
        category: "TOURNAMENT",
        action: "TOURNAMENT_APPROVED",
        context: {
          tournamentId,
          associationId,
          teamId,
          seasonId,
        },
        createdAt: now,
      });

      // 3️⃣ 팀원 알림 + 로그 (배치 처리)
      const batch = db.batch();

      allMemberIds.forEach((memberId) => {
        // 팀장은 이미 처리했으므로 스킵
        if (memberId === leaderId) return;

        // 팀원 알림
        const memberNotificationRef = db.collection("notifications").doc();
        batch.set(memberNotificationRef, {
          userId: memberId,
          type: "TOURNAMENT_APPROVED",
          title: "대회 참가 확정",
          message: `${teamName} 팀이 ${tournamentName} 참가가 확정되었어요`,
          link: `/association/${associationId}/tournament/${tournamentId}`,
          isRead: false,
          createdAt: now,
        });

        // 팀원 활동 로그
        const memberLogRef = db.collection("activityLogs").doc();
        batch.set(memberLogRef, {
          userId: memberId,
          category: "TOURNAMENT",
          action: "TEAM_ENTERED_TOURNAMENT",
          context: {
            tournamentId,
            associationId,
            teamId,
            seasonId,
          },
          createdAt: now,
        });
      });

      await batch.commit();

      // 🔥 C: 중복 방지 플래그 설정
      await db.doc(
        `associations/${associationId}/tournaments/${tournamentId}/applications/${applicationId}`
      ).update({
        notified: true,
      });

      logger.info(`[onTournamentApplicationApproved] 알림 & 로그 생성 완료`, {
        applicationId,
        teamId,
        leaderId,
        memberCount: allMemberIds.length - 1, // 팀장 제외
        notificationId: leaderNotificationRef.id,
        activityLogId: leaderLogRef.id,
      });
    } catch (error: any) {
      logger.error(`[onTournamentApplicationApproved] 에러 발생:`, {
        applicationId,
        associationId,
        tournamentId,
        teamId,
        leaderId,
        error: error.message,
        stack: error.stack,
      });
      // 트리거 에러는 로그만 남기고 throw하지 않음
    }
  }
);
