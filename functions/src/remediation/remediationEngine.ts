/**
 * ✅ COMMIT 24: Remediation Engine (판단 로직)
 */

import type { RemediationPolicy } from "../../../src/lib/remediation/remediationPolicy";

/**
 * ✅ COMMIT 24: Remediation 실행 여부 판단
 */
export function shouldRemediate(input: {
  policy: RemediationPolicy | null;
  anomaly: { level: string; metric?: string };
}): boolean {
  const { policy, anomaly } = input;

  if (!policy?.enabled) return false;

  if (
    policy.triggers.anomalyLevel &&
    policy.triggers.anomalyLevel.length > 0 &&
    !policy.triggers.anomalyLevel.includes(anomaly.level as "warning" | "critical")
  ) {
    return false;
  }

  if (
    policy.triggers.metrics &&
    policy.triggers.metrics.length > 0 &&
    anomaly.metric &&
    !policy.triggers.metrics.includes(anomaly.metric)
  ) {
    return false;
  }

  return true;
}

