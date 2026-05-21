/**
 * ✅ COMMIT 19: DR (Disaster Recovery) 정책 모델
 */

export type DrMode = "normal" | "read_only" | "write_blocked" | "region_down";

export type DrPolicy = {
  tenantId: string;
  mode: DrMode;
  affectedRegions?: string[]; // ["us-central1"]
  message?: string;
  expiresAt?: any; // ✅ COMMIT 24: Auto-Remediation 만료 시간
  updatedAt: any;
};

