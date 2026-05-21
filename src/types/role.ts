/**
 * 권한 모델 타입 정의
 * 
 * Sprint 7: 권한·역할·브랜딩
 */

export type Role = "guest" | "member" | "admin" | "super_admin";

export interface RolePermissions {
  canReadNotices: boolean;
  canViewTournaments: boolean;
  canApplyTournament: boolean;
  canViewFees: boolean;
  canManageAdmin: boolean;
  canManageBranding: boolean;
}

/**
 * 권한 매트릭스
 */
export function getRolePermissions(role: Role): RolePermissions {
  switch (role) {
    case "super_admin":
      return {
        canReadNotices: true,
        canViewTournaments: true,
        canApplyTournament: true,
        canViewFees: true,
        canManageAdmin: true,
        canManageBranding: true,
      };
    case "admin":
      return {
        canReadNotices: true,
        canViewTournaments: true,
        canApplyTournament: true,
        canViewFees: true,
        canManageAdmin: true,
        canManageBranding: true,
      };
    case "member":
      return {
        canReadNotices: true,
        canViewTournaments: true,
        canApplyTournament: true,
        canViewFees: true,
        canManageAdmin: false,
        canManageBranding: false,
      };
    case "guest":
    default:
      return {
        canReadNotices: true,
        canViewTournaments: true,
        canApplyTournament: false,
        canViewFees: false,
        canManageAdmin: false,
        canManageBranding: false,
      };
  }
}

