/**
 * ✅ COMMIT 21: Chaos Engineering 정책 타입
 */

export type ChaosType =
  | "firestore_read_fail"
  | "firestore_write_fail"
  | "approval_delay"
  | "ethics_timeout"
  | "plugin_fail";

export type ChaosPolicy = {
  tenantId: string;
  enabled: boolean;
  probability: number; // 0~1
  types: ChaosType[];
  updatedAt: any;
};

