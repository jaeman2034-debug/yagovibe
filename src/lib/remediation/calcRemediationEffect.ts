/**
 * ✅ COMMIT 26: 완화 효과 계산
 */

export type RemediationEffect = {
  auditReductionRate: number | null; // 감소율 (%)
  anomalyResolved: boolean; // 재발 없음
  approvalBacklogImproved: boolean; // 개선됨
  mttrImproved: boolean; // MTTR 개선 (선택)
};

/**
 * ✅ COMMIT 26: Before/After 비교하여 효과 계산
 */
export function calcRemediationEffect(before: {
  audit?: number;
  anomalies?: number;
  pendingApprovals?: number;
  mttrMinutes?: number;
}, after: {
  audit?: number;
  anomalies?: number;
  pendingApprovals?: number;
  mttrMinutes?: number;
}): RemediationEffect {
  const auditReductionRate =
    before.audit && before.audit > 0
      ? Math.round(((before.audit - (after.audit ?? 0)) / before.audit) * 100)
      : null;

  const anomalyResolved = (before.anomalies ?? 0) > 0 && (after.anomalies ?? 0) === 0;

  const approvalBacklogImproved =
    (after.pendingApprovals ?? 0) < (before.pendingApprovals ?? 0);

  const mttrImproved =
    before.mttrMinutes && after.mttrMinutes
      ? after.mttrMinutes < before.mttrMinutes
      : false;

  return {
    auditReductionRate,
    anomalyResolved,
    approvalBacklogImproved,
    mttrImproved,
  };
}

