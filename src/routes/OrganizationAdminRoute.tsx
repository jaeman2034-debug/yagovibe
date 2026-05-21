/**
 * 🔥 Organization Admin 보호 라우트
 * 
 * 역할:
 * - Organization별 권한 체크
 * - canManageOrganization, canManageEvent, canManageStats 등
 */

import { Navigate, useParams } from "react-router-dom";
import { useAuthUser } from "@/hooks/useAuthUser";
import {
  canManageOrganization,
  canManageEvent,
  canManageStats,
  canView,
} from "@/utils/organizationPermissions";

interface OrganizationAdminRouteProps {
  children: JSX.Element;
  requiredPermission?: "manage" | "event" | "stats" | "view";
}

export function OrganizationAdminRoute({
  children,
  requiredPermission = "view",
}: OrganizationAdminRouteProps) {
  const { orgId } = useParams<{ orgId: string }>();
  const { profile, loading } = useAuthUser();

  if (loading) {
    return null; // 또는 <Loading />
  }

  if (!profile) {
    return <Navigate to="/login" replace />;
  }

  if (!orgId) {
    return <Navigate to="/admin" replace />;
  }

  // 권한 체크
  let hasPermission = false;

  switch (requiredPermission) {
    case "manage":
      hasPermission = canManageOrganization(profile, orgId);
      break;
    case "event":
      hasPermission = canManageEvent(profile, orgId);
      break;
    case "stats":
      hasPermission = canManageStats(profile, orgId);
      break;
    case "view":
      hasPermission = canView(profile, orgId);
      break;
  }

  if (!hasPermission) {
    return <Navigate to="/admin" replace />;
  }

  return children;
}
