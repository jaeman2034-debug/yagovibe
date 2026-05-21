/**
 * Digital Twin: 운영 Impact 예측
 * 
 * 시뮬레이션 결과를 바탕으로 운영 리스크와 승인 병목 예측
 */

export function simulateImpact(input: {
  base: {
    avgApprovalTimeMin: number;
    pendingApprovals: number;
  };
  ethicsResult: {
    review: number;
    block: number;
  };
}) {
  const approvalLoadFactor = input.ethicsResult.review / Math.max(1, input.base.pendingApprovals);

  const predictedApprovalDelay = input.base.avgApprovalTimeMin * (1 + approvalLoadFactor);

  const riskScore = Math.min(
    100,
    input.ethicsResult.block * 2 + input.ethicsResult.review * 1.2 + predictedApprovalDelay
  );

  return {
    predictedApprovalDelayMin: Math.round(predictedApprovalDelay),
    riskScore: Math.round(riskScore),
  };
}

