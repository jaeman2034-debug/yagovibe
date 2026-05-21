/**
 * 윤리 시스템 타입 정의
 * 
 * 원칙:
 * - AI가 결정하지 않음
 * - 모든 판단은 설명 가능해야 함
 * - 언제든 되돌릴 수 있어야 함
 */

export type EthicsAction =
  | "create"
  | "update"
  | "delete"
  | "restore"
  | "publish"
  | "rollback"
  | "external_sync";

export type EthicsVerdict = "allow" | "review_required" | "block";

export interface EthicsDecision {
  auditId: string;
  tenantId: string;
  collection: string;
  docId: string;
  action: EthicsAction;

  score: number; // 0~100
  verdict: EthicsVerdict;

  reasons: string[]; // human readable
  signals: Record<string, number | string | boolean>; // explainability payload

  createdAt: any; // serverTimestamp
  createdBy: string; // userId
}

