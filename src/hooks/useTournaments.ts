/**
 * 대회 목록 조회 훅 (공지 패턴 기반)
 * 
 * 원칙:
 * - 서브컬렉션 tournaments 사용 (associations/{id}/tournaments)
 * - associationId로 필터링 (경로에 포함)
 * - 관리자 모드: draft 포함 조회
 * - 일반 모드: published만 조회
 * - pinned 우선 정렬
 * - 최신순 정렬
 */

import { useEffect, useState, useCallback, useRef } from "react";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Tournament } from "@/types/tournament";

interface UseTournamentsOptions {
  includeDraft?: boolean; // 관리자 모드: draft 포함
}

export function useTournaments(associationId?: string, opts?: UseTournamentsOptions) {
  const includeDraft = opts?.includeDraft ?? false;

  const [items, setItems] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true); // 🔥 초기값 true (로딩 시작 상태)
  const [error, setError] = useState<unknown>(null);
  const isFetchingRef = useRef(false); // 🔥 중복 실행 방지 플래그

  const fetch = useCallback(async () => {
    if (!associationId) {
      setItems([]);
      setLoading(false);
      setError(null);
      isFetchingRef.current = false;
      return;
    }

    // 🔥 무한 로딩 방지: 이미 실행 중이면 중복 실행 방지
    if (isFetchingRef.current) {
      console.warn("[useTournaments] 이미 조회 중입니다. 중복 실행을 건너뜁니다.");
      return;
    }

    isFetchingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      // ✅ 서브컬렉션 사용 (공지 패턴과 동일)
      // associationId는 경로에 포함되어 있으므로 필터 조건에서 제외
      
      // ✅ 기본 쿼리 조건 (pinned 우선 정렬, 없으면 dateStart 기준)
      const baseConstraints = [
        orderBy("isPinned", "desc"),
        orderBy("dateStart", "desc"),
        limit(200),
      ];

      // ✅ 공개 목록: published만, 관리자 모드: draft 포함
      const constraints = includeDraft
        ? baseConstraints
        : [where("adminStatus", "==", "published"), ...baseConstraints];

      const q = query(collection(db, `associations/${associationId}/tournaments`), ...constraints);
      const snap = await getDocs(q);

      const allTournaments = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Tournament[];

      setItems(allTournaments);
      setError(null); // 🔥 성공 시 에러 초기화
    } catch (e: any) {
      console.error("[useTournaments] fetch error", e);
      setError(e);
      
      // 🔥 인덱스 에러인 경우 상세 안내
      if (e?.code === "failed-precondition" || e?.message?.includes("index")) {
        const indexUrl = e?.message?.match(/https:\/\/console\.firebase\.google\.com\/[^\s]+/)?.[0];
        if (indexUrl) {
          console.error("❌ [useTournaments] Firestore 인덱스가 필요합니다.");
          console.error("🔗 인덱스 생성 링크:", indexUrl);
          console.error("💡 해결 방법: 위 링크를 클릭하여 인덱스를 생성하세요.");
          // 🔥 에러 객체에 URL 포함 (UI에서 사용)
          (e as any).indexUrl = indexUrl;
        }
      }
      
      // 🔥 권한 에러 처리
      if (e?.code === "permission-denied") {
        console.error("❌ [useTournaments] Firestore 권한이 없습니다.");
        console.error("💡 해결 방법: Firestore 보안 규칙을 확인하세요.");
      }
      
      setItems([]); // 에러 시 빈 배열로 설정
    } finally {
      // 🔥 무한 로딩 방지: finally에서 반드시 로딩 해제
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [associationId, includeDraft]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { items, loading, error, refetch: fetch, setItems };
}

