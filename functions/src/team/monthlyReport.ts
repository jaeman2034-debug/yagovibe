/**
 * 🔥 월간 자동 리포트 시스템 (매월 1일 00:10 실행)
 * 
 * 역할:
 * - 지난달 팀 활동 통계 집계
 * - 리포트 문서 생성
 * - 채팅방에 리포트 카드 메시지 발행
 * - MVP 배지 자동 부여
 */

import * as functions from "firebase-functions/v2";
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";

const db = getFirestore();
const logger = functions.logger;

/**
 * 월간 리포트 생성 (매월 1일 00:10 실행)
 */
export const monthlyReport = functions.scheduler.onSchedule(
  {
    schedule: "10 0 1 * *", // 매월 1일 00:10
    timeZone: "Asia/Seoul",
  },
  async (event) => {
    logger.info("📊 [monthlyReport] 월간 리포트 생성 시작");

    try {
      // 1️⃣ 지난달 날짜 범위 계산
      const now = new Date();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

      const monthString = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, "0")}`;

      logger.info("📅 [monthlyReport] 지난달:", {
        monthString,
        start: lastMonth,
        end: lastMonthEnd,
      });

      // 2️⃣ 모든 팀 조회
      const teamsQuery = await db.collection("teams").get();

      logger.info("👥 [monthlyReport] 팀 수:", teamsQuery.size);

      // 3️⃣ 각 팀별로 리포트 생성
      const reportPromises = teamsQuery.docs.map(async (teamDoc) => {
        const teamId = teamDoc.id;
        const teamData = teamDoc.data();

        try {
          const roomId = `team_${teamId}`;
          const roomRef = db.doc(`chatRooms/${roomId}`);

          // 채팅방 존재 확인
          const roomSnap = await roomRef.get();
          if (!roomSnap.exists) {
            logger.info("ℹ️ [monthlyReport] 채팅방 없음:", { teamId });
            return;
          }

          // 4️⃣ 지난달 메시지 통계
          const lastMonthStartTimestamp = admin.firestore.Timestamp.fromDate(lastMonth);
          const lastMonthEndTimestamp = admin.firestore.Timestamp.fromDate(lastMonthEnd);

          const messagesQuery = await db
            .collection(`chatRooms/${roomId}/messages`)
            .where("createdAt", ">=", lastMonthStartTimestamp)
            .where("createdAt", "<=", lastMonthEndTimestamp)
            .where("type", "in", ["text", "image", "video"])
            .get();

          const totalMessages = messagesQuery.size;

          // 5️⃣ 멤버 통계
          const membersQuery = await db.collection(`teams/${teamId}/members`).get();
          const activeMembers = membersQuery.docs.filter(
            (doc) => doc.data().status === "active"
          ).length;

          // 6️⃣ 이벤트 통계
          const eventsQuery = await db
            .collection(`teams/${teamId}/events`)
            .where("createdAt", ">=", lastMonthStartTimestamp)
            .where("createdAt", "<=", lastMonthEndTimestamp)
            .get();

          const eventsCreated = eventsQuery.size;

          // 7️⃣ MVP 찾기 (지난달 점수 증가량 기준)
          let topMemberId: string | null = null;
          let topMemberScore = 0;

          for (const memberDoc of membersQuery.docs) {
            const memberData = memberDoc.data();
            const score = memberData.score || 0;

            // 지난달 점수 증가량 계산 (간단히 현재 점수 사용)
            // 실제로는 lastMonthScore 필드를 추가로 저장해야 정확함
            if (score > topMemberScore) {
              topMemberScore = score;
              topMemberId = memberDoc.id;
            }
          }

          // MVP 이름 조회
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
              logger.warn("⚠️ [monthlyReport] MVP 이름 조회 실패:", { topMemberId });
            }
          }

          // 8️⃣ 리포트 문서 생성
          const reportRef = db.collection(`teams/${teamId}/reports`).doc();
          await reportRef.set({
            month: monthString,
            totalMessages,
            activeMembers,
            eventsCreated,
            topMemberId,
            topMemberScore,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          // 9️⃣ MVP 배지 부여
          if (topMemberId) {
            const memberRef = db.doc(`teams/${teamId}/members/${topMemberId}`);
            await memberRef.update({
              badges: admin.firestore.FieldValue.arrayUnion("monthly_mvp"),
            });

            logger.info("🏆 [monthlyReport] MVP 배지 부여:", {
              teamId,
              topMemberId,
              topMemberScore,
            });
          }

          // 🔟 채팅방에 리포트 카드 메시지 발행
          await db.collection(`chatRooms/${roomId}/messages`).add({
            type: "report",
            reportId: reportRef.id,
            month: monthString,
            totalMessages,
            activeMembers,
            eventsCreated,
            topMemberId,
            topMemberName,
            topMemberScore,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            senderId: "system",
            readBy: [],
            text: `📊 ${monthString} 팀 리포트`,
          });

          // 1️⃣1️⃣ 채팅방 lastMessage 업데이트
          await roomRef.update({
            lastMessage: `📊 ${monthString} 팀 리포트`,
            lastMessageAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          logger.info("✅ [monthlyReport] 리포트 생성 완료:", {
            teamId,
            monthString,
            totalMessages,
            activeMembers,
            eventsCreated,
            topMemberId,
          });
        } catch (error: any) {
          logger.error("❌ [monthlyReport] 팀 리포트 생성 실패:", {
            teamId,
            error: error.message,
            stack: error.stack,
          });
        }
      });

      await Promise.allSettled(reportPromises);

      logger.info("✅ [monthlyReport] 모든 팀 리포트 생성 완료");
    } catch (error: any) {
      logger.error("❌ [monthlyReport] 리포트 생성 실패:", {
        error: error.message,
        stack: error.stack,
      });
    }
  }
);
