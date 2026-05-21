/**
 * 시설 목록 조회 훅 (Tournament 패턴 기반)
 * 
 * 원칙:
 * - 서브컬렉션 facilities 사용 (associations/{id}/facilities)
 * - associationId로 필터링 (경로에 포함)
 * - 관리자 모드: draft 포함 조회
 * - 일반 모드: published만 조회
 * - pinned 우선 정렬
 * - 최신순 정렬
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
import type { Facility } from "@/types/facility";

interface UseFacilitiesOptions {
  includeDraft?: boolean; // 관리자 모드: draft 포함
}

export function useFacilities(associationId?: string, opts?: UseFacilitiesOptions) {
  const includeDraft = opts?.includeDraft ?? false;

  const [items, setItems] = useState<Facility[]>([]);
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
      // ✅ 서브컬렉션 사용 (공지 패턴과 동일)
      // associationId는 경로에 포함되어 있으므로 필터 조건에서 제외
      
      // ✅ 기본 쿼리 조건 (pinned 우선 정렬, 없으면 createdAt 기준)
      const baseConstraints = [
        orderBy("isPinned", "desc"),
        orderBy("createdAt", "desc"),
        limit(200),
      ];

      // ✅ 공개 목록: published만, 관리자 모드: draft 포함
      const constraints = includeDraft
        ? baseConstraints
        : [where("adminStatus", "==", "published"), ...baseConstraints];

      const q = query(collection(db, `associations/${associationId}/facilities`), ...constraints);
      const snap = await getDocs(q);

      const allFacilities = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Facility[];

      setItems(allFacilities);
    } catch (e) {
      setError(e);
      console.error("[useFacilities] fetch error", e);
      setItems([]); // 에러 시 빈 배열로 설정
    } finally {
      setLoading(false);
    }
  }, [associationId, includeDraft]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { items, loading, error, refetch: fetch, setItems };
}

