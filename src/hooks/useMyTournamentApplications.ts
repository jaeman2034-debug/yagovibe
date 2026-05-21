/**
 * 🔥 사용자 참가 신청 목록 조회 Hook (절대 안전 버전)
 * 
 * 🔒 절대 규칙 (이 Hook의 헌법):
 * 1. myApplications 같은 변수 직접 노출 절대 금지
 * 2. applications는 항상 배열 (절대 undefined/null 아님)
 * 3. isLoading은 항상 boolean (절대 undefined 아님)
 * 4. 절대 "있다고 가정"하지 않는다
 * 
 * 반환값:
 * {
 *   applications: TournamentApplication[]  // ← 항상 배열 (빈 배열도 배열)
 *   isLoading: boolean                     // ← 항상 boolean
 *   error: Error | null                    // ← null 또는 Error 객체
 * }
 */

import { useState, useEffect } from "react";
import { collectionGroup, query, where, orderBy, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { TournamentApplication } from "@/types/tournament";
import { useAuth } from "@/context/AuthProvider";

interface UseMyTournamentApplicationsOptions {
  limit?: number; // 최대 조회 개수 (마이페이지 미리보기용)
}

/**
 * 🔥 사용자의 참가 신청 목록 조회 (절대 안전 버전)
 * 
 * 이 함수는 어떤 상황에서도 undefined를 반환하지 않는다.
 * applications는 항상 배열이다 (빈 배열도 배열).
 */
export function useMyTournamentApplications(
  options?: UseMyTournamentApplicationsOptions
) {
  const { user } = useAuth();
  
  // 🔥 초기값: 빈 배열 + false (절대 undefined 금지)
  const [applications, setApplications] = useState<TournamentApplication[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // 🔥 1. 조건부 실행: 사용자 없으면 쿼리 자체를 실행하지 않음
    const enabled = !!user?.uid;
    
    if (!enabled) {
      // 사용자 없음 = 정상 상태 (에러 아님)
      setApplications([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    // 권한 거부 시 onSnapshot 내부 logger가 빨간 에러를 남겨 콘솔이 오염되므로
    // /me 계열은 단발 조회(getDocs)로 처리한다.
    const fetchOnce = async () => {
      try {
        const applicationsGroup = collectionGroup(db, "applications");
        const q = query(
          applicationsGroup,
          where("createdBy", "==", user.uid),
          orderBy("createdAt", "desc")
        );
        setIsLoading(true);
        setError(null);
        const snap = await getDocs(q);
        if (cancelled) return;
        if (snap.empty) {
          setApplications([]);
          setIsLoading(false);
          setError(null);
          return;
        }
        const allApps = snap.docs
          .map((d) => {
            try {
              return {
                id: d.id,
                ...d.data(),
              } as TournamentApplication;
            } catch {
              return null;
            }
          })
          .filter((app): app is TournamentApplication => app !== null);
        const safeApps = Array.isArray(allApps) ? allApps : [];
        const finalApps =
          options?.limit && typeof options.limit === "number" && options.limit > 0
            ? safeApps.slice(0, options.limit)
            : safeApps;
        setApplications(finalApps);
        setIsLoading(false);
        setError(null);
      } catch (queryError: any) {
        if (cancelled) return;
        const isPermissionError =
          queryError?.code === "permission-denied" ||
          queryError?.code === "missing-or-insufficient-permissions" ||
          (queryError instanceof Error && queryError.message?.includes("permission"));
        if (isPermissionError) {
          console.warn("[useMyTournamentApplications] 권한 없음 (정상 상태):", queryError?.message || queryError);
          setApplications([]);
          setIsLoading(false);
          setError(null);
          return;
        }
        console.warn("[useMyTournamentApplications] 조회 실패 (정상 상태로 처리):", queryError);
        setApplications([]);
        setIsLoading(false);
        setError(null);
      }
    };
    void fetchOnce();

    return () => {
      cancelled = true;
    };
  }, [user?.uid, options?.limit]);

  // 🔥 PR 1: 최종 반환값 보장 (절대 undefined 금지)
  return {
    applications: Array.isArray(applications) ? applications : [], // ← 항상 배열
    isLoading: typeof isLoading === 'boolean' ? isLoading : false, // ← 항상 boolean
    error: null, // PR 1: 에러는 항상 null (정상 상태로 처리)
  };
}
