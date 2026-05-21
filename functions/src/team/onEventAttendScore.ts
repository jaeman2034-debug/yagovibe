/**
 * 🔥 이벤트 참석 시 활동 점수 자동 적립
 * 
 * 역할:
 * - teams/{teamId}/events/{eventId} 업데이트 시
 * - attendees 배열 변경 감지
 * - 참석자에게 +5점 적립
 */

import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";

const db = getFirestore();
const logger = functions.logger;

/**
 * 이벤트 참석 시 활동 점수 적립
 */
export const onEventAttendScore = functions.firestore
  .document("teams/{teamId}/events/{eventId}")
  .onUpdate(async (change, context) => {
    const { teamId, eventId } = context.params;
    const beforeData = change.before.data();
    const afterData = change.after.data();

    logger.info("🎟️ [onEventAttendScore] 이벤트 업데이트 감지:", {
      teamId,
      eventId,
    });

    try {
      const beforeAttendees = beforeData?.attendees || [];
      const afterAttendees = afterData?.attendees || [];

      // 1️⃣ 새로 참석한 멤버 찾기
      const newAttendees = afterAttendees.filter(
        (uid: string) => !beforeAttendees.includes(uid)
      );

      if (newAttendees.length === 0) {
        logger.info("ℹ️ [onEventAttendScore] 새 참석자 없음");
        return;
      }

      // 2️⃣ 각 참석자에게 점수 적립 (+5점)
      const updatePromises = newAttendees.map(async (uid: string) => {
        try {
          const memberRef = db.doc(`teams/${teamId}/members/${uid}`);
          const memberSnap = await memberRef.get();

          if (!memberSnap.exists) {
            logger.warn("⚠️ [onEventAttendScore] 멤버 문서 없음:", { uid });
            return;
          }

          // 🔥 팀 타입 조회 (점수 정책 분기)
          const teamRef = db.doc(`teams/${teamId}`);
          const teamSnap = await teamRef.get();
          const teamData = teamSnap.exists ? teamSnap.data() : {};
          const teamType = teamData?.type || "club";

          // 타입별 이벤트 점수
          const eventScore = teamType === "hobby" ? 15 : 10; // 취미 모임은 이벤트가 더 중요

          const currentData = memberSnap.data();
          const currentScore = currentData?.score || 0;
          const currentEventCount = currentData?.eventCount || 0;
          const newScore = currentScore + eventScore;
          const newLevel = Math.min(Math.floor(newScore / 50) + 1, 5); // 최대 5레벨
          const newEventCount = currentEventCount + 1;

          const updateData: any = {
            score: admin.firestore.FieldValue.increment(eventScore),
            eventCount: admin.firestore.FieldValue.increment(1),
            level: newLevel,
            lastActivityAt: admin.firestore.FieldValue.serverTimestamp(),
          };

          // 🔥 배지 자동 부여: 이벤트 마스터 (10개 이벤트 참석)
          const badges = currentData?.badges || [];
          if (newEventCount === 10 && !badges.includes("event_master")) {
            updateData.badges = admin.firestore.FieldValue.arrayUnion("event_master");
          }

          await memberRef.update(updateData);

          logger.info("✅ [onEventAttendScore] 참석 점수 적립:", {
            uid,
            newScore,
            newLevel,
          });
        } catch (error: any) {
          logger.error("❌ [onEventAttendScore] 참석자 점수 적립 실패:", {
            uid,
            error: error.message,
          });
        }
      });

      await Promise.allSettled(updatePromises);

      logger.info("✅ [onEventAttendScore] 모든 참석자 점수 적립 완료:", {
        teamId,
        eventId,
        newAttendeesCount: newAttendees.length,
      });
    } catch (error: any) {
      logger.error("❌ [onEventAttendScore] 점수 적립 실패:", {
        teamId,
        eventId,
        error: error.message,
        stack: error.stack,
      });
    }
  });
