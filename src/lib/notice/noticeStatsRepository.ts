/**
 * 🔥 공지 질문 통계 Repository
 * Step 4: 질문 유형 통계 (공지 개선·운영 최적화용)
 */

import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface NoticeStats {
  noticeId: string;
  totalQuestions: number;
  categoryCounts: {
    schedule: number;
    fee: number;
    venue: number;
    apply: number;
    eligibility: number;
    other: number;
  };
  updatedAt: any;
}

/**
 * 공지 질문 통계 조회
 */
export async function getNoticeStats(
  associationId: string,
  noticeId: string
): Promise<NoticeStats | null> {
  const ref = doc(
    db,
    `associations/${associationId}/noticeStats/${noticeId}`
  );
  const snap = await getDoc(ref);
  
  if (!snap.exists()) {
    return null;
  }
  
  return snap.data() as NoticeStats;
}

/**
 * 카테고리 한글 이름 매핑
 */
export const CATEGORY_LABELS: Record<string, string> = {
  schedule: "일정",
  fee: "참가비",
  venue: "장소",
  apply: "신청 방법",
  eligibility: "자격/대상",
  other: "기타",
};

