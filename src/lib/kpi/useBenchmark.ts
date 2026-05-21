/**
 * ✅ COMMIT 28: 벤치마킹 데이터 로딩 훅
 * (실제 구현은 BigQuery 집계 데이터를 사용)
 */

import React from "react";

/**
 * ✅ COMMIT 28: 벤치마킹 데이터 (임시 구조)
 * 실제로는 BigQuery에서 집계된 분포 데이터를 사용
 */
export function useBenchmark(tenantId: string) {
  const [benchmark, setBenchmark] = React.useState<{
    mttrPercentile: number | null;
    approvalSlaPercentile: number | null;
    resiliencePercentile: number | null;
    anomalyFrequencyPercentile: number | null;
    remediationSuccessPercentile: number | null;
  } | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!tenantId) {
      setBenchmark(null);
      setLoading(false);
      return;
    }

    // TODO: 실제로는 BigQuery 또는 Functions 엔드포인트에서 벤치마킹 데이터 로드
    // 현재는 임시로 null 반환 (구현 예정)
    (async () => {
      try {
        // const res = await fetchBenchmarkData(tenantId);
        // setBenchmark(res);
        setBenchmark(null); // 임시
      } catch (error) {
        console.error("[useBenchmark] 데이터 로딩 오류:", error);
        setBenchmark(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [tenantId]);

  return { benchmark, loading };
}

