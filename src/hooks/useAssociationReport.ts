/**
 * useAssociationReport Hook
 * 협회 대관 운영 리포트 조회 React Hook
 * 
 * 협회 홈 대시보드 카드용 데이터 조회
 */

import { useEffect, useState, useCallback } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";

/**
 * Hook 파라미터
 */
export interface UseAssociationReportParams {
  associationId: string;
  from: string; // ISO date string: "2026-01-01"
  to: string; // ISO date string: "2026-01-31"
  /** 자동 조회 비활성화 (수동 호출만 사용) */
  enabled?: boolean;
}

/**
 * 협회 리포트 결과 타입
 */
export interface AssociationReportResult {
  associationId: string;
  period: {
    from: string;
    to: string;
  };
  totalBookings: number;
  byTeamType: {
    MEMBER: number;
    NON_MEMBER: number;
    ACADEMY: number;
  };
  byDecision: {
    APPLY: number;
    REQUEST: number;
    WAITLIST: number;
    VIEW_ONLY: number;
  };
  priorityUsage: {
    HIGH: number;
    MEDIUM: number;
    LOW: number;
  };
  byStatus: {
    CONFIRMED: number;
    WAITLIST: number;
    PENDING: number;
  };
  topFacilities: Array<{
    facilityId: string;
    facilityName: string;
    bookingCount: number;
    memberBookingRate: number;
  }>;
  conversionMetrics: {
    nonMemberDenies: number;
    conversionRequests: number;
    conversionSuccessRate: number;
  };
  generatedAt: string;
}

/**
 * Hook 반환 타입
 */
export interface UseAssociationReportReturn {
  /** 로딩 상태 */
  loading: boolean;
  /** 리포트 결과 */
  report: AssociationReportResult | null;
  /** 에러 메시지 */
  error: string | null;
  /** 수동으로 리포트 조회 (enabled: false일 때 사용) */
  refetch: () => Promise<void>;
}

/**
 * 협회 리포트 조회 Hook
 * 
 * @example
 * ```tsx
 * const { loading, report, error } = useAssociationReport({
 *   associationId: "assoc-nowon-football",
 *   from: "2026-01-01",
 *   to: "2026-01-31"
 * });
 * 
 * if (loading) return <Spinner />;
 * if (error) return <Error message={error} />;
 * 
 * return (
 *   <div>
 *     <p>전체 대관: {report?.totalBookings}</p>
 *     <p>우선 배정 사용률: {report?.priorityUsage.HIGH}건</p>
 *   </div>
 * );
 * ```
 */
export function useAssociationReport({
  associationId,
  from,
  to,
  enabled = true,
}: UseAssociationReportParams): UseAssociationReportReturn {
  const [loading, setLoading] = useState<boolean>(true);
  const [report, setReport] = useState<AssociationReportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * 리포트 조회 함수
   */
  const fetchReport = useCallback(async () => {
    // 필수 파라미터 검증
    if (!associationId || !from || !to) {
      setError("필수 파라미터가 누락되었습니다.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const getAssociationReportFn = httpsCallable<
        {
          associationId: string;
          from: string;
          to: string;
        },
        AssociationReportResult
      >(functions, "getAssociationReport");

      const result = await getAssociationReportFn({
        associationId,
        from,
        to,
      });

      setReport(result.data);
    } catch (err: any) {
      const errorMessage =
        err?.message || "리포트 조회 중 오류가 발생했습니다.";
      setError(errorMessage);
      setReport(null);
      console.error("[useAssociationReport] Error:", err);
    } finally {
      setLoading(false);
    }
  }, [associationId, from, to]);

  /**
   * 자동 조회 (enabled: true일 때)
   */
  useEffect(() => {
    if (enabled) {
      fetchReport();
    } else {
      setLoading(false);
    }
  }, [enabled, fetchReport]);

  return {
    loading,
    report,
    error,
    refetch: fetchReport,
  };
}

