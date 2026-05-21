/**
 * 정책 변경 이력 타입
 */

import type { EthicsPolicy } from "@/lib/ethics/scoreEngine";

export type PolicyChange = {
  changeId: string;
  tenantId: string;

  before: EthicsPolicy;
  after: EthicsPolicy;

  simulationResult: {
    allow: number;
    review: number;
    block: number;
    riskScore: number;
  };

  createdAt: any; // serverTimestamp
  createdBy: string;

  rollbackFrom?: string; // 이전 changeId
  rolledBackAt?: any; // serverTimestamp
  rolledBackBy?: string;
};

