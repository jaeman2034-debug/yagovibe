/**
 * 🔥 일일 채팅 요약 봇 (매일 밤 11:59 실행)
 * 
 * 역할:
 * - 오늘 하루 팀 채팅 메시지 수집
 * - AI 요약 생성 (간단한 통계 기반)
 * - 채팅방에 요약 메시지 자동 발행
 */

import * as functions from "firebase-functions/v2";
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";

const db = getFirestore();
const logger = functions.logger;

/**
 * 일일 채팅 요약 생성 (매일 밤 11:59 실행)
 */
export const dailyChatSummary = functions.scheduler.onSchedule(
  {
    schedule: "59 23 * * *", // 매일 23:59
    timeZone: "Asia/Seoul",
  },
  async (event) => {
    logger.info("🤖 [dailyChatSummary] 일일 요약 생성 시작");

    try {
      // 1️⃣ 오늘 날짜 범위 계산
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

      const todayStartTimestamp = admin.firestore.Timestamp.fromDate(todayStart);
      const todayEndTimestamp = admin.firestore.Timestamp.fromDate(todayEnd);

      const dateString = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

      logger.info("📅 [dailyChatSummary] 오늘 날짜:", {
        dateString,
        start: todayStartTimestamp.toDate(),
        end: todayEndTimestamp.toDate(),
      });

      // 2️⃣ 모든 팀 채팅방 조회
      const chatRoomsQuery = await db
        .collection("chatRooms")
        .where("type", "==", "team")
        .get();

      logger.info("👥 [dailyChatSummary] 팀 채팅방 수:", chatRoomsQuery.size);

      // 3️⃣ 각 팀별로 오늘 메시지 수집 및 요약 생성
      const summaryPromises = chatRoomsQuery.docs.map(async (roomDoc) => {
        const roomId = roomDoc.id;
        const roomData = roomDoc.data();
        const teamId = roomData.teamId;

        if (!teamId) {
          logger.warn("⚠️ [dailyChatSummary] teamId 없음:", { roomId });
          return;
        }

        try {
          // 오늘 메시지 조회
          const messagesQuery = await db
            .collection(`chatRooms/${roomId}/messages`)
            .where("createdAt", ">=", todayStartTimestamp)
            .where("createdAt", "<=", todayEndTimestamp)
            .where("type", "in", ["text", "image", "video"])
            .orderBy("createdAt", "desc")
            .limit(200) // 최근 200개만
            .get();

          const messageCount = messagesQuery.size;

          if (messageCount === 0) {
            logger.info("ℹ️ [dailyChatSummary] 오늘 메시지 없음:", { teamId, roomId });
            return;
          }

          // 메시지 분석
          const messages = messagesQuery.docs.map((doc) => doc.data());
          const senderIds = new Set(messages.map((m) => m.senderId).filter(Boolean));
          const activeMembers = senderIds.size;

          // 주요 키워드 추출 (간단한 통계 기반)
          const allTexts = messages
            .map((m) => m.text || "")
            .filter((t) => t.trim().length > 0)
            .join(" ");

          // 가장 활발한 멤버 찾기
          const memberMessageCount: { [uid: string]: number } = {};
          messages.forEach((m) => {
            if (m.senderId) {
              memberMessageCount[m.senderId] = (memberMessageCount[m.senderId] || 0) + 1;
            }
          });

          const topMemberId = Object.entries(memberMessageCount).sort(
            ([, a], [, b]) => b - a
          )[0]?.[0];

          // 멤버 이름 조회
          let topMemberName = "멤버";
          if (topMemberId) {
            try {
              const userDoc = await db.doc(`users/${topMemberId}`).get();
              if (userDoc.exists) {
                const userData = userDoc.data();
                topMemberName =
                  userData?.displayName || userData?.name || userData?.email?.split("@")[0] || "멤버";
              }
            } catch (error) {
              logger.warn("⚠️ [dailyChatSummary] 멤버 이름 조회 실패:", { topMemberId });
            }
          }

          // 요약 텍스트 생성
          const summaryText = `🤖 오늘의 팀 요약\n\n- 오늘 ${messageCount}개의 메시지\n- 활발한 멤버: ${activeMembers}명\n- 가장 활발한 멤버: ${topMemberName}`;

          // 4️⃣ 요약 메시지 생성
          await db.collection(`chatRooms/${roomId}/messages`).add({
            type: "summary",
            summaryText,
            date: dateString,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            senderId: "system",
            readBy: [],
          });

          // 5️⃣ 채팅방 lastMessage 업데이트
          await db.doc(`chatRooms/${roomId}`).update({
            lastMessage: "🤖 오늘의 팀 요약",
            lastMessageAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          logger.info("✅ [dailyChatSummary] 요약 생성 완료:", {
            teamId,
            roomId,
            messageCount,
            activeMembers,
          });
        } catch (error: any) {
          logger.error("❌ [dailyChatSummary] 팀 요약 생성 실패:", {
            teamId,
            roomId,
            error: error.message,
          });
        }
      });

      await Promise.allSettled(summaryPromises);

      logger.info("✅ [dailyChatSummary] 모든 팀 요약 생성 완료");
    } catch (error: any) {
      logger.error("❌ [dailyChatSummary] 요약 생성 실패:", {
        error: error.message,
        stack: error.stack,
      });
    }
  }
);
