/**
 * 🔥 Event 생성 시 자동 처리
 * 
 * Trigger: events/{eventId} onCreate
 * 
 * 역할:
 * 1. 기본 Division 자동 생성 (일반부)
 * 2. Event 초기 상태 설정
 * 
 * 핵심 원칙: Event 생성 시 기본 구조 자동 생성
 */

import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";

const logger = functions.logger;

export const onEventPlatformCreated = functions.firestore
  .document("events/{eventId}")
  .onCreate(async (snap, context) => {
    const db = getFirestore();
    
    const { eventId } = context.params;
    const eventData = snap.data();

    if (!eventData) {
      logger.warn("⚠️ [onEventCreated] Event 데이터 없음:", { eventId });
      return;
    }

    logger.info("🔄 [onEventCreated] Event 생성 감지:", {
      eventId,
      name: eventData.name,
      type: eventData.type,
    });

    try {
      const {
        type,
        seasonId,
        sportType,
      } = eventData;

      // Tournament/League/Academy인 경우 기본 Division 생성
      if (
        type === "tournament" ||
        type === "league" ||
        type === "academy"
      ) {
        logger.info("✅ [onEventCreated] 기본 Division 생성:", {
          eventId,
          type,
        });

        // 기본 Division 생성 (일반부)
        const divisionRef = db.collection("event_divisions").doc();
        await divisionRef.set({
          eventId,
          seasonId: seasonId || null,
          name: "일반부",
          code: "GENERAL",
          gender: "male",
          ageRule: {
            min: 19,
            max: null,
          },
          formatType: type === "league" ? "league" : "knockout",
          maxTeams: null,
          status: "active",
          sortOrder: 1,
          createdAt: admin.firestore.Timestamp.now(),
          updatedAt: admin.firestore.Timestamp.now(),
        });

        logger.info("✅ [onEventCreated] 기본 Division 생성 완료:", {
          eventId,
          divisionId: divisionRef.id,
        });
      }

      logger.info("✅ [onEventCreated] 처리 완료:", { eventId });
    } catch (error: any) {
      logger.error("❌ [onEventCreated] 처리 실패:", {
        eventId,
        error: error.message,
        stack: error.stack,
      });
    }
  });
