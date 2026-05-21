/**
 * 🔥 공지 스냅샷 Repository
 * 공지 종료 시점 기준 스냅샷 조회
 */

import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface NoticeSnapshot {
  noticeId: string;
  noticeTitle: string;
  noticeContent: string;
  faqSnapshot: Array<{
    question: string;
    answer: string;
  }>;
  statsSnapshot: {
    totalQuestions: number;
    categoryCounts: Record<string, number>;
  } | null;
  closedAt: any; // Timestamp
}

/**
 * 공지 스냅샷 조회
 */
export async function getNoticeSnapshot(
  associationId: string,
  noticeId: string
): Promise<NoticeSnapshot | null> {
  const ref = doc(
    db,
    `associations/${associationId}/noticeSnapshots/${noticeId}`
  );
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    return null;
  }

  return snap.data() as NoticeSnapshot;
}

