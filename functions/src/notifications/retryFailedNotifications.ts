/**
 * 🔔 재시도 스케줄러 (10분마다 실행)
 * 
 * 실패한 알림 로그를 찾아서 재시도
 * 최대 3회까지 재시도
 */

import * as admin from "firebase-admin";
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import {
  getFailedNotificationLogs,
  updateNotificationLogStatus,
  logNotification,
} from "./logUtil";
import { sendEmail } from "./emailSender";
import {
  renderApprovalNotification,
  renderRosterReminderNotification,
  renderDeadlineApproachingNotification,
} from "./templates";

const db = admin.firestore();
const MAX_RETRIES = 3;

/**
 * 10분마다 실패한 알림 재시도
 */
export const retryFailedNotifications = onSchedule(
  {
    schedule: "*/10 * * * *", // 10분마다
    timeZone: "Asia/Seoul",
    region: "asia-northeast3",
  },
  async () => {
    logger.info("[retryFailedNotifications] 시작");

    try {
      // 1. 실패한 알림 로그 조회
      const failedLogs = await getFailedNotificationLogs(MAX_RETRIES);

      logger.info("[retryFailedNotifications] 실패한 알림 로그 수", {
        count: failedLogs.length,
      });

      let retryCount = 0;
      let successCount = 0;
      let failureCount = 0;

      for (const logDoc of failedLogs) {
        const logData = logDoc.data();
        const logRef = logDoc.ref;

        const {
          type,
          applicationId,
          associationId,
          tournamentId,
          userId,
          channel,
          recipientEmail,
          subject: originalSubject,
          daysUntilDeadline,
          retryCount: currentRetryCount,
        } = logData;

        // 최대 재시도 횟수 확인
        if (currentRetryCount >= MAX_RETRIES) {
          continue;
        }

        // 이메일만 재시도 (카카오는 추후 지원)
        if (channel !== "email" || !recipientEmail) {
          continue;
        }

        try {
          retryCount++;

          logger.info("[retryFailedNotifications] 재시도 시작", {
            logId: logDoc.id,
            type,
            applicationId,
            retryCount: currentRetryCount + 1,
          });

          // 2. 필요한 데이터 조회
          const applicationRef = db.doc(
            `associations/${associationId}/tournaments/${tournamentId}/applications/${applicationId}`
          );
          const applicationDoc = await applicationRef.get();
          const applicationData = applicationDoc.data();

          if (!applicationData) {
            logger.warn("[retryFailedNotifications] 신청 정보 없음", {
              applicationId,
            });
            continue;
          }

          const tournamentRef = db.doc(
            `associations/${associationId}/tournaments/${tournamentId}`
          );
          const tournamentDoc = await tournamentRef.get();
          const tournamentData = tournamentDoc.data();

          if (!tournamentData) {
            logger.warn("[retryFailedNotifications] 대회 정보 없음", {
              tournamentId,
            });
            continue;
          }

          const competitionName = tournamentData.name || "대회";
          const teamName = applicationData.teamName || "";

          // 3. 선수 명단 등록 링크 생성
          const baseUrl = process.env.FRONTEND_URL || "https://yago.app";
          const rosterUrl = `${baseUrl}/app/my/applications/${applicationId}/roster`;

          // 4. 알림 템플릿 렌더링
          let emailSubject = "";
          let emailHtml = "";
          let emailText = "";

          if (type === "APPLICATION_APPROVED") {
            const template = renderApprovalNotification({
              competitionName,
              teamName,
              rosterUrl,
            });
            emailSubject = template.subject;
            emailHtml = template.html;
            emailText = template.text;
          } else if (type === "ROSTER_REMINDER") {
            const deadline = tournamentData.rosterDeadline
              ? (tournamentData.rosterDeadline.toDate
                  ? tournamentData.rosterDeadline.toDate()
                  : new Date(tournamentData.rosterDeadline))
              : undefined;

            const deadlineStr = deadline
              ? deadline.toISOString().split("T")[0]
              : undefined;

            const template = renderRosterReminderNotification({
              competitionName,
              teamName,
              rosterUrl,
              daysUntilDeadline,
              deadline: deadlineStr,
            });
            emailSubject = template.subject;
            emailHtml = template.html;
            emailText = template.text;
          } else if (type === "DEADLINE_APPROACHING") {
            const deadline = tournamentData.rosterDeadline
              ? (tournamentData.rosterDeadline.toDate
                  ? tournamentData.rosterDeadline.toDate()
                  : new Date(tournamentData.rosterDeadline))
              : undefined;

            const deadlineStr = deadline
              ? deadline.toISOString().split("T")[0]
              : undefined;

            const template = renderDeadlineApproachingNotification({
              competitionName,
              teamName,
              rosterUrl,
              deadline: deadlineStr,
            });
            emailSubject = template.subject;
            emailHtml = template.html;
            emailText = template.text;
          } else {
            logger.warn("[retryFailedNotifications] 알 수 없는 알림 타입", {
              type,
            });
            continue;
          }

          // 5. 이메일 재전송
          const sent = await sendEmail({
            to: recipientEmail,
            subject: emailSubject,
            html: emailHtml,
            text: emailText,
          });

          if (sent) {
            // 성공: 로그 상태 업데이트 + 새 성공 로그 기록
            await updateNotificationLogStatus(logRef, "success", currentRetryCount + 1);

            await logNotification({
              type,
              applicationId,
              associationId,
              tournamentId,
              userId,
              channel,
              status: "success",
              recipientEmail,
              subject: emailSubject,
              daysUntilDeadline,
              retryCount: currentRetryCount + 1,
            });

            successCount++;
            logger.info("[retryFailedNotifications] ✅ 재시도 성공", {
              logId: logDoc.id,
              type,
              applicationId,
            });
          } else {
            // 실패: 재시도 횟수 증가
            await updateNotificationLogStatus(
              logRef,
              "failed",
              currentRetryCount + 1,
              "이메일 발송 실패 (sendEmail false)"
            );

            failureCount++;
            logger.warn("[retryFailedNotifications] ⚠️ 재시도 실패", {
              logId: logDoc.id,
              type,
              applicationId,
              retryCount: currentRetryCount + 1,
            });
          }
        } catch (error: any) {
          // 재시도 오류: 재시도 횟수 증가
          await updateNotificationLogStatus(
            logRef,
            "failed",
            currentRetryCount + 1,
            error.message || "알 수 없는 오류"
          );

          failureCount++;
          logger.error("[retryFailedNotifications] ❌ 재시도 오류", {
            logId: logDoc.id,
            type,
            applicationId,
            error: error.message,
            retryCount: currentRetryCount + 1,
          });
        }
      }

      logger.info("[retryFailedNotifications] 완료", {
        total: failedLogs.length,
        retried: retryCount,
        success: successCount,
        failure: failureCount,
      });
    } catch (error: any) {
      logger.error("[retryFailedNotifications] ❌ 스케줄러 오류", {
        error: error.message,
        stack: error.stack,
      });
      // 스케줄러 오류는 재시도됨
      throw error;
    }
  }
);
