/**
 * 🔥 이벤트 리마인드 푸시 알림 (D-1 / D-Day)
 * 
 * 역할:
 * - 매 시간마다 실행
 * - 24시간 이내 시작하는 이벤트 찾기
 * - 참석자에게 푸시 알림 발송
 */

import * as functions from "firebase-functions/v2";
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";

const db = getFirestore();
const logger = functions.logger;

/**
 * 이벤트 리마인드 스케줄러 (매 시간마다 실행)
 */
export const eventReminder = functions.scheduler.onSchedule(
  {
    schedule: "every 60 minutes",
    timeZone: "Asia/Seoul",
  },
  async (event) => {
    logger.info("🔔 [eventReminder] 이벤트 리마인드 체크 시작");

    try {
      const now = admin.firestore.Timestamp.now();
      const oneDayLater = admin.firestore.Timestamp.fromMillis(
        now.toMillis() + 24 * 60 * 60 * 1000
      );

      // 1️⃣ 24시간 이내 시작하는 이벤트 조회
      const upcomingEvents = await db
        .collectionGroup("events")
        .where("date", ">=", now)
        .where("date", "<=", oneDayLater)
        .get();

      logger.info("📅 [eventReminder] 다가오는 이벤트:", {
        count: upcomingEvents.size,
      });

      if (upcomingEvents.empty) {
        logger.info("ℹ️ [eventReminder] 리마인드할 이벤트 없음");
        return;
      }

      const messaging = admin.messaging();
      const notificationPromises: Promise<any>[] = [];

      // 2️⃣ 각 이벤트의 참석자에게 푸시 알림
      for (const eventDoc of upcomingEvents.docs) {
        const eventData = eventDoc.data();
        const eventId = eventDoc.id;
        const attendees = eventData.attendees || [];
        const eventDate = eventData.date;
        const teamId = eventDoc.ref.parent.parent?.id;

        if (!teamId || attendees.length === 0) {
          continue;
        }

        // 이벤트까지 남은 시간 계산
        const eventTime = eventDate.toMillis();
        const timeUntilEvent = eventTime - now.toMillis();
        const hoursUntilEvent = Math.floor(timeUntilEvent / (60 * 60 * 1000));

        // D-Day (당일) 또는 D-1 (내일) 체크
        const isToday = hoursUntilEvent < 24;
        const isTomorrow = hoursUntilEvent >= 24 && hoursUntilEvent < 48;

        if (!isToday && !isTomorrow) {
          continue; // 24~48시간 사이가 아니면 스킵
        }

        const reminderText = isToday
          ? "오늘"
          : isTomorrow
          ? "내일"
          : `${hoursUntilEvent}시간 후`;

        // 팀 정보 조회
        let teamName = "팀";
        if (teamId) {
          try {
            const teamDoc = await db.doc(`teams/${teamId}`).get();
            if (teamDoc.exists) {
              teamName = teamDoc.data()?.name || "팀";
            }
          } catch (error) {
            logger.warn("⚠️ [eventReminder] 팀 정보 조회 실패:", { teamId });
          }
        }

        // 각 참석자에게 푸시 알림
        for (const attendeeId of attendees) {
          try {
            const userRef = db.doc(`users/${attendeeId}`);
            const userSnap = await userRef.get();

            if (!userSnap.exists) {
              continue;
            }

            const userData = userSnap.data();
            const fcmTokens = userData?.fcmTokens || [];

            if (fcmTokens.length === 0) {
              continue;
            }

            const validTokens = Array.isArray(fcmTokens)
              ? fcmTokens.filter((t: string) => t && typeof t === "string")
              : [];

            if (validTokens.length === 0) {
              continue;
            }

            // 푸시 알림 전송
            const multicastMessage = {
              notification: {
                title: `${teamName} 이벤트`,
                body: `${reminderText} "${eventData.title}" 이벤트가 있습니다`,
              },
              data: {
                type: "event_reminder",
                teamId,
                eventId,
                eventTitle: eventData.title || "",
              },
              android: {
                priority: "high" as const,
              },
              apns: {
                headers: {
                  "apns-priority": "10",
                },
              },
              tokens: validTokens,
            };

            notificationPromises.push(
              messaging
                .sendEachForMulticast(multicastMessage)
                .then((response) => {
                  logger.info("✅ [eventReminder] 리마인드 전송 성공:", {
                    attendeeId,
                    eventId,
                    successCount: response.successCount,
                  });
                })
                .catch((error) => {
                  logger.error("❌ [eventReminder] 리마인드 전송 실패:", {
                    attendeeId,
                    eventId,
                    error: error.message,
                  });
                })
            );
          } catch (error: any) {
            logger.error("❌ [eventReminder] 참석자 알림 처리 실패:", {
              attendeeId,
              eventId,
              error: error.message,
            });
          }
        }
      }

      await Promise.allSettled(notificationPromises);

      logger.info("✅ [eventReminder] 모든 리마인드 처리 완료");
    } catch (error: any) {
      logger.error("❌ [eventReminder] 리마인드 처리 실패:", {
        error: error.message,
        stack: error.stack,
      });
    }
  }
);
