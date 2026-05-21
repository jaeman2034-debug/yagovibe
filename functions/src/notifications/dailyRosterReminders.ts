/**
 * 🔔 B. 선수 명단 미제출 알림 (Pub/Sub 스케줄러)
 * 
 * 매일 9시 실행
 * approved 상태 + rosterStatus === "draft" 인 신청 찾아서 알림 발송
 * 마감 D-3, D-1 기준으로 알림
 */

import * as admin from "firebase-admin";
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import { renderRosterReminderNotification, renderDeadlineApproachingNotification } from "./templates";
import { sendEmail } from "./emailSender";
import { logNotification, hasSuccessfulNotification } from "./logUtil";

const db = admin.firestore();

/**
 * 매일 9시 미제출 명단 알림 발송
 */
export const dailyRosterReminders = onSchedule(
  {
    schedule: "0 9 * * *", // 매일 9시 (KST)
    timeZone: "Asia/Seoul",
    region: "asia-northeast3",
  },
  async () => {
    const now = admin.firestore.Timestamp.now();
    const nowDate = new Date(now.toMillis());

    logger.info("[dailyRosterReminders] 시작", {
      timestamp: nowDate.toISOString(),
    });

    try {
      // 1. 모든 approved + draft 상태의 applications 조회
      const applicationsSnap = await db
        .collectionGroup("applications")
        .where("status", "==", "approved")
        .get();

      let reminderCount = 0;
      let deadlineCount = 0;

      for (const doc of applicationsSnap.docs) {
        const appData = doc.data();

        // rosterStatus가 "draft"가 아니면 스킵
        if (appData.rosterStatus !== "draft" && appData.rosterStatus !== undefined) {
          continue;
        }

        // 경로에서 associationId, tournamentId 추출
        const pathParts = doc.ref.path.split("/");
        const associationIndex = pathParts.indexOf("associations");
        const tournamentIndex = pathParts.indexOf("tournaments");
        const applicationIndex = pathParts.indexOf("applications");

        if (
          associationIndex === -1 ||
          tournamentIndex === -1 ||
          applicationIndex === -1
        ) {
          logger.warn("[dailyRosterReminders] 경로 파싱 실패", {
            path: doc.ref.path,
          });
          continue;
        }

        const associationId = pathParts[associationIndex + 1];
        const tournamentId = pathParts[tournamentIndex + 1];
        const applicationId = pathParts[applicationIndex + 1];

        try {
          // 2. 대회 정보 조회 (마감일 확인)
          const tournamentRef = db.doc(
            `associations/${associationId}/tournaments/${tournamentId}`
          );
          const tournamentDoc = await tournamentRef.get();
          const tournamentData = tournamentDoc.data();

          if (!tournamentData) {
            continue;
          }

          const competitionName = tournamentData.name || "대회";
          const rosterDeadline = tournamentData.rosterDeadline; // Timestamp 또는 Date

          // 3. 마감일 계산
          let daysUntilDeadline: number | undefined;
          let deadlineStr: string | undefined;

          if (rosterDeadline) {
            const deadlineDate = rosterDeadline.toDate
              ? rosterDeadline.toDate()
              : new Date(rosterDeadline);
            const deadlineTimestamp = deadlineDate.getTime();
            const nowTimestamp = nowDate.getTime();

            if (deadlineTimestamp < nowTimestamp) {
              // 이미 마감됨
              continue;
            }

            const diffMs = deadlineTimestamp - nowTimestamp;
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            daysUntilDeadline = diffDays;

            deadlineStr = deadlineDate.toISOString().split("T")[0]; // YYYY-MM-DD
          }

          // 4. 알림 조건 확인
          // D-3 또는 D-1에만 알림 (또는 마감일이 없으면 매일)
          const shouldSendReminder =
            daysUntilDeadline === undefined ||
            daysUntilDeadline === 3 ||
            daysUntilDeadline === 1;

          // 마감 임박 알림 (D-1)
          const shouldSendDeadlineAlert = daysUntilDeadline === 1;

          if (!shouldSendReminder && !shouldSendDeadlineAlert) {
            continue;
          }

          // 5. 팀장 정보 조회
          const teamManagerId = appData.teamManagerId || appData.captainUid;
          if (!teamManagerId) {
            continue;
          }

          const userDoc = await db.doc(`users/${teamManagerId}`).get();
          const userData = userDoc.data();

          if (!userData || !userData.email) {
            continue;
          }

          const teamManagerEmail = userData.email;
          const teamName = appData.teamName || "";

          // 6. 선수 명단 등록 링크 생성
          const baseUrl = process.env.FRONTEND_URL || "https://yago.app";
          const rosterUrl = `${baseUrl}/app/my/applications/${applicationId}/roster`;

          // 7. 중복 방지: 오늘 같은 타입의 성공한 알림이 있으면 스킵
          const notificationType = shouldSendDeadlineAlert
            ? "DEADLINE_APPROACHING"
            : "ROSTER_REMINDER";

          // 리마인더는 하루 1회만 (중복 방지)
          // 단, 마감 임박(D-1)은 항상 발송
          if (!shouldSendDeadlineAlert) {
            const hasSent = await hasSuccessfulNotification(
              associationId,
              tournamentId,
              applicationId,
              "ROSTER_REMINDER"
            );

            if (hasSent) {
              // 오늘 이미 발송됨 (스킵)
              continue;
            }
          }

          // 8. 알림 템플릿 렌더링 및 전송
          let sent = false;
          let emailSubject = "";
          let emailError: string | undefined;

          try {
            if (shouldSendDeadlineAlert) {
              // 마감 임박 알림
              const { subject, html, text } = renderDeadlineApproachingNotification({
                competitionName,
                teamName,
                rosterUrl,
                deadline: deadlineStr,
              });

              emailSubject = subject;

              sent = await sendEmail({
                to: teamManagerEmail,
                subject,
                html,
                text,
              });

              if (sent) {
                deadlineCount++;
              }
            } else {
              // 미제출 리마인더
              const { subject, html, text } = renderRosterReminderNotification({
                competitionName,
                teamName,
                rosterUrl,
                daysUntilDeadline,
                deadline: deadlineStr,
              });

              emailSubject = subject;

              sent = await sendEmail({
                to: teamManagerEmail,
                subject,
                html,
                text,
              });

              if (sent) {
                reminderCount++;
              }
            }
          } catch (emailErrorCaught: any) {
            emailError = emailErrorCaught.message || "알 수 없는 오류";
            logger.error("[dailyRosterReminders] 이메일 발송 오류", {
              applicationId,
              teamManagerEmail,
              error: emailError,
            });
          }

          // 9. 알림 로그 기록
          await logNotification({
            type: notificationType,
            applicationId,
            associationId,
            tournamentId,
            userId: teamManagerId,
            channel: "email",
            status: sent ? "success" : "failed",
            errorMessage: emailError,
            recipientEmail: teamManagerEmail,
            subject: emailSubject || undefined,
            daysUntilDeadline,
            retryCount: 0,
          });

          // 너무 많은 알림 방지 (배치 제한)
          if (reminderCount + deadlineCount >= 100) {
            logger.warn("[dailyRosterReminders] 배치 제한 도달 (100건)");
            break;
          }
        } catch (appError: any) {
          logger.error("[dailyRosterReminders] 신청 처리 오류", {
            applicationId: doc.id,
            error: appError.message,
          });
          // 개별 신청 오류는 전체 프로세스를 중단시키지 않음
          continue;
        }
      }

      logger.info("[dailyRosterReminders] 완료", {
        reminderCount,
        deadlineCount,
        total: reminderCount + deadlineCount,
      });
    } catch (error: any) {
      logger.error("[dailyRosterReminders] ❌ 오류", {
        error: error.message,
        stack: error.stack,
      });
      // 스케줄러 오류는 재시도됨
      throw error;
    }
  }
);
