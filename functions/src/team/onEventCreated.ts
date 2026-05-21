/**
 * 🔥 팀 이벤트 생성 시 채팅방에 카드 메시지 자동 생성
 * 
 * 역할:
 * - teams/{teamId}/events/{eventId} 생성 시
 * - chatRooms/team_{teamId}/messages에 이벤트 카드 메시지 자동 추가
 */

import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions";
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";

const db = getFirestore();

/**
 * 이벤트 생성 시 채팅방에 카드 메시지 자동 생성
 */
export const onEventCreated = onDocumentCreated(
  "teams/{teamId}/events/{eventId}",
  async (event) => {
    const { teamId, eventId } = event.params;
    const eventData = event.data?.data();

    logger.info("📅 [onEventCreated] 이벤트 생성 감지:", {
      teamId,
      eventId,
      title: eventData.title,
      createdBy: eventData.createdBy,
    });

    try {
      // 1️⃣ 팀 채팅방 ID (team_{teamId} 형식)
      const roomId = `team_${teamId}`;
      const roomRef = db.doc(`chatRooms/${roomId}`);

      // 2️⃣ 채팅방 존재 확인
      const roomSnap = await roomRef.get();
      if (!roomSnap.exists) {
        logger.warn("⚠️ [onEventCreated] 채팅방이 존재하지 않음:", { roomId });
        return;
      }

      // 3️⃣ 이벤트 카드 메시지 생성
      const messagesRef = db.collection(`chatRooms/${roomId}/messages`);
      await messagesRef.add({
        type: "event",
        eventId,
        title: eventData.title || "이벤트",
        description: eventData.description || "",
        date: eventData.date,
        location: eventData.location || null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        senderId: eventData.createdBy,
        readBy: [eventData.createdBy], // 작성자는 자동 읽음
        // 🔥 이벤트 메시지는 텍스트로도 표시 (채팅 리스트에서 보이도록)
        text: `📅 ${eventData.title}`,
        // 🔥 참석자 정보 (초기값)
        attendees: eventData.attendees || [],
        declined: eventData.declined || [],
      });

      // 4️⃣ 채팅방 lastMessage 업데이트
      await roomRef.update({
        lastMessage: `📅 ${eventData.title}`,
        lastMessageAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // 5️⃣ Activity 생성 (팀 활동 피드)
      const teamRef = db.doc(`teams/${teamId}`);
      const teamSnap = await teamRef.get();
      const teamData = teamSnap.data();

      await db.collection(`teams/${teamId}/activities`).add({
        type: "event",
        title: `${teamData?.name || "팀"}이(가) 이벤트를 생성했습니다`,
        createdBy: eventData.createdBy,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        referenceId: eventId,
        summary: eventData.description || undefined,
        metadata: {
          eventDate: eventData.date,
          location: eventData.location || undefined,
        },
      });

      logger.info("✅ [onEventCreated] 이벤트 카드 메시지 및 Activity 생성 완료:", {
        roomId,
        eventId,
        teamId,
      });
    } catch (error: any) {
      logger.error("❌ [onEventCreated] 이벤트 카드 메시지 생성 실패:", {
        teamId,
        eventId,
        error: error.message,
        stack: error.stack,
      });
    }
  }
);
