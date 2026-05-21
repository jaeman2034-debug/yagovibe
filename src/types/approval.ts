/**
 * 승인 요청 타입 정의
 */

export type ApprovalStatus = "pending" | "approved" | "rejected";

export type ApprovalRequest = {
  auditId: string;

  tenantId: string;
  collection: string;
  docId?: string | null; // create면 아직 없을 수 있음
  action: string;

  payload: any; // 저장하려던 after
  before?: any;

  ethicsScore: number;
  ethicsReasons: string[];

  status: ApprovalStatus;

  createdAt: any; // serverTimestamp
  createdBy: string;

  decidedAt?: any;
  decidedBy?: string;
  decisionNote?: string;
};

