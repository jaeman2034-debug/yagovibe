/**
 * useLatestMonthlyReport Hook
 * 최근 월간 리포트 조회
 */

import { useEffect, useState } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";

export interface LatestMonthlyReport {
  year: number;
  month: number;
  downloadUrl: string;
  filename: string;
  storageKey: string;
}

export interface UseLatestMonthlyReportReturn {
  loading: boolean;
  report: LatestMonthlyReport | null;
  exists: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * 최근 월간 리포트 조회 Hook
 * 
 * @example
 * ```tsx
 * const { loading, report, exists } = useLatestMonthlyReport({
 *   associationId: "assoc-nowon-football",
 *   enabled: true,
 * });
 * ```
 */
export function useLatestMonthlyReport({
  associationId,
  enabled = true,
}: {
  associationId: string;
  enabled?: boolean;
}): UseLatestMonthlyReportReturn {
  const [loading, setLoading] = useState<boolean>(true);
  const [report, setReport] = useState<LatestMonthlyReport | null>(null);
  const [exists, setExists] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = async () => {
    if (!associationId || !enabled) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const getLatestMonthlyReportFn = httpsCallable<
        { associationId: string },
        { exists: boolean; report: LatestMonthlyReport | null }
      >(functions, "getLatestMonthlyReport");

      const result = await getLatestMonthlyReportFn({ associationId });

      if (result.data.exists && result.data.report) {
        setReport(result.data.report);
        setExists(true);
      } else {
        setReport(null);
        setExists(false);
      }
    } catch (err: any) {
      console.error("Error fetching latest monthly report:", err);
      setError(err.message || "리포트 조회 중 오류가 발생했습니다.");
      setReport(null);
      setExists(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [associationId, enabled]);

  return {
    loading,
    report,
    exists,
    error,
    refetch: fetchReport,
  };
}

