/**
 * 🔥 메시지 생성 시 활동 점수 자동 적립
 * 
 * 역할:
 * - chatRooms/{roomId}/messages/{messageId} 생성 시
 * - 팀 멤버의 활동 점수 자동 증가
 * - 메시지 수 카운트 증가
 * - 레벨 자동 계산
 */

import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions";
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";

const db = getFirestore();

/**
 * 메시지 생성 시 활동 점수 적립
 */
export const onMessageScore = onDocumentCreated(
  "chatRooms/{roomId}/messages/{messageId}",
  async (event) => {
    const { roomId, messageId } = event.params;
    const messageData = event.data?.data();

    logger.info("🏆 [onMessageScore] 메시지 생성 감지:", {
      roomId,
      messageId,
      senderId: messageData.senderId,
      type: messageData.type,
    });

    try {
      // 1️⃣ 채팅방 정보 조회
      const roomRef = db.doc(`chatRooms/${roomId}`);
      const roomSnap = await roomRef.get();

      if (!roomSnap.exists) {
        logger.warn("⚠️ [onMessageScore] 채팅방이 존재하지 않음:", { roomId });
        return;
      }

      const roomData = roomSnap.data();
      const teamId = roomData?.teamId;

      // 2️⃣ 팀 채팅방이 아니면 스킵
      if (!teamId || roomData?.type !== "team") {
        logger.info("ℹ️ [onMessageScore] 팀 채팅방이 아님, 스킵:", {
          roomId,
          type: roomData?.type,
        });
        return;
      }

      // 3️⃣ 시스템 메시지, 공지, 이벤트는 점수 적립 안 함 (일반 메시지만)
      if (
        messageData.type === "system" ||
        messageData.type === "notice" ||
        messageData.type === "event"
      ) {
        logger.info("ℹ️ [onMessageScore] 시스템/공지/이벤트 메시지, 스킵:", {
          type: messageData.type,
        });
        return;
      }

      const senderId = messageData.senderId;
      if (!senderId) {
        logger.warn("⚠️ [onMessageScore] senderId 없음");
        return;
      }

      // 4️⃣ 팀 멤버 문서 업데이트
      const memberRef = db.doc(`teams/${teamId}/members/${senderId}`);

      // 멤버 문서 존재 확인
      const memberSnap = await memberRef.get();
      if (!memberSnap.exists) {
        logger.warn("⚠️ [onMessageScore] 팀 멤버 문서 없음:", {
          teamId,
          senderId,
        });
        return;
      }

      // 5️⃣ 팀 타입 조회 (점수 정책 분기)
      const teamRef = db.doc(`teams/${teamId}`);
      const teamSnap = await teamRef.get();
      const teamData = teamSnap.exists ? teamSnap.data() : {};
      const teamType = teamData?.type || "club"; // 기본값: club

      // 6️⃣ 점수 및 메시지 수 증가 (타입별 정책)
      const currentData = memberSnap.data();
      const currentScore = currentData?.score || 0;
      const currentMessageCount = currentData?.messageCount || 0;
      
      // 타입별 메시지 점수 (기본 1점)
      const messageScore = 1;
      const newMessageCount = currentMessageCount + 1;
      
      // 🔥 메시지 10개마다 보너스 (+5점)
      const bonusScore = newMessageCount > 0 && newMessageCount % 10 === 0 ? 5 : 0;
      const totalScore = messageScore + bonusScore;
      
      const newScore = currentScore + totalScore;
      const newLevel = Math.min(Math.floor(newScore / 50) + 1, 5); // 50점당 1레벨, 최대 5레벨

      const updateData: any = {
        score: admin.firestore.FieldValue.increment(1),
        messageCount: admin.firestore.FieldValue.increment(1),
        level: newLevel,
        lastActivityAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      // 🔥 배지 자동 부여: 100메시지 달성
      const badges = currentData?.badges || [];
      if (newMessageCount === 100 && !badges.includes("100_messages")) {
        updateData.badges = admin.firestore.FieldValue.arrayUnion("100_messages");
      }

      await memberRef.update(updateData);

      logger.info("✅ [onMessageScore] 활동 점수 적립 완료:", {
        teamId,
        senderId,
        newScore,
        newLevel,
      });
    } catch (error: any) {
      logger.error("❌ [onMessageScore] 점수 적립 실패:", {
        roomId,
        messageId,
        error: error.message,
        stack: error.stack,
      });
    }
  }
);
