/**
 * 공지 목록 조회 훅 (실서비스 기준)
 * 
 * 원칙:
 * - 루트 notices 컬렉션 사용
 * - associationId로 필터링
 * - 관리자 모드: draft 포함 조회
 * - 일반 모드: published만 조회
 * - pinned 우선 정렬
 * - exposure 조건 필터링 (publishAt ~ endAt)
 */

import { useEffect, useState, useCallback } from "react";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Notice } from "@/types/notice";

interface UseNoticesOptions {
  includeDraft?: boolean; // 관리자 모드: draft 포함
  checkExposure?: boolean; // exposure 조건 확인 (기본: true)
}

export function useNotices(associationId?: string, opts?: UseNoticesOptions) {
  const includeDraft = opts?.includeDraft ?? false;
  const checkExposure = opts?.checkExposure ?? true;

  const [items, setItems] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const fetch = useCallback(async () => {
    if (!associationId) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // ✅ 서브컬렉션 사용 (실제 저장된 경로와 일치)
      // associationId는 경로에 포함되어 있으므로 필터 조건에서 제외
      
      // ✅ 기본 쿼리 조건 (pinned 우선 정렬)
      const baseConstraints = [
        orderBy("isPinned", "desc"),
        orderBy("createdAt", "desc"),
        limit(200),
      ];

      // ✅ 공개 목록: published만, 관리자 모드: draft 포함
      const constraints = includeDraft
        ? baseConstraints
        : [where("status", "==", "published"), ...baseConstraints];

      const q = query(collection(db, `associations/${associationId}/notices`), ...constraints);
      const snap = await getDocs(q);

      const now = new Date();
      const allNotices = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Notice[];

      // ✅ Exposure 조건 필터링 (클라이언트 측)
      // - publishAt <= now (이미 게시됨)
      // - endAt이 없거나 endAt >= now (만료되지 않음)
      const filteredNotices = checkExposure && !includeDraft
        ? allNotices.filter((notice) => {
            // published 상태만 exposure 체크 (draft는 관리자가 보는 것이므로 체크 안 함)
            if (notice.status !== "published") return true;

            const publishAt = notice.publishAt?.toDate?.() || notice.publishAt;
            const endAt = notice.endAt?.toDate?.() || notice.endAt;

            // publishAt이 현재보다 이후면 노출 안 함
            if (publishAt && publishAt instanceof Date && publishAt > now) {
              return false;
            }

            // endAt이 현재보다 이전이면 노출 안 함
            if (endAt && endAt instanceof Date && endAt < now) {
              return false;
            }

            return true;
          })
        : allNotices;

      setItems(filteredNotices);
    } catch (e) {
      setError(e);
      console.error("[useNotices] fetch error", e);
      setItems([]); // 에러 시 빈 배열로 설정
    } finally {
      setLoading(false);
    }
  }, [associationId, includeDraft, checkExposure]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { items, loading, error, refetch: fetch, setItems };
}
