/**
 * 🔥 공지 종료 시 스냅샷 고정
 * Step 5: 공지 종료 시 대화·FAQ·통계 스냅샷 고정
 */

import * as admin from "firebase-admin";
import { onDocumentUpdated } from "firebase-functions/v2/firestore";

const db = admin.firestore();

/**
 * 공지 종료 시 스냅샷 생성
 */
export const onNoticeClosed = onDocumentUpdated(
  {
    document: "associations/{aid}/notices/{noticeId}",
    region: "asia-northeast3",
  },
  async (event) => {
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();

    if (!before || !after) return;

    // 이미 closed 상태였으면 무시
    if (before.status === "closed") return;

    // closed 상태로 변경되지 않았으면 무시
    if (after.status !== "closed") return;

    const { aid, noticeId } = event.params;

    try {
      // 1️⃣ FAQ 스냅샷
      const faqSnap = await db
        .collection(`associations/${aid}/noticeFaqs`)
        .where("noticeId", "==", noticeId)
        .where("pinned", "==", true)
        .get();

      const faqSnapshot = faqSnap.docs.map((d) => {
        const data = d.data();
        return {
          question: data.question || "",
          answer: data.answer || "",
        };
      });

      // 2️⃣ 통계 스냅샷
      const statsRef = db.doc(`associations/${aid}/noticeStats/${noticeId}`);
      const statsSnap = await statsRef.get();
      const statsSnapshot = statsSnap.exists
        ? (statsSnap.data() as any)
        : {
            totalQuestions: 0,
            categoryCounts: {
              schedule: 0,
              fee: 0,
              venue: 0,
              apply: 0,
              eligibility: 0,
              other: 0,
            },
          };

      // 3️⃣ 공지 스냅샷 저장
      await db.doc(`associations/${aid}/noticeSnapshots/${noticeId}`).set({
        noticeId,
        noticeTitle: after.title || "",
        noticeContent: after.content || "",
        faqSnapshot,
        statsSnapshot: {
          totalQuestions: statsSnapshot.totalQuestions || 0,
          categoryCounts: statsSnapshot.categoryCounts || {
            schedule: 0,
            fee: 0,
            venue: 0,
            apply: 0,
            eligibility: 0,
            other: 0,
          },
        },
        closedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(
        `[onNoticeClosed] 공지 스냅샷 생성 완료: ${noticeId}, FAQ: ${faqSnapshot.length}개`
      );
    } catch (error) {
      console.error("[onNoticeClosed] 스냅샷 생성 오류:", error);
    }
  }
);

