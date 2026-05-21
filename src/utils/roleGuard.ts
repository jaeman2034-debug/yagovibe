/**
 * 라우팅 가드 유틸리티
 * 
 * Sprint 7: 권한·역할·브랜딩
 * 
 * 원칙:
 * - 화면/API 이중 잠금
 * - 버튼 자체를 권한별로 렌더링 분기 (숨김, 비활성 ❌)
 */

import { Role, getRolePermissions } from "@/types/role";

/**
 * 권한 체크 (프론트)
 */
export function requireRole(userRole: Role | null, requiredRole: Role): boolean {
  if (!userRole) return false;

  const roleHierarchy: Record<Role, number> = {
    guest: 0,
    member: 1,
    admin: 2,
    super_admin: 3,
  };

  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}

/**
 * 권한 체크 (특정 기능)
 */
export function hasPermission(userRole: Role | null, permission: keyof ReturnType<typeof getRolePermissions>): boolean {
  if (!userRole) return false;
  const permissions = getRolePermissions(userRole);
  return permissions[permission];
}

/**
 * 권한 기반 컴포넌트 래퍼 (예시)
 */
export function withRoleGuard<P extends object>(
  Component: React.ComponentType<P>,
  requiredRole: Role,
  Fallback?: React.ComponentType
) {
  return function GuardedComponent(props: P & { userRole?: Role | null }) {
    const { userRole, ...rest } = props;
    
    if (!requireRole(userRole || null, requiredRole)) {
      if (Fallback) {
        return <Fallback />;
      }
      return null;
    }

    return <Component {...(rest as P)} />;
  };
}

