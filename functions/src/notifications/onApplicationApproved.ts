/**
 * 🔔 A. 참가 신청 승인 알림 (Firestore Trigger)
 * 
 * applications.status: pending → approved 감지
 * 승인 즉시 팀장에게 선수 명단 등록 링크 전송
 */

import { onDocumentWritten } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import { renderApprovalNotification } from "./templates";
import { sendEmail } from "./emailSender";
import { logNotification, hasSuccessfulNotification } from "./logUtil";

const db = admin.firestore();

/**
 * Firestore Trigger: applications 문서 업데이트 감지
 * 
 * 경로: associations/{associationId}/tournaments/{tournamentId}/applications/{applicationId}
 */
export const onApplicationApproved = onDocumentWritten(
  {
    document: "associations/{associationId}/tournaments/{tournamentId}/applications/{applicationId}",
    region: "asia-northeast3",
  },
  async (event) => {
    const before = event.data?.before;
    const after = event.data?.after;

    if (!before || !after) {
      logger.warn("[onApplicationApproved] before 또는 after 데이터가 없습니다.");
      return;
    }

    const beforeData = before.data();
    const afterData = after.data();

    // 🔥 상태 변화 감지: pending → approved
    const beforeStatus = beforeData?.status?.toLowerCase();
    const afterStatus = afterData?.status?.toLowerCase();

    if (beforeStatus === "approved" || afterStatus !== "approved") {
      // 승인 상태 변화가 아니면 스킵
      return;
    }

    const applicationId = event.params.applicationId;
    const associationId = event.params.associationId;
    const tournamentId = event.params.tournamentId;

    logger.info("[onApplicationApproved] 승인 감지", {
      applicationId,
      associationId,
      tournamentId,
      beforeStatus,
      afterStatus,
    });

    try {
      // 1. 대회 정보 조회 (대회명)
      const tournamentRef = db.doc(
        `associations/${associationId}/tournaments/${tournamentId}`
      );
      const tournamentDoc = await tournamentRef.get();
      const tournamentData = tournamentDoc.data();

      if (!tournamentData) {
        logger.warn("[onApplicationApproved] 대회 정보를 찾을 수 없습니다.", {
          associationId,
          tournamentId,
        });
        return;
      }

      const competitionName = tournamentData.name || "대회";

      // 2. 팀장 정보 조회 (이메일)
      const teamManagerId = afterData.teamManagerId || afterData.captainUid;
      if (!teamManagerId) {
        logger.warn("[onApplicationApproved] 팀장 ID가 없습니다.", {
          applicationId,
        });
        return;
      }

      const userDoc = await db.doc(`users/${teamManagerId}`).get();
      const userData = userDoc.data();

      if (!userData || !userData.email) {
        logger.warn("[onApplicationApproved] 팀장 이메일이 없습니다.", {
          teamManagerId,
        });
        return;
      }

      const teamManagerEmail = userData.email;
      const teamName = afterData.teamName || "";

      // 3. 선수 명단 등록 링크 생성
      // 프론트엔드 URL 구조: /app/my/applications/{applicationId}/roster
      const baseUrl = process.env.FRONTEND_URL || "https://yago.app";
      const rosterUrl = `${baseUrl}/app/my/applications/${applicationId}/roster`;

      // 4. 알림 템플릿 렌더링
      const { subject, html, text } = renderApprovalNotification({
        competitionName,
        teamName,
        rosterUrl,
      });

      // 5. 이메일 전송
      try {
        const sent = await sendEmail({
          to: teamManagerEmail,
          subject,
          html,
          text,
        });

        if (sent) {
          logger.info("[onApplicationApproved] ✅ 승인 알림 발송 완료", {
            applicationId,
            teamManagerEmail,
          });

          // 6. 알림 로그 기록 (성공)
          await logNotification({
            type: "APPLICATION_APPROVED",
            applicationId,
            associationId,
            tournamentId,
            userId: teamManagerId,
            channel: "email",
            status: "success",
            recipientEmail: teamManagerEmail,
            subject,
            retryCount: 0,
          });
        } else {
          // 발송 실패 (sendEmail이 false 반환)
          logger.warn("[onApplicationApproved] ⚠️ 승인 알림 발송 실패", {
            applicationId,
            teamManagerEmail,
          });

          await logNotification({
            type: "APPLICATION_APPROVED",
            applicationId,
            associationId,
            tournamentId,
            userId: teamManagerId,
            channel: "email",
            status: "failed",
            errorMessage: "이메일 발송 실패 (sendEmail false)",
            recipientEmail: teamManagerEmail,
            subject,
            retryCount: 0,
          });
        }
      } catch (emailError: any) {
        // 이메일 발송 오류
        logger.error("[onApplicationApproved] ❌ 이메일 발송 오류", {
          applicationId,
          teamManagerEmail,
          error: emailError.message,
        });

        await logNotification({
          type: "APPLICATION_APPROVED",
          applicationId,
          associationId,
          tournamentId,
          userId: teamManagerId,
          channel: "email",
          status: "failed",
          errorMessage: emailError.message || "알 수 없는 오류",
          recipientEmail: teamManagerEmail,
          subject,
          retryCount: 0,
        });
      }
    } catch (error: any) {
      logger.error("[onApplicationApproved] ❌ 오류", {
        applicationId,
        error: error.message,
        stack: error.stack,
      });
      // 알림 실패해도 운영 흐름에 영향 없음 (throw 하지 않음)
    }
  }
);
