/**
 * 운영 사고 재현 모드 타입
 */

export type IncidentSource =
  | "audit"
  | "ethics"
  | "approval"
  | "policy_change"
  | "daily_report";

export type IncidentEvent = {
  id: string; // doc id
  source: IncidentSource;

  tenantId: string;
  timestamp: Date;

  // 공통 식별
  collection?: string;
  docId?: string;

  // 상관관계 키
  auditId?: string; // ethicsDecisionId / approvalId 등으로도 사용
  approvalId?: string;
  policyChangeId?: string;

  // 표시용
  title: string;
  summary?: string;

  // 원본 payload (drawer에서 상세)
  raw: any;
};










