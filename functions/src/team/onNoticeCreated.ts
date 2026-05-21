/**
 * 🔥 팀 공지 생성 시 채팅방에 카드 메시지 자동 생성
 * 
 * 역할:
 * - teams/{teamId}/notices/{noticeId} 생성 시
 * - chatRooms/team_{teamId}/messages에 공지 카드 메시지 자동 추가
 */

import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions";
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";

const db = getFirestore();

/**
 * 공지 생성 시 채팅방에 카드 메시지 자동 생성
 */
export const onNoticeCreated = onDocumentCreated(
  "teams/{teamId}/notices/{noticeId}",
  async (event) => {
    const { teamId, noticeId } = event.params;
    const noticeData = event.data?.data();

    logger.info("📌 [onNoticeCreated] 공지 생성 감지:", {
      teamId,
      noticeId,
      title: noticeData.title,
      authorId: noticeData.authorId,
    });

    try {
      // 1️⃣ 팀 채팅방 ID (team_{teamId} 형식)
      const roomId = `team_${teamId}`;
      const roomRef = db.doc(`chatRooms/${roomId}`);

      // 2️⃣ 채팅방 존재 확인
      const roomSnap = await roomRef.get();
      if (!roomSnap.exists) {
        logger.warn("⚠️ [onNoticeCreated] 채팅방이 존재하지 않음:", { roomId });
        return;
      }

      // 3️⃣ 공지 카드 메시지 생성
      const messagesRef = db.collection(`chatRooms/${roomId}/messages`);
      await messagesRef.add({
        type: "notice",
        noticeId,
        title: noticeData.title || "공지",
        content: noticeData.content || "",
        isPinned: noticeData.isPinned || false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        senderId: noticeData.authorId,
        readBy: [noticeData.authorId], // 작성자는 자동 읽음
        // 🔥 공지 메시지는 텍스트로도 표시 (채팅 리스트에서 보이도록)
        text: `📌 ${noticeData.title}`,
      });

      // 4️⃣ 채팅방 lastMessage 업데이트
      await roomRef.update({
        lastMessage: `📌 ${noticeData.title}`,
        lastMessageAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // 5️⃣ Activity 생성 (팀 활동 피드)
      const teamRef = db.doc(`teams/${teamId}`);
      const teamSnap = await teamRef.get();
      const teamData = teamSnap.data();

      await db.collection(`teams/${teamId}/activities`).add({
        type: "notice",
        title: `${teamData?.name || "팀"}이(가) 공지를 작성했습니다`,
        createdBy: noticeData.authorId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        referenceId: noticeId,
        summary: noticeData.content?.substring(0, 100) || undefined,
      });

      logger.info("✅ [onNoticeCreated] 공지 카드 메시지 및 Activity 생성 완료:", {
        roomId,
        noticeId,
        teamId,
      });
    } catch (error: any) {
      logger.error("❌ [onNoticeCreated] 공지 카드 메시지 생성 실패:", {
        teamId,
        noticeId,
        error: error.message,
        stack: error.stack,
      });
    }
  }
);
