/**
 * 🔥 AuditLog 타입 정의 (Functions 전용)
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
  | "REPORT_GENERATED"
  | "AI_REPORT_CREATED"
  | "AI_REPORT_COMPLETED"
  | "AI_REPORT_FAILED";

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

