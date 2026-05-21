/**
 * 🔥 공지 기반 FAQ Repository
 * FAQ 자동화: 좋은 답변을 지식 자산으로 고정
 */

import {
  doc,
  setDoc,
  collection,
  getDocs,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface NoticeFaq {
  id: string;
  noticeId: string;
  question: string;
  answer: string;
  createdBy: string;
  createdAt: any;
  pinned: boolean;
}

/**
 * FAQ로 고정
 */
export async function pinNoticeFaq(params: {
  associationId: string;
  noticeId: string;
  faqId: string; // messageId와 동일하게 사용
  question: string;
  answer: string;
  adminId: string;
}): Promise<void> {
  const ref = doc(
    db,
    `associations/${params.associationId}/noticeFaqs/${params.faqId}`
  );

  await setDoc(ref, {
    noticeId: params.noticeId,
    question: params.question,
    answer: params.answer,
    createdBy: params.adminId,
    pinned: true,
    createdAt: serverTimestamp(),
  });
}

/**
 * 공지 기준 FAQ 목록 조회
 */
export async function getNoticeFaqs(
  associationId: string,
  noticeId: string
): Promise<NoticeFaq[]> {
  const q = query(
    collection(db, `associations/${associationId}/noticeFaqs`),
    where("noticeId", "==", noticeId),
    where("pinned", "==", true)
  );

  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as NoticeFaq[];
}

/**
 * FAQ와 사용자 질문 유사도 간단 비교 (키워드 기반)
 * 실제 프로덕션에서는 임베딩 검색 사용 권장
 */
export function findSimilarFaqs(
  userQuestion: string,
  faqs: NoticeFaq[],
  threshold: number = 0.3
): NoticeFaq[] {
  const userKeywords = userQuestion
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 1);

  const similar: NoticeFaq[] = [];

  for (const faq of faqs) {
    const faqKeywords = faq.question
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 1);

    // 공통 키워드 수 계산
    const commonKeywords = userKeywords.filter((kw) =>
      faqKeywords.some((fk) => fk.includes(kw) || kw.includes(fk))
    );

    const similarity =
      commonKeywords.length / Math.max(userKeywords.length, faqKeywords.length);

    if (similarity >= threshold) {
      similar.push(faq);
    }
  }

  // 유사도 높은 순으로 정렬
  return similar.sort((a, b) => {
    const aSim =
      userQuestion
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 1)
        .filter((kw) =>
          a.question
            .toLowerCase()
            .split(/\s+/)
            .filter((w) => w.length > 1)
            .some((fk) => fk.includes(kw) || kw.includes(fk))
        ).length /
      Math.max(
        userQuestion.toLowerCase().split(/\s+/).filter((w) => w.length > 1).length,
        a.question.toLowerCase().split(/\s+/).filter((w) => w.length > 1).length
      );

    const bSim =
      userQuestion
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 1)
        .filter((kw) =>
          b.question
            .toLowerCase()
            .split(/\s+/)
            .filter((w) => w.length > 1)
            .some((fk) => fk.includes(kw) || kw.includes(fk))
        ).length /
      Math.max(
        userQuestion.toLowerCase().split(/\s+/).filter((w) => w.length > 1).length,
        b.question.toLowerCase().split(/\s+/).filter((w) => w.length > 1).length
      );

    return bSim - aSim;
  });
}

