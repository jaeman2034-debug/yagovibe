/**
 * 🔥 공지 게시 시 대화 자동 생성
 * Step 2: Cloud Functions 트리거
 */

import * as admin from "firebase-admin";
import { onDocumentWritten } from "firebase-functions/v2/firestore";

const db = admin.firestore();

/**
 * 공지가 PUBLISHED 상태로 변경되면 대화 스레드 자동 생성
 */
export const onNoticePublished = onDocumentWritten(
  {
    document: "associations/{associationId}/notices/{noticeId}",
    region: "asia-northeast3",
  },
  async (event) => {
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();

    if (!after) return; // 삭제된 경우

    const { associationId, noticeId } = event.params;

    // 🔥 조건: status가 "published"이고 isOfficial이 true일 때만
    if (after.status !== "published" || !after.isOfficial) {
      return;
    }

    // 🔥 이미 대화가 생성되어 있는지 확인
    const convoRef = db.doc(
      `associations/${associationId}/noticeConversations/${noticeId}`
    );
    const convoSnap = await convoRef.get();

    if (convoSnap.exists) {
      console.log(`[onNoticePublished] 대화가 이미 존재함: ${noticeId}`);
      return; // 이미 생성됨
    }

    try {
      // 🔥 대화 스레드 생성
      const publishedAt = after.publishedAt || after.publishAt || admin.firestore.FieldValue.serverTimestamp();
      const publishedDate = publishedAt instanceof admin.firestore.Timestamp
        ? publishedAt.toDate()
        : new Date();

      await convoRef.set({
        noticeId,
        noticeTitle: after.title || "제목 없음",
        status: "OPEN",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        lastMessageAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // 🔥 시스템 메시지 자동 생성
      await convoRef.collection("messages").add({
        senderType: "SYSTEM",
        senderId: null,
        content: `본 대화는 아래 공지를 기준으로 생성되었습니다.\n\n공지 제목: ${after.title || "제목 없음"}\n게시일: ${publishedDate.toLocaleDateString("ko-KR", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })}\n\n공지 내용을 기준으로 문의해 주세요.`,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // 🔥 참가비 정책이 있으면 FAQ 자동 생성
      if (after.feePolicy) {
        const fee = after.feePolicy as {
          baseFee: number;
          baseTeamCount: number;
          extraFeePerTeam: number;
        };

        // 이미 생성된 FAQ가 있는지 확인 (중복 생성 방지)
        const existingFaqs = await db
          .collection(`associations/${associationId}/noticeFaqs`)
          .where("noticeId", "==", noticeId)
          .where("createdBy", "==", "SYSTEM")
          .get();

        if (existingFaqs.empty) {
          // FAQ 3개 생성 (고정 ID 사용)
          const faqs = [
            {
              id: `${noticeId}_fee_0`,
              question: "1팀 참가 시 참가비는 얼마인가요?",
              answer: `기본 참가비는 ${fee.baseFee.toLocaleString()}원이며, 1~${fee.baseTeamCount}팀 참가 기준입니다.`,
            },
            {
              id: `${noticeId}_fee_1`,
              question: "3팀 참가 시 참가비는 얼마인가요?",
              answer: `3팀 참가 시 참가비는 ${(fee.baseFee + fee.extraFeePerTeam).toLocaleString()}원입니다. (기본 ${fee.baseFee.toLocaleString()}원 + 추가 1팀 × ${fee.extraFeePerTeam.toLocaleString()}원)`,
            },
            {
              id: `${noticeId}_fee_2`,
              question: "참가 팀 수 기준은 언제 확정되나요?",
              answer: "참가 팀 수 기준은 최종 접수 확정 시점을 기준으로 합니다.",
            },
          ];

          const batch = db.batch();
          const faqsRef = db.collection(
            `associations/${associationId}/noticeFaqs`
          );

          faqs.forEach((f) => {
            const ref = faqsRef.doc(f.id);
            batch.set(ref, {
              noticeId,
              question: f.question,
              answer: f.answer,
              pinned: true,
              createdBy: "SYSTEM",
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          });

          await batch.commit();
          console.log(`[onNoticePublished] 참가비 FAQ 자동 생성 완료: ${noticeId} (3개)`);
        } else {
          console.log(`[onNoticePublished] 참가비 FAQ가 이미 존재함: ${noticeId}`);
        }
      }

      console.log(`[onNoticePublished] 대화 생성 완료: ${noticeId}`);
    } catch (error) {
      console.error(`[onNoticePublished] 오류:`, error);
      throw error;
    }
  }
);
