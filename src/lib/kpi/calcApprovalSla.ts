/**
 * ✅ COMMIT 23: Approval SLA 계산
 */

export type ApprovalSlaResult = {
  avgHours: number;
  sla24hRate: number; // 24시간 이내 처리율 (%)
  samples: number;
};

/**
 * ✅ COMMIT 23: Approval SLA 계산
 * 
 * @param approvals 배열 of { createdAt, resolvedAt }
 * @returns SLA 결과 (평균 시간, 24h 충족률, 샘플 수)
 */
export function calcApprovalSla(
  approvals: Array<{ createdAt: Date; resolvedAt: Date }>
): ApprovalSlaResult | null {
  if (!approvals.length) return null;

  const hours = approvals.map(
    (a) => (a.resolvedAt.getTime() - a.createdAt.getTime()) / 3600000
  );

  const avg = hours.reduce((a, b) => a + b, 0) / hours.length;
  const within24h = hours.filter((h) => h <= 24).length;

  return {
    avgHours: Number(avg.toFixed(1)),
    sla24hRate: Math.round((within24h / hours.length) * 100),
    samples: hours.length,
  };
}

