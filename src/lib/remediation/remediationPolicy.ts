/**
 * ✅ COMMIT 24: Auto-Remediation 정책 모델
 */

export type RemediationAction =
  | "rate_limit"
  | "temporary_read_only"
  | "disable_approvals"
  | "pause_plugins";

export type RemediationPolicy = {
  tenantId: string;
  enabled: boolean;
  triggers: {
    anomalyLevel?: ("warning" | "critical")[];
    metrics?: string[]; // 예: ["audit.write.count"]
  };
  actions: RemediationAction[];
  ttlMinutes: number; // 자동 해제 (분)
  updatedAt: any;
};

