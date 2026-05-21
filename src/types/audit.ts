/**
 * 🔥 AuditLogs 타입 정의
 * 
 * 설계 원칙:
 * - append-only (수정/삭제 없음)
 * - 팀 단위 분리
 * - meta는 얕게 (중첩 깊이 ❌)
 * - 사실만 기록 (문장/감정/UI 문구 ❌)
 */

export type AuditAction =
  | "TEAM_CREATED"
  | "TEAM_UPDATED"
  | "MEMBER_ADDED"
  | "MEMBER_REMOVED"
  | "ROLE_CHANGED"
  | "PLAN_CHANGED"
  | "LOGIN"
  | "LOGOUT"
  | "SETTINGS_UPDATED"
  | "FEE_CREATED"
  | "FEE_PAID"
  | "ATTENDANCE_RECORDED"
  | "REPORT_GENERATED";

export type AuditRole = "admin" | "manager" | "member";

export interface AuditLog {
  id: string;
  action: AuditAction;
  actorUid: string;
  actorRole: AuditRole;
  targetUid?: string | null;
  meta?: Record<string, any> | null;
  ip?: string | null;
  userAgent?: string | null;
  createdAt: any; // Firestore Timestamp
}

export interface CreateAuditLogParams {
  teamId: string;
  action: AuditAction;
  actorUid: string;
  actorRole: AuditRole;
  targetUid?: string;
  meta?: Record<string, any>;
  ip?: string;
  userAgent?: string;
}
