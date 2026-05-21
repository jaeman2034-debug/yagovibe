/**
 * 🔥 공지 질문 통계 집계 트리거
 * Step 4: 질문 유형 통계 (공지 개선·운영 최적화용)
 */

import * as admin from "firebase-admin";
import { onDocumentCreated } from "firebase-functions/v2/firestore";

const db = admin.firestore();

// 카테고리 분류 규칙 (키워드 기반)
const CATEGORY_RULES: Record<string, string[]> = {
  schedule: ["일정", "언제", "기간", "날짜", "시작", "종료", "몇일", "언제까지"],
  fee: ["참가비", "비용", "금액", "돈", "요금", "가격"],
  venue: ["장소", "구장", "어디", "위치", "경기장", "장소는"],
  apply: ["신청", "접수", "방법", "어떻게", "신청서", "등록"],
  eligibility: ["자격", "대상", "조건", "누가", "참가", "출전"],
};

/**
 * 질문 텍스트에서 카테고리 감지
 */
function detectCategory(text: string): string {
  const lowerText = text.toLowerCase();
  
  for (const [category, keywords] of Object.entries(CATEGORY_RULES)) {
    if (keywords.some((keyword) => lowerText.includes(keyword))) {
      return category;
    }
  }
  
  return "other";
}

/**
 * 공지 질문 생성 시 통계 집계
 */
export const onNoticeQuestionCreated = onDocumentCreated(
  {
    document:
      "associations/{aid}/noticeConversations/{noticeId}/messages/{mid}",
    region: "asia-northeast3",
  },
  async (event) => {
    const data = event.data?.data();
    
    // USER 메시지만 집계
    if (!data || data.senderType !== "USER") {
      return;
    }

    const { aid, noticeId } = event.params;
    const text: string = data.content ?? "";

    if (!text.trim()) {
      return;
    }

    const category = detectCategory(text);

    const statsRef = db.doc(`associations/${aid}/noticeStats/${noticeId}`);

    try {
      await db.runTransaction(async (tx) => {
        const snap = await tx.get(statsRef);
        const prev = snap.exists ? (snap.data() as any) : {};

        const prevCategoryCounts = prev.categoryCounts || {};
        const prevCategoryCount = (prevCategoryCounts[category] as number) || 0;

        tx.set(
          statsRef,
          {
            noticeId,
            totalQuestions: (prev.totalQuestions || 0) + 1,
            categoryCounts: {
              schedule: prevCategoryCounts.schedule || 0,
              fee: prevCategoryCounts.fee || 0,
              venue: prevCategoryCounts.venue || 0,
              apply: prevCategoryCounts.apply || 0,
              eligibility: prevCategoryCounts.eligibility || 0,
              other: prevCategoryCounts.other || 0,
              [category]: prevCategoryCount + 1,
            },
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      });
    } catch (error) {
      console.error("[onNoticeQuestionCreated] 통계 집계 오류:", error);
    }
  }
);

