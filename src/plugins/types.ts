/**
 * ✅ COMMIT 18-1: Plugin Types
 * Plugin Hook 시스템 타입 정의
 */

export type PluginContext = {
  tenantId: string;
  userId: string;
  role: "admin" | "editor" | "viewer";
  correlationId?: string;

  collection: string;
  docId?: string | null;
  action: string;

  startedAt?: number; // duration 계산용
  before?: any;
  after?: any;
};

export type EthicsDecision = {
  verdict: "allow" | "review_required" | "block";
  score: number;
  reasons: string[];
};

export type AnomalyPayload = {
  tenantId: string;
  metric: string;
  value: number;
  anomaly?: {
    level: "critical" | "warning";
    kind?: "zero" | "drop" | "z" | "drift";
  };
};

export interface PluginHooks {
  name: string;

  /**
   * 플러그인 활성화 여부 확인
   */
  enabled?: (ctx: PluginContext) => boolean;

  /**
   * 저장 전 Hook
   */
  beforeSave?: (ctx: PluginContext) => Promise<void> | void;

  /**
   * 저장 후 Hook
   */
  afterSave?: (ctx: PluginContext, saved: any) => Promise<void> | void;

  /**
   * Ethics 평가 후 Hook
   */
  afterEvaluateEthics?: (
    ctx: PluginContext,
    decision: EthicsDecision
  ) => Promise<void> | void;

  /**
   * Approval 생성 시 Hook
   */
  onApprovalCreated?: (
    ctx: PluginContext,
    approvalId: string
  ) => Promise<void> | void;

  /**
   * Anomaly 탐지 시 Hook
   */
  onAnomalyDetected?: (
    tenantId: string,
    payload: AnomalyPayload
  ) => Promise<void> | void;
}

