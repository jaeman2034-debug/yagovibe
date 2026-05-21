/**
 * 공지 통계 훅
 * 
 * 원칙:
 * - 대시보드 KPI 계산
 * - 승인 대기, 만료 예정 등 필터링
 */

import { useState, useEffect } from "react";
import { collection, query, where, getDocs, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Notice } from "@/types/notice";

interface NoticeStats {
  published: number; // 게시중
  pending: number; // 승인 대기
  pinned: number; // 고정
  expiringSoon: number; // 만료 예정 (7일 이내)
  draft: number; // 임시 저장
  scheduled: number; // 예약 게시
  expired: number; // 만료됨
}

interface UseNoticeStatsOptions {
  associationId?: string;
  expiringDays?: number; // 만료 예정일 기준 (기본: 7일)
}

export function useNoticeStats({ associationId, expiringDays = 7 }: UseNoticeStatsOptions = {}) {
  const [stats, setStats] = useState<NoticeStats>({
    published: 0,
    pending: 0,
    pinned: 0,
    expiringSoon: 0,
    draft: 0,
    scheduled: 0,
    expired: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    if (!associationId) {
      setStats({
        published: 0,
        pending: 0,
        pinned: 0,
        expiringSoon: 0,
        draft: 0,
        scheduled: 0,
        expired: 0,
      });
      return;
    }

    const fetchStats = async () => {
      setLoading(true);
      setError(null);

      try {
        const noticesRef = collection(db, "notices");
        const q = query(noticesRef, where("associationId", "==", associationId));
        const snap = await getDocs(q);

        const now = Timestamp.now();
        const expiringThreshold = new Date();
        expiringThreshold.setDate(expiringThreshold.getDate() + expiringDays);
        const expiringThresholdTs = Timestamp.fromDate(expiringThreshold);

        const newStats: NoticeStats = {
          published: 0,
          pending: 0,
          pinned: 0,
          expiringSoon: 0,
          draft: 0,
          scheduled: 0,
          expired: 0,
        };

        snap.docs.forEach((doc) => {
          const data = doc.data() as Notice;
          const notice = { id: doc.id, ...data };

          // 상태별 카운트
          switch (notice.status) {
            case "published":
              newStats.published++;
              break;
            case "pending":
              newStats.pending++;
              break;
            case "draft":
              newStats.draft++;
              break;
            case "scheduled":
              newStats.scheduled++;
              break;
            case "expired":
              newStats.expired++;
              break;
          }

          // 고정 카운트
          if (notice.isPinned) {
            newStats.pinned++;
          }

          // 만료 예정 카운트 (published 상태이고 expiresAt이 7일 이내)
          if (
            notice.status === "published" &&
            notice.expiresAt &&
            notice.expiresAt <= expiringThresholdTs &&
            notice.expiresAt > now
          ) {
            newStats.expiringSoon++;
          }
        });

        setStats(newStats);
      } catch (e) {
        setError(e);
        console.error("[useNoticeStats] fetch error", e);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [associationId, expiringDays]);

  return { stats, loading, error };
}

