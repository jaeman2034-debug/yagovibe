/**
 * ✅ COMMIT 28: 조직/테넌트 간 운영 벤치마킹
 */

/**
 * ✅ COMMIT 28: 백분위 계산
 */
export function calcPercentile(value: number, dist: number[]): number {
  if (dist.length === 0) return 50; // 기본값

  const sorted = [...dist].sort((a, b) => a - b);
  const below = sorted.filter((v) => v <= value).length;

  return Math.round((below / sorted.length) * 100);
}

/**
 * ✅ COMMIT 28: 벤치마킹 결과 타입
 */
export type BenchmarkResult = {
  mttrPercentile: number;
  approvalSlaPercentile: number;
  resiliencePercentile: number;
  anomalyFrequencyPercentile: number;
  remediationSuccessPercentile: number;
};

/**
 * ✅ COMMIT 28: 테넌트 벤치마킹 계산
 * (실제 구현은 BigQuery에서 집계된 데이터를 사용)
 */
export function calcBenchmark(input: {
  tenantMttr: number;
  tenantApprovalSla: number;
  tenantResilience: number;
  tenantAnomalyFrequency: number;
  tenantRemediationSuccess: number;
  distribution: {
    mttr: number[];
    approvalSla: number[];
    resilience: number[];
    anomalyFrequency: number[];
    remediationSuccess: number[];
  };
}): BenchmarkResult {
  return {
    mttrPercentile: calcPercentile(input.tenantMttr, input.distribution.mttr),
    approvalSlaPercentile: calcPercentile(input.tenantApprovalSla, input.distribution.approvalSla),
    resiliencePercentile: calcPercentile(input.tenantResilience, input.distribution.resilience),
    anomalyFrequencyPercentile: calcPercentile(
      input.tenantAnomalyFrequency,
      input.distribution.anomalyFrequency
    ),
    remediationSuccessPercentile: calcPercentile(
      input.tenantRemediationSuccess,
      input.distribution.remediationSuccess
    ),
  };
}

